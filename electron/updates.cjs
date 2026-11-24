// Automatic updates, published by `bun run release` to GitHub Releases.
//
// Game patches: the launcher downloads depths-game-<v>.pak (the whole game/ folder, ~0.6 MB),
// checks its SHA-256, unpacks it to <userData>/game-versions/<v>/ and serves the game from there.
// The bundled game inside the app is used until a newer patch is installed.
//
// Launcher updates: the installed app downloads the new installer in the background and, when the
// player presses "Restart to update", runs it silently and relaunches. Portable builds can't replace
// themselves, so they link to the download page instead.
//
// Running from source (bun run game) never patches itself; set DOD_UPDATES=1 to test the flow, and
// DOD_UPDATE_URL to point it at another update folder (for example a local test server).
const { app } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawn } = require('node:child_process');
const pkg = require('../package.json');

const isDev = !app.isPackaged;
const enabled = !isDev || process.env.DOD_UPDATES === '1';
const repo = pkg.desktop?.githubRepo;
const BASE = (process.env.DOD_UPDATE_URL || `https://github.com/${repo}/releases/latest/download/`).replace(/\/?$/, '/');
const RELEASES_PAGE = `https://github.com/${repo}/releases/latest`;
const BUNDLED_GAME = path.join(__dirname, '..', 'game');
const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
const launcherVersion = app.getVersion();
const MAX_DOWNLOAD = 300 * 1024 * 1024;
const SAFE_PATH = /^[A-Za-z0-9_.\-]+(\/[A-Za-z0-9_.\-]+)*$/;

const versionsDir = () => path.join(app.getPath('userData'), 'game-versions');
const activeFile = () => path.join(versionsDir(), 'active.json');

// "0.1.10" > "0.1.9"
function compare(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

// ---------------------------------------------------------------- installed game version
let active = { version: launcherVersion, dir: BUNDLED_GAME };
function loadActive() {
  active = { version: launcherVersion, dir: BUNDLED_GAME };
  try {
    const { version } = JSON.parse(fs.readFileSync(activeFile(), 'utf8'));
    const dir = path.join(versionsDir(), version);
    if (compare(version, launcherVersion) > 0 && fs.existsSync(path.join(dir, 'index.html'))) active = { version, dir };
  } catch {
    // No patch installed: use the game bundled with the app.
  }
  return active;
}
const gameRoot = () => active.dir;
const gameVersion = () => active.version;

// ---------------------------------------------------------------- status (sent to the launcher)
const status = {
  enabled,
  releasesPage: RELEASES_PAGE,
  game: { current: launcherVersion, latest: null, state: 'idle', progress: 0, size: 0, notes: '', error: '' },
  launcher: { current: launcherVersion, latest: null, state: 'idle', progress: 0, notes: '', portable: isPortable, error: '' },
};
const listeners = new Set();
const emit = () => {
  status.game.current = active.version;
  for (const fn of listeners) fn(JSON.parse(JSON.stringify(status)));
};
const onChange = (fn) => listeners.add(fn);

// ---------------------------------------------------------------- network helpers
async function fetchManifest(name) {
  const res = await fetch(BASE + name, { signal: AbortSignal.timeout(10000) });
  if (res.status === 404) return null; // nothing published yet
  if (!res.ok) throw new Error(`Update server answered ${res.status}`);
  return res.json();
}
async function download(url, expectedSize, onProgress) {
  const res = await fetch(new URL(url, BASE), { signal: AbortSignal.timeout(10 * 60e3) });
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
  const total = Number(res.headers.get('content-length')) || expectedSize || 0;
  const chunks = [];
  let received = 0;
  for await (const chunk of res.body) {
    received += chunk.length;
    if (received > MAX_DOWNLOAD) throw new Error('Download is unexpectedly large');
    chunks.push(Buffer.from(chunk));
    if (total) onProgress(Math.min(1, received / total));
  }
  return Buffer.concat(chunks);
}
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------- check
let gameManifest = null;
let launcherManifest = null;
let lastCheck = 0;
let checking = null;

function check({ force = false } = {}) {
  if (!enabled) {
    status.game.state = 'disabled';
    status.launcher.state = 'disabled';
    emit();
    return Promise.resolve(status);
  }
  if (checking) return checking;
  if (!force && Date.now() - lastCheck < 10 * 60e3 && status.game.state !== 'error') return Promise.resolve(status);
  lastCheck = Date.now();
  checking = (async () => {
    if (!['downloading', 'installing'].includes(status.game.state)) status.game.state = 'checking';
    status.game.error = '';
    emit();
    try {
      const [game, launcher] = await Promise.all([fetchManifest('game-update.json'), fetchManifest('launcher-update.json')]);
      gameManifest = game;
      launcherManifest = launcher;
    } catch {
      status.game.state = 'error';
      status.game.error = "Couldn't check for updates. You can still play this version.";
      emit();
      return status;
    }

    // Launcher
    const lm = launcherManifest;
    if (lm && compare(lm.version, launcherVersion) > 0) {
      status.launcher.latest = lm.version;
      status.launcher.notes = lm.notes || '';
      if (isPortable) status.launcher.state = 'manual';
      else if (!['downloading', 'ready'].includes(status.launcher.state)) downloadLauncher();
    } else {
      status.launcher.state = 'up-to-date';
    }

    // Game
    const gm = gameManifest;
    if (gm && compare(gm.version, active.version) > 0) {
      status.game.latest = gm.version;
      status.game.notes = gm.notes || '';
      status.game.size = gm.size || 0;
      if (gm.minLauncher && compare(gm.minLauncher, launcherVersion) > 0) {
        status.game.state = 'needs-launcher';
      } else if (status.game.state !== 'downloading') {
        installGame(); // small and safe: start right away
      }
    } else {
      status.game.state = 'up-to-date';
      status.game.latest = active.version;
    }
    emit();
    return status;
  })().finally(() => {
    checking = null;
  });
  return checking;
}

// ---------------------------------------------------------------- game patch
async function installGame() {
  const gm = gameManifest;
  if (!gm) return;
  status.game.state = 'downloading';
  status.game.progress = 0;
  status.game.error = '';
  emit();
  const tmp = path.join(versionsDir(), `${gm.version}.tmp`);
  try {
    let last = 0;
    const buf = await download(gm.url || `depths-game-${gm.version}.pak`, gm.size, (p) => {
      status.game.progress = p;
      if (p - last >= 0.02 || p === 1) {
        last = p;
        emit();
      }
    });
    if (gm.sha256 && sha256(buf) !== gm.sha256) throw new Error('The download was damaged (checksum mismatch).');
    status.game.state = 'installing';
    emit();

    const pak = JSON.parse(zlib.gunzipSync(buf).toString('utf8'));
    if (pak.format !== 1 || pak.version !== gm.version || !pak.files || typeof pak.files !== 'object') {
      throw new Error('The update file is not valid.');
    }
    fs.rmSync(tmp, { recursive: true, force: true });
    for (const [rel, b64] of Object.entries(pak.files)) {
      if (!SAFE_PATH.test(rel) || rel.split('/').includes('..') || typeof b64 !== 'string') {
        throw new Error(`The update contains an unsafe file name: ${rel}`);
      }
      const dest = path.join(tmp, ...rel.split('/'));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
    }
    if (!fs.existsSync(path.join(tmp, 'index.html'))) throw new Error('The update is missing index.html.');

    // Swap in the new version, then remove older downloaded versions.
    const finalDir = path.join(versionsDir(), gm.version);
    fs.rmSync(finalDir, { recursive: true, force: true });
    fs.renameSync(tmp, finalDir);
    fs.writeFileSync(activeFile(), JSON.stringify({ version: gm.version, installedAt: new Date().toISOString() }));
    loadActive();
    for (const entry of fs.readdirSync(versionsDir(), { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== active.version) {
        fs.rmSync(path.join(versionsDir(), entry.name), { recursive: true, force: true });
      }
    }
    status.game.state = 'updated';
    status.game.progress = 1;
  } catch (error) {
    fs.rmSync(tmp, { recursive: true, force: true });
    status.game.state = 'error';
    status.game.error = `Update failed: ${error.message} You can still play this version.`;
  }
  emit();
}

// ---------------------------------------------------------------- launcher update
let installerPath = null;
async function downloadLauncher() {
  const lm = launcherManifest;
  if (!lm?.url) return;
  status.launcher.state = 'downloading';
  status.launcher.progress = 0;
  emit();
  try {
    const dir = path.join(app.getPath('userData'), 'updates');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `Depths-of-Darkness-Setup-${lm.version}.exe`);
    const cached = fs.existsSync(file) ? fs.readFileSync(file) : null;
    if (!cached || (lm.sha256 && sha256(cached) !== lm.sha256)) {
      let last = 0;
      const buf = await download(lm.url, lm.size, (p) => {
        status.launcher.progress = p;
        if (p - last >= 0.02) {
          last = p;
          emit();
        }
      });
      if (lm.sha256 && sha256(buf) !== lm.sha256) throw new Error('The download was damaged (checksum mismatch).');
      fs.writeFileSync(file, buf);
    }
    for (const old of fs.readdirSync(dir)) if (path.join(dir, old) !== file) fs.rmSync(path.join(dir, old), { force: true });
    installerPath = file;
    status.launcher.state = 'ready';
  } catch (error) {
    status.launcher.state = 'error';
    status.launcher.error = error.message;
  }
  emit();
}

// Runs the downloaded installer silently; it closes this app, installs, and starts the new version.
function installLauncher() {
  if (status.launcher.state !== 'ready' || !installerPath) return false;
  spawn(installerPath, ['--updated', '/S', '--force-run'], { detached: true, stdio: 'ignore' }).unref();
  setTimeout(() => app.quit(), 300);
  return true;
}

module.exports = {
  loadActive,
  gameRoot,
  gameVersion,
  check,
  installGame,
  installLauncher,
  onChange,
  getStatus: () => {
    status.game.current = active.version;
    return JSON.parse(JSON.stringify(status));
  },
  releasesPage: RELEASES_PAGE,
};

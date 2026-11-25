// Automatic updates, published by `bun run release` to GitHub Releases.
//
// The game (the Godot export in godot/) ships inside the launcher installer, so one update covers
// both: the installed app downloads the new installer in the background and, when the player presses
// "Restart to update", runs it silently and relaunches. Portable builds can't replace themselves, so
// they link to the download page instead.
//
// `status.game` only reports whether the check worked (the game's version is the launcher's).
//
// Running from source (bun run launcher) never updates itself; set DOD_UPDATES=1 to test the flow, and
// DOD_UPDATE_URL to point it at another update folder (for example a local test server).
const { app } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const pkg = require('../package.json');

const isDev = !app.isPackaged;
const enabledByDefault = !isDev || process.env.DOD_UPDATES === '1';
let enabled = enabledByDefault;
const repo = pkg.desktop?.githubRepo;
const DEFAULT_BASE = (process.env.DOD_UPDATE_URL || `https://github.com/${repo}/releases/latest/download/`).replace(/\/?$/, '/');
// The dev tools can point checks at another update folder for this session (see setBase).
let BASE = DEFAULT_BASE;
const RELEASES_PAGE = `https://github.com/${repo}/releases/latest`;
const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
const launcherVersion = app.getVersion();
const MAX_DOWNLOAD = 300 * 1024 * 1024;
// While the launcher is open it checks again every POLL_MS (and when its window gets focus), so a new
// release shows up without restarting. Checks closer together than MIN_GAP_MS are skipped.
const POLL_MS = Number(process.env.DOD_UPDATE_POLL_MS) || 5 * 60e3;
const MIN_GAP_MS = Math.min(60e3, POLL_MS);

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

// Folders left behind by 2D game patches (before 0.4.0). Removed once at start-up.
function removeOldGamePatches() {
  fs.rmSync(path.join(app.getPath('userData'), 'game-versions'), { recursive: true, force: true });
}

// ---------------------------------------------------------------- status (sent to the launcher)
const status = {
  enabled,
  releasesPage: RELEASES_PAGE,
  game: { current: launcherVersion, latest: null, state: 'idle', error: '' },
  launcher: { current: launcherVersion, latest: null, state: 'idle', progress: 0, notes: '', portable: isPortable, error: '' },
};
const listeners = new Set();
const emit = () => {
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
let launcherManifest = null;
let lastCheck = 0;
let checking = null;
let seenVersions = '';

// `quiet` is for background checks: the launcher keeps showing its current state instead of
// "Checking for updates…" every few minutes.
function check({ force = false, quiet = false } = {}) {
  if (!enabled) {
    status.game.state = 'disabled';
    status.launcher.state = 'disabled';
    emit();
    return Promise.resolve(status);
  }
  if (checking) return checking;
  if (!force && Date.now() - lastCheck < MIN_GAP_MS && status.game.state !== 'error') return Promise.resolve(status);
  lastCheck = Date.now();
  checking = (async () => {
    if (!quiet) {
      status.game.state = 'checking';
      status.game.error = '';
      emit();
    }
    try {
      launcherManifest = await fetchManifest('launcher-update.json');
    } catch {
      // A failed background check keeps what the player already sees; the next poll tries again.
      if (quiet && status.game.state !== 'checking') return status;
      status.game.state = 'error';
      status.game.error = "Couldn't check for updates. You can still play this version.";
      emit();
      return status;
    }
    // A new release brings new patch notes: fetch them again next time they're asked for.
    const versions = String(launcherManifest?.version);
    if (versions !== seenVersions) {
      seenVersions = versions;
      remoteNotes = null;
    }

    // Launcher
    const lm = launcherManifest;
    if (lm && compare(lm.version, launcherVersion) > 0) {
      const newer = status.launcher.latest !== lm.version;
      status.launcher.latest = lm.version;
      status.launcher.notes = lm.notes || '';
      if (isPortable) status.launcher.state = 'manual';
      // While one download runs, downloadLauncher() picks up a newer version itself when it finishes.
      else if (status.launcher.state !== 'downloading' && (newer || status.launcher.state !== 'ready')) downloadLauncher();
    } else {
      status.launcher.state = 'up-to-date';
    }

    status.game.state = 'up-to-date';
    status.game.latest = lm?.version || launcherVersion;
    emit();
    return status;
  })().finally(() => {
    checking = null;
  });
  return checking;
}

// ---------------------------------------------------------------- launcher update
let installerPath = null;
let launcherDownload = null; // version being downloaded
async function downloadLauncher() {
  const lm = launcherManifest;
  if (!lm?.url || launcherDownload === lm.version) return;
  launcherDownload = lm.version;
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
  if (launcherDownload === lm.version) launcherDownload = null;
  // A newer launcher was published while this one downloaded: get that one instead.
  if (launcherManifest && launcherManifest.version !== lm.version) return downloadLauncher();
  emit();
}

// Runs the downloaded installer silently; it closes this app, installs, and starts the new version.
function installLauncher() {
  if (status.launcher.state !== 'ready' || !installerPath) return false;
  spawn(installerPath, ['--updated', '/S', '--force-run'], { detached: true, stdio: 'ignore' }).unref();
  setTimeout(() => app.quit(), 300);
  return true;
}

// ---------------------------------------------------------------- patch notes
// Bundled with the launcher (built from CHANGELOG.md) and uploaded with every release. The newest
// copy wins, so a launcher that is a version behind still shows the newest notes.
const BUNDLED_NOTES = path.join(__dirname, '..', 'launcher', 'patch-notes.json');
const VERSION_RE = /^\d+\.\d+\.\d+$/;

function cleanNotes(raw) {
  if (!raw || raw.format !== 1 || !Array.isArray(raw.versions)) return null;
  const versions = raw.versions
    .filter((v) => v && VERSION_RE.test(v.version) && typeof v.body === 'string')
    .slice(0, 100)
    .map((v) => ({
      version: v.version,
      title: typeof v.title === 'string' && v.title.trim() ? v.title.trim().slice(0, 80) : null,
      date: typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? v.date : null,
      body: v.body.slice(0, 20000),
    }))
    .sort((a, b) => compare(b.version, a.version));
  if (!versions.length) return null;
  return { latest: versions[0].version, generatedAt: String(raw.generatedAt || ''), versions };
}

let remoteNotes = null; // cached until a check finds a new release
async function getPatchNotes() {
  let bundled = null;
  try {
    bundled = cleanNotes(JSON.parse(fs.readFileSync(BUNDLED_NOTES, 'utf8')));
  } catch {
    // Not generated (e.g. started without `bun run game`): rely on the online copy.
  }
  if (!remoteNotes) {
    try {
      const res = await fetch(`${BASE}patch-notes.json`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) remoteNotes = cleanNotes(await res.json());
    } catch {
      // Offline: the bundled notes are shown.
    }
  }
  const pick = [bundled, remoteNotes]
    .filter(Boolean)
    .sort((a, b) => compare(b.latest, a.latest) || b.generatedAt.localeCompare(a.generatedAt))[0];
  if (!pick) return { versions: [], source: 'none' };
  return { versions: pick.versions, latest: pick.latest, source: pick === remoteNotes ? 'online' : 'bundled' };
}

// Dev tools: use another update source until the launcher closes. '' goes back to the default.
// A custom source also turns update checks on when running from source.
function setBase(url) {
  const text = String(url || '').trim();
  if (!text) {
    BASE = DEFAULT_BASE;
    enabled = enabledByDefault;
  } else {
    let parsed;
    try {
      parsed = new URL(text);
    } catch {
      return { error: 'Enter a full address, like http://127.0.0.1:4310/' };
    }
    if (!/^https?:$/.test(parsed.protocol)) return { error: 'Use an http:// or https:// address.' };
    BASE = parsed.href.replace(/\/?$/, '/');
    enabled = true;
  }
  status.enabled = enabled;
  lastCheck = 0;
  remoteNotes = null;
  return { ok: true, base: BASE };
}

module.exports = {
  getPatchNotes,
  setBase,
  getBase: () => BASE,
  defaultBase: DEFAULT_BASE,
  removeOldGamePatches,
  check,
  POLL_MS,
  installLauncher,
  onChange,
  getStatus: () => JSON.parse(JSON.stringify(status)),
  releasesPage: RELEASES_PAGE,
};

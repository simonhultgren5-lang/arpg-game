// Depths of Darkness — desktop app (Electron main process).
//
// Flow: the launcher window opens first (launcher/). The player picks a server, logs in or
// registers, and presses Play. The launcher closes and the game window opens (game/).
// "Play offline" skips the server and uses local saves only.
//
// Both are served over a private app:// scheme (app://launcher/…, app://game/…) so the game
// gets a stable origin for its localStorage saves. Each online account gets its own storage
// partition, so different accounts on one PC never overwrite each other's heroes.
const { app, BrowserWindow, Menu, ipcMain, net, protocol, session, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const servers = require('./servers.cjs');
const { CloudSync } = require('./cloud-sync.cjs');
const updates = require('./updates.cjs');

// app://game is served from the newest installed game patch, or the game bundled with the app.
const ROOTS = {
  get game() {
    return updates.gameRoot();
  },
  launcher: path.join(__dirname, '..', 'launcher'),
};
const SCHEME = 'app';
const isDev = !app.isPackaged;
// `npm run game:offline` (or the --offline flag) skips the launcher while developing.
const skipLauncher = process.argv.includes('--offline');

// Running from source keeps its own saves and logins, so playtesting never touches the installed game.
if (isDev) app.setPath('userData', `${app.getPath('userData')} (dev)`);

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

// ---------------------------------------------------------------- app:// file serving
const servedSessions = new WeakSet();
function serveAppScheme(sess) {
  if (servedSessions.has(sess)) return;
  servedSessions.add(sess);
  sess.protocol.handle(SCHEME, (request) => {
    const { host, pathname } = new URL(request.url);
    const root = ROOTS[host];
    const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    const file = root && path.normalize(path.join(root, relative));
    if (!file || !file.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString()).then((response) => {
      // Never cache: files are local, and after a game patch every file must come from the new version.
      // (Also lets a reload with F5 pick up edits while developing.)
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      return new Response(response.body, { status: response.status, headers });
    });
  });
}

// ---------------------------------------------------------------- shared window behavior
function guardWindow(win, allowedPrefix) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(allowedPrefix)) event.preventDefault();
  });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !isDev) return;
    // Developer shortcuts, only when running from source.
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      win.webContents.toggleDevTools();
      event.preventDefault();
    } else if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      win.webContents.reloadIgnoringCache();
      event.preventDefault();
    }
  });
}

// ---------------------------------------------------------------- launcher window
let launcherWindow = null;

function openLauncher() {
  if (launcherWindow) {
    launcherWindow.focus();
    return;
  }
  serveAppScheme(session.defaultSession);
  launcherWindow = new BrowserWindow({
    title: 'Depths of Darkness — Launcher',
    width: 1080,
    height: 660,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    resizable: true,
    maximizable: false,
    backgroundColor: '#0c0b13',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  guardWindow(launcherWindow, `${SCHEME}://launcher/`);
  launcherWindow.once('ready-to-show', () => launcherWindow.show());
  launcherWindow.on('closed', () => {
    launcherWindow = null;
  });
  launcherWindow.loadURL(`${SCHEME}://launcher/index.html`);
  updates.check(); // at most every 10 minutes unless forced
}

// ---- updates (see electron/updates.cjs)
updates.onChange((status) => launcherWindow?.webContents.send('launcher:update-status', status));
ipcMain.handle('launcher:update-status', () => updates.getStatus());
ipcMain.handle('launcher:check-updates', () => updates.check({ force: true }));
// Retry re-reads the update info too, in case the release was fixed in the meantime.
ipcMain.handle('launcher:retry-game-update', () => updates.check({ force: true }));
ipcMain.handle('launcher:install-launcher-update', () => updates.installLauncher());
ipcMain.on('launcher:open-releases', () => shell.openExternal(updates.releasesPage));

ipcMain.handle('launcher:get-state', () => servers.publicState());
ipcMain.handle('launcher:select-server', (_e, id) => servers.selectServer(id));
ipcMain.handle('launcher:add-server', (_e, input) => servers.addServer(input || {}));
ipcMain.handle('launcher:remove-server', (_e, id) => servers.removeServer(id));
ipcMain.handle('launcher:check-server', (_e, id) => servers.checkServer(id));
ipcMain.handle('launcher:register', (_e, id, user, pass) => servers.authenticate('register', id, user, pass));
ipcMain.handle('launcher:login', (_e, id, user, pass) => servers.authenticate('login', id, user, pass));
ipcMain.handle('launcher:logout', (_e, id) => servers.logout(id));
ipcMain.on('launcher:minimize', () => launcherWindow?.minimize());
ipcMain.on('launcher:close', () => launcherWindow?.close());

ipcMain.handle('launcher:play', async (_e, options = {}) => {
  if (['downloading', 'installing'].includes(updates.getStatus().game.state)) {
    return { error: 'Wait for the update to finish.' };
  }
  if (options.offline) {
    openGame({ mode: 'offline' });
    launcherWindow?.close();
    return { ok: true };
  }
  const server = servers.getServer(options.serverId);
  const login = server && servers.sessionFor(server.id);
  if (!server || !login) return { error: 'Log in first.' };
  let cloudSave = null;
  try {
    const result = await servers.request(server.url, '/api/save', { token: login.token, timeoutMs: 10000 });
    cloudSave = result.save;
  } catch (error) {
    if (error.status === 401) servers.forgetSession(server.id);
    return { error: error.message };
  }
  openGame({
    mode: 'online',
    server: { id: server.id, name: server.name, url: server.url },
    username: login.username,
    token: login.token,
    cloudSave,
  });
  launcherWindow?.close();
  return { ok: true };
});

// ---------------------------------------------------------------- game window
const WINDOW_FILE = () => path.join(app.getPath('userData'), 'window.json');
// The installed game starts fullscreen; running from source starts windowed.
const DEFAULT_WINDOW = { fullscreen: !isDev, width: 1600, height: 900 };
function readWindowSettings() {
  try {
    return { ...DEFAULT_WINDOW, ...JSON.parse(fs.readFileSync(WINDOW_FILE(), 'utf8')) };
  } catch {
    return { ...DEFAULT_WINDOW };
  }
}
function writeWindowSettings(win) {
  try {
    const bounds = win.isFullScreen() || win.isMaximized() ? readWindowSettings() : win.getBounds();
    fs.writeFileSync(WINDOW_FILE(), JSON.stringify({ fullscreen: win.isFullScreen(), width: bounds.width, height: bounds.height }));
  } catch {
    // Not fatal: the next launch uses defaults.
  }
}

let gameWindow = null;
const games = new Map(); // webContents.id -> { boot, cloud }

function partitionFor(serverUrl, username) {
  const key = crypto.createHash('sha256').update(`${serverUrl}|${username.toLowerCase()}`).digest('hex').slice(0, 16);
  return `persist:account-${key}`;
}

function openGame({ mode, server, username, token, cloudSave }) {
  const online = mode === 'online';
  const partition = online ? partitionFor(server.url, username) : undefined; // offline uses the default storage
  serveAppScheme(partition ? session.fromPartition(partition) : session.defaultSession);

  const saved = readWindowSettings();
  const win = new BrowserWindow({
    title: `Depths of Darkness v${updates.gameVersion()}`,
    width: saved.width,
    height: saved.height,
    minWidth: 960,
    minHeight: 600,
    fullscreen: saved.fullscreen,
    backgroundColor: '#0b080a',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      partition,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  gameWindow = win;
  const id = win.webContents.id;
  games.set(id, {
    boot: {
      session: online
        ? { mode: 'online', serverName: server.name, serverUrl: server.url, username }
        : { mode: 'offline' },
      cloudSave: online ? cloudSave : null,
    },
    cloud: online ? new CloudSync({ serverUrl: server.url, token, webContents: win.webContents }) : null,
  });

  guardWindow(win, `${SCHEME}://game/`);
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Enter' && input.alt) {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  const notifyFullscreen = () => win.webContents.send('dod:fullscreen-changed', win.isFullScreen());
  win.on('enter-full-screen', notifyFullscreen);
  win.on('leave-full-screen', notifyFullscreen);
  win.once('ready-to-show', () => win.show());

  // Before the window closes: grab the latest hero and upload it (online), then close for real.
  let readyToClose = false;
  win.on('close', (event) => {
    writeWindowSettings(win);
    const game = games.get(id);
    if (readyToClose || !game?.cloud) return;
    event.preventDefault();
    readyToClose = true;
    win.webContents
      .executeJavaScript('window.dodCloud ? window.dodCloud.snapshot() : null', true)
      .catch(() => null)
      .then((snapshot) => {
        if (snapshot) game.cloud.push(snapshot);
        return game.cloud.flushWithin(5000);
      })
      .finally(() => win.destroy());
  });
  win.on('closed', () => {
    games.get(id)?.cloud?.dispose();
    games.delete(id);
    if (gameWindow === win) gameWindow = null;
  });

  win.loadURL(`${SCHEME}://game/index.html`);
}

const gameFor = (event) => games.get(event.sender.id);
const windowFor = (event) => BrowserWindow.fromWebContents(event.sender);

ipcMain.on('dod:boot', (event) => {
  event.returnValue = gameFor(event)?.boot || { session: { mode: 'offline' }, cloudSave: null };
});
ipcMain.on('dod:cloud-push', (event, snapshot) => gameFor(event)?.cloud?.push(snapshot));
ipcMain.handle('dod:is-fullscreen', (event) => Boolean(windowFor(event)?.isFullScreen()));
ipcMain.handle('dod:set-fullscreen', (event, on) => {
  const win = windowFor(event);
  win?.setFullScreen(Boolean(on));
  return Boolean(win?.isFullScreen());
});
ipcMain.on('dod:back-to-launcher', (event) => {
  openLauncher();
  windowFor(event)?.close();
});
ipcMain.on('dod:quit', () => app.quit());

// ---------------------------------------------------------------- app lifecycle
// Only one copy of the game at a time; a second launch focuses the open window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = gameWindow || launcherWindow;
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    updates.loadActive();
    if (skipLauncher) openGame({ mode: 'offline' });
    else openLauncher();
  });

  app.on('window-all-closed', () => app.quit());
}

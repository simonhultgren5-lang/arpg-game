// Depths of Darkness — desktop app (Electron main process).
//
// Flow: the launcher window opens first (launcher/). The player picks a server, logs in or
// registers, picks or creates one of up to 5 characters, and presses Play. The launcher closes and
// the game window opens (game/) with that character. Offline mode has its own local characters.
//
// Both are served over a private app:// scheme (app://launcher/…, app://game/…) so the game
// gets a stable origin for its localStorage saves. Each character gets its own storage partition
// (see electron/characters.cjs), so heroes on one PC never overwrite each other.
const { app, BrowserWindow, Menu, ipcMain, net, protocol, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const servers = require('./servers.cjs');
const characters = require('./characters.cjs');
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
const ICON = path.join(__dirname, '..', 'launcher', 'assets', 'icon.png');
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
const PROBE_PAGE = '__probe.html';
function serveAppScheme(sess) {
  if (servedSessions.has(sess)) return;
  servedSessions.add(sess);
  sess.protocol.handle(SCHEME, (request) => {
    const { host, pathname } = new URL(request.url);
    const root = ROOTS[host];
    const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    // Blank page on the game's origin, used to read saves made before characters existed.
    if (host === 'game' && relative === PROBE_PAGE) {
      return new Response('<!doctype html><title></title>', { headers: { 'Content-Type': 'text/html' } });
    }
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
    height: 700,
    minWidth: 900,
    minHeight: 640,
    frame: false,
    resizable: true,
    maximizable: false,
    backgroundColor: '#0c0b13',
    icon: ICON,
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
ipcMain.handle('launcher:patch-notes', () => updates.getPatchNotes());

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

// ---- characters (electron/characters.cjs). `scope` is { offline: true } or { serverId }.
// Reads the hero offline play stored before characters existed, from the default session.
function probeLegacyOfflineSave() {
  return new Promise((resolve, reject) => {
    serveAppScheme(session.defaultSession);
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    const done = (fn) => (value) => {
      if (!win.isDestroyed()) win.destroy();
      fn(value);
    };
    win.webContents
      .loadURL(`${SCHEME}://game/${PROBE_PAGE}`)
      .then(() =>
        win.webContents.executeJavaScript(
          "({save:localStorage.getItem('mdjup'),heroClass:localStorage.getItem('dodClass'),started:localStorage.getItem('dodHeroStartedV1')})",
        ),
      )
      .then(done(resolve), done(reject));
  });
}

ipcMain.handle('launcher:characters', async (_e, scope = {}) => {
  if (scope.offline) {
    await characters.adoptLegacyOfflineHero(probeLegacyOfflineSave);
    return characters.offlineList();
  }
  return servers.listCharacters(scope.serverId);
});
ipcMain.handle('launcher:create-character', (_e, scope = {}, input = {}) => {
  const valid = characters.validateNew(input);
  if (valid.error) return { error: valid.error };
  if (scope.offline) return characters.createOffline(valid);
  return servers.createCharacter(scope.serverId, valid);
});
ipcMain.handle('launcher:delete-character', async (_e, scope = {}, id) => {
  if (scope.offline) return characters.deleteOffline(String(id));
  const server = servers.getServer(scope.serverId);
  const login = server && servers.sessionFor(server.id);
  if (!login) return { error: 'Log in first.' };
  const list = await servers.listCharacters(server.id);
  if (list.error) return list;
  const character = list.characters.find((c) => String(c.id) === String(id));
  if (!character) return { error: 'That character no longer exists.' };
  const result = await servers.deleteCharacter(server.id, character.id);
  // Also remove the copy of the hero stored on this PC.
  if (!result.error) await characters.clearGameStorage(characters.onlinePartition(server.url, login.username, character));
  return result;
});

ipcMain.handle('launcher:play', async (_e, options = {}) => {
  if (['downloading', 'installing'].includes(updates.getStatus().game.state)) {
    return { error: 'Wait for the update to finish.' };
  }
  if (options.offline) {
    const character = characters.getOffline(String(options.characterId));
    if (!character) return { error: 'Pick a character first.' };
    openGame({ mode: 'offline', character });
    launcherWindow?.close();
    return { ok: true };
  }
  const server = servers.getServer(options.serverId);
  const login = server && servers.sessionFor(server.id);
  if (!server || !login) return { error: 'Log in first.' };
  let character = null;
  let cloudSave = null;
  try {
    const list = await servers.request(server.url, '/api/characters', { token: login.token, timeoutMs: 10000 });
    character = list.characters.find((c) => String(c.id) === String(options.characterId));
    if (!character) return { error: 'That character no longer exists.' };
    const result = await servers.request(server.url, `/api/characters/${character.id}/save`, {
      token: login.token,
      timeoutMs: 10000,
    });
    cloudSave = result.save;
  } catch (error) {
    if (error.status === 401) servers.forgetSession(server.id);
    return { error: error.status === 404 ? servers.OLD_SERVER : error.message };
  }
  openGame({
    mode: 'online',
    server: { id: server.id, name: server.name, url: server.url },
    username: login.username,
    token: login.token,
    character,
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

// `character` is missing only for `bun run game:offline`, which plays the original offline hero.
function openGame({ mode, server, username, token, character, cloudSave }) {
  const online = mode === 'online';
  const partition = online
    ? characters.onlinePartition(server.url, username, character)
    : character
      ? characters.offlinePartition(character)
      : undefined;
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
    icon: ICON,
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
      character: character ? characters.bootCharacter(character) : null,
      cloudSave: online ? cloudSave : null,
    },
    cloud: online
      ? new CloudSync({
          serverUrl: server.url,
          token,
          webContents: win.webContents,
          savePath: `/api/characters/${character.id}/save`,
        })
      : null,
    offlineCharacterId: !online && character ? character.id : null,
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
  event.returnValue = gameFor(event)?.boot || { session: { mode: 'offline' }, character: null, cloudSave: null };
});
ipcMain.on('dod:cloud-push', (event, snapshot) => {
  const game = gameFor(event);
  if (game?.cloud) game.cloud.push(snapshot);
  else if (game?.offlineCharacterId) characters.updateOfflineMeta(game.offlineCharacterId, snapshot?.meta);
});
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

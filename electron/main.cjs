// Depths of Darkness — desktop app (Electron main process).
//
// Flow: the launcher window opens first (launcher/). The player picks a server, logs in or
// registers, picks or creates one of up to 5 characters, and presses Play. The launcher hides and
// the game starts: the Godot export of godot/ (DepthsOfDarkness.exe), handed the character through a
// boot file (see godot/README.md, "Launcher contract"). When the game exits, the launcher comes back.
// Offline mode has its own characters on this PC.
//
// The launcher page is served over a private app:// scheme (app://launcher/…).
const { app, BrowserWindow, Menu, ipcMain, net, protocol, session, shell } = require('electron');
const fs = require('node:fs');
const { Readable } = require('node:stream');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const servers = require('./servers.cjs');
const characters = require('./characters.cjs');
const updates = require('./updates.cjs');

const LAUNCHER_ROOT = path.join(__dirname, '..', 'launcher');
const SCHEME = 'app';
const ICON = path.join(__dirname, '..', 'launcher', 'assets', 'icon.png');
const isDev = !app.isPackaged;

// Running from source keeps its own logins and offline characters, so testing never touches the installed game.
if (isDev) app.setPath('userData', `${app.getPath('userData')} (dev)`);

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

// ---------------------------------------------------------------- app:// file serving
function serveAppScheme(sess) {
  sess.protocol.handle(SCHEME, (request) => {
    const { host, pathname } = new URL(request.url);
    const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    const file = host === 'launcher' && path.normalize(path.join(LAUNCHER_ROOT, relative));
    if (!file || !file.startsWith(LAUNCHER_ROOT + path.sep)) return new Response('Not found', { status: 404 });
    if (relative === 'assets/act-i.mp4') return serveFilm(file, request.headers.get('Range'));
    return net.fetch(pathToFileURL(file).toString()).then((response) => {
      // Never cache: lets a reload with F5 pick up edits while developing.
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      return new Response(response.body, { status: response.status, headers });
    });
  });
}

// The Act I film needs byte ranges so the video element can seek and loop.
async function serveFilm(file, range) {
  const { size } = await fs.promises.stat(file);
  const headers = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' };
  let start = 0;
  let end = size - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    if (match[1] && match[2]) end = Math.min(end, Number(match[2]));
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }
  headers['Content-Length'] = String(end - start + 1);
  return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), {
    status: range ? 206 : 200, headers,
  });
}

// ---------------------------------------------------------------- launcher window
let launcherWindow = null;

function openLauncher() {
  if (launcherWindow) {
    launcherWindow.show();
    launcherWindow.focus();
    return;
  }
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
  const win = launcherWindow;
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${SCHEME}://launcher/`)) event.preventDefault();
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
  win.once('ready-to-show', () => win.show());
  // Keep looking for new releases while the launcher is open, so players see them without a restart.
  const poll = setInterval(() => updates.check({ quiet: true }), updates.POLL_MS);
  win.on('focus', () => updates.check({ quiet: true }));
  win.on('closed', () => {
    clearInterval(poll);
    launcherWindow = null;
    // Closing the launcher quits, unless it was closed while the game runs (it comes back when the game exits).
    if (!game) app.quit();
  });
  win.loadURL(`${SCHEME}://launcher/index.html`);
  updates.check(); // skipped if the last check was less than a minute ago
}

// ---- updates (see electron/updates.cjs)
updates.onChange((status) => launcherWindow?.webContents.send('launcher:update-status', status));
ipcMain.handle('launcher:update-status', () => updates.getStatus());
ipcMain.handle('launcher:check-updates', () => updates.check({ force: true }));
ipcMain.handle('launcher:install-launcher-update', () => {
  if (game) return false; // the installer would replace the running game
  return updates.installLauncher();
});
ipcMain.handle('launcher:patch-notes', () => updates.getPatchNotes());
ipcMain.on('launcher:open-releases', () => shell.openExternal(updates.releasesPage));

// ---- servers & accounts (electron/servers.cjs)
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
ipcMain.handle('launcher:characters', (_e, scope = {}) => {
  if (scope.offline) {
    characters.refreshOfflineProgress();
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
  // Also remove the game's copy of the hero kept on this PC.
  if (!result.error) characters.deleteGameSave(server.url, character.id);
  return result;
});

// ---------------------------------------------------------------- the game (godot/)
// The Godot export ships in the installer as resources/game/DepthsOfDarkness.exe (see "extraResources"
// in package.json); from source it is godot/build/DepthsOfDarkness.exe (`bun run godot:export`).
const GAME_EXE = app.isPackaged
  ? path.join(process.resourcesPath, 'game', 'DepthsOfDarkness.exe')
  : path.join(__dirname, '..', 'godot', 'build', 'DepthsOfDarkness.exe');
let game = null; // the running game process

ipcMain.handle('launcher:game-status', () => ({ installed: fs.existsSync(GAME_EXE), running: Boolean(game) }));

// Starts the game with a boot file. The token goes in the file rather than on the command line,
// where other programs could read it.
function launchGame(boot) {
  const bootFile = path.join(app.getPath('userData'), 'boot-character.json');
  fs.writeFileSync(bootFile, JSON.stringify(boot), { mode: 0o600 });
  const child = spawn(GAME_EXE, ['--', '--character-json', bootFile], {
    cwd: path.dirname(GAME_EXE),
    stdio: 'ignore',
    windowsHide: false,
  });
  game = child;
  launcherWindow?.hide();
  const finished = () => {
    if (game !== child) return;
    game = null;
    fs.rmSync(bootFile, { force: true });
    characters.refreshOfflineProgress();
    if (launcherWindow) {
      launcherWindow.show();
      launcherWindow.webContents.send('launcher:game-closed');
    } else openLauncher();
  };
  child.once('exit', finished);
  child.once('error', (error) => {
    console.error('Could not start the game:', error);
    finished();
  });
}

ipcMain.handle('launcher:play', async (_e, options = {}) => {
  if (game) return { error: 'The game is already running.' };
  if (!fs.existsSync(GAME_EXE)) {
    return { error: isDev ? 'Export the game first: bun run godot:export' : 'The game is missing. Reinstall Depths of Darkness.' };
  }
  if (options.offline) {
    const character = characters.getOffline(String(options.characterId));
    if (!character) return { error: 'Pick a character first.' };
    launchGame(characters.bootCharacter(character));
    return { ok: true };
  }
  const server = servers.getServer(options.serverId);
  const login = server && servers.sessionFor(server.id);
  if (!server || !login) return { error: 'Log in first.' };
  try {
    // Servers without save merging can't store the game's progress safely.
    const status = await servers.request(server.url, '/api/status', { timeoutMs: 6000 });
    if (!status.features?.includes('save-merge')) {
      return { error: 'This server needs an update before you can play on it. Ask its owner to run game-server/update.sh.' };
    }
    const list = await servers.request(server.url, '/api/characters', { token: login.token, timeoutMs: 10000 });
    const character = list.characters.find((c) => String(c.id) === String(options.characterId));
    if (!character) return { error: 'That character no longer exists.' };
    launchGame({ ...characters.bootCharacter(character), serverUrl: server.url, token: login.token });
    return { ok: true };
  } catch (error) {
    if (error.status === 401) servers.forgetSession(server.id);
    return { error: error.status === 404 ? servers.OLD_SERVER : error.message };
  }
});

// ---------------------------------------------------------------- app lifecycle
// Only one launcher at a time; a second launch brings the open one forward.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (game || !launcherWindow) return;
    if (launcherWindow.isMinimized()) launcherWindow.restore();
    launcherWindow.show();
    launcherWindow.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    serveAppScheme(session.defaultSession);
    updates.removeOldGamePatches();
    openLauncher();
  });

  // The launcher hides (not closes) while the game runs, so this only fires when the player quits.
  app.on('window-all-closed', () => {
    if (!game) app.quit();
  });
}

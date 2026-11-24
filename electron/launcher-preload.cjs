// Bridge for the launcher window (launcher/launcher.js) → Electron main process.
const { contextBridge, ipcRenderer } = require('electron');

const call = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('launcher', {
  getState: call('launcher:get-state'),
  selectServer: call('launcher:select-server'),
  addServer: call('launcher:add-server'),
  removeServer: call('launcher:remove-server'),
  checkServer: call('launcher:check-server'),
  register: call('launcher:register'),
  login: call('launcher:login'),
  logout: call('launcher:logout'),
  play: call('launcher:play'),
  // Characters: scope is { offline: true } or { serverId }
  listCharacters: call('launcher:characters'),
  createCharacter: call('launcher:create-character'),
  deleteCharacter: call('launcher:delete-character'),
  get3dStatus: call('launcher:3d-status'),
  onGameClosed: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('launcher:game-closed', () => callback());
  },
  // Updates (electron/updates.cjs)
  getUpdateStatus: call('launcher:update-status'),
  checkForUpdates: call('launcher:check-updates'),
  retryGameUpdate: call('launcher:retry-game-update'),
  installLauncherUpdate: call('launcher:install-launcher-update'),
  openReleasesPage: () => ipcRenderer.send('launcher:open-releases'),
  getPatchNotes: call('launcher:patch-notes'),
  onUpdateStatus: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('launcher:update-status', (_event, status) => callback(status));
  },
  minimize: () => ipcRenderer.send('launcher:minimize'),
  close: () => ipcRenderer.send('launcher:close'),
});

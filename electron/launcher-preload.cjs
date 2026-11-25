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
  getGameStatus: call('launcher:game-status'),
  // Settings, news, feature flags, crash reports (electron/studio.cjs)
  getSettings: call('launcher:settings'),
  setSettings: call('launcher:set-settings'),
  getNews: call('launcher:news'),
  getFlags: call('launcher:flags'),
  reportError: (report) => ipcRenderer.send('launcher:report-error', report),
  downloadUpdate: call('launcher:download-update'),
  changePassword: call('launcher:change-password'),
  // Dev tools (only answer when running from source or with --dev; see electron/dev-tools.cjs)
  getDevInfo: call('launcher:dev-info'),
  setDevFlags: call('launcher:dev-set-flags'),
  devOpen: call('launcher:dev-open'),
  devSetUpdateUrl: call('launcher:dev-update-url'),
  devClearUpdates: call('launcher:dev-clear-updates'),
  onGameClosed: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('launcher:game-closed', () => callback());
  },
  // Updates (electron/updates.cjs)
  getUpdateStatus: call('launcher:update-status'),
  checkForUpdates: call('launcher:check-updates'),
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

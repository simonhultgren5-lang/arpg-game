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
  minimize: () => ipcRenderer.send('launcher:minimize'),
  close: () => ipcRenderer.send('launcher:close'),
});

// Bridge for the game window → Electron main process, exposed as window.dodDesktop.
// The game checks for this object to show desktop-only options (fullscreen, Quit Game, cloud saves).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dodDesktop', {
  isDesktop: true,
  // Session info and the cloud save to start from. Read once, before the game's own scripts run.
  boot: () => ipcRenderer.sendSync('dod:boot'),
  isFullscreen: () => ipcRenderer.invoke('dod:is-fullscreen'),
  setFullscreen: (on) => ipcRenderer.invoke('dod:set-fullscreen', Boolean(on)),
  onFullscreenChange: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('dod:fullscreen-changed', (_event, on) => callback(Boolean(on)));
  },
  // Cloud saves: the game hands over a snapshot; the main process uploads it (throttled).
  cloudPush: (snapshot) => ipcRenderer.send('dod:cloud-push', snapshot),
  onCloudStatus: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('dod:cloud-status', (_event, status) => callback(status));
  },
  backToLauncher: () => ipcRenderer.send('dod:back-to-launcher'),
  quit: () => ipcRenderer.send('dod:quit'),
});

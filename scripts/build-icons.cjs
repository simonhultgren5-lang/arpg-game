// Renders game/img/emblem.svg into the app icons (run after changing the emblem):
//   npx electron scripts/build-icons.cjs
// Writes launcher/assets/icon.ico (the .exe and installer icon, see "icon" in package.json)
// and launcher/assets/icon.png (window and taskbar icon).
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'game', 'img', 'emblem.svg'), 'utf8');
const SIZE = 512;

// ICO with PNG-encoded images (supported since Windows Vista).
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4); // color planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: SIZE, height: SIZE, show: false, transparent: true, frame: false, useContentSize: true });
  const html = `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${SIZE}px;height:${SIZE}px}</style>${svg}`;
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((r) => setTimeout(r, 300));
  const image = (await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE })).resize({ width: SIZE, height: SIZE, quality: 'best' });
  const at = (size) => image.resize({ width: size, height: size, quality: 'best' }).toPNG();

  fs.writeFileSync(path.join(root, 'launcher', 'assets', 'icon.png'), at(256));
  fs.writeFileSync(path.join(root, 'launcher', 'assets', 'icon.ico'), ico([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, data: at(size) }))));
  console.log('Icons written: launcher/assets/icon.ico, launcher/assets/icon.png');
  app.quit();
});

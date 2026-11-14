// Renderiza build/icono.html a build/icon.png (512×512) con transparencia.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512, height: 512, show: false, frame: false, transparent: true,
    webPreferences: { offscreen: true },
  });
  await win.loadFile(path.join(__dirname, 'icono.html'));
  await new Promise((r) => setTimeout(r, 500));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, 'icon.png'), img.toPNG());
  console.log('icono listo:', img.getSize());
  app.quit();
});

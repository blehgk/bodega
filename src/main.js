'use strict';
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { crearStore } = require('./store');
const { sembrar } = require('./seed');

let store;
const datos = () => path.join(app.getPath('userData'), 'bodega.json');

// Un respaldo por día, se conservan los últimos 7. Sin esto, un archivo roto = ventas perdidas.
function respaldar() {
  const dir = path.join(app.getPath('userData'), 'respaldos');
  fs.mkdirSync(dir, { recursive: true });
  const destino = path.join(dir, `bodega-${new Date().toISOString().slice(0, 10)}.json`);
  if (fs.existsSync(destino)) return;
  store.respaldar(destino);
  fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().slice(0, -7)
    .forEach((f) => fs.rmSync(path.join(dir, f), { force: true }));
}

function crearVentana() {
  const win = new BrowserWindow({
    width: 1320, height: 860, minWidth: 1024, minHeight: 640,
    backgroundColor: '#0d1014',
    title: 'Bodega',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Solo para generar capturas del README: BODEGA_SHOT=/ruta.png BODEGA_TAB=caja
  if (process.env.BODEGA_SHOT) {
    win.webContents.once('did-finish-load', async () => {
      if (process.env.BODEGA_TAB) {
        await win.webContents.executeJavaScript(`document.querySelector('[data-tab="${process.env.BODEGA_TAB}"]').click()`);
      }
      await new Promise((r) => setTimeout(r, 900));
      fs.writeFileSync(process.env.BODEGA_SHOT, (await win.webContents.capturePage()).toPNG());
      app.quit();
    });
  }
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

const mutar = (fn) => (event, ...args) => {
  try {
    fn(...args);
    return { ok: true, data: store.estado() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

app.whenReady().then(() => {
  store = crearStore(datos());
  sembrar(store);
  respaldar();

  ipcMain.handle('estado', () => ({ ok: true, data: store.estado() }));
  ipcMain.handle('producto', mutar((p) => store.producto(p)));
  ipcMain.handle('borrarProducto', mutar((id) => store.borrarProducto(id)));
  ipcMain.handle('vender', mutar((items, medio) => store.vender(items, medio)));
  ipcMain.handle('ajustar', mutar((id, c, m) => store.ajustar(id, c, m)));
  ipcMain.handle('proveedor', mutar((p) => store.proveedor(p)));
  ipcMain.handle('compra', mutar((prov, items) => store.compra(prov, items)));
  ipcMain.handle('resumen', (event, desde, hasta) => {
    try {
      return { ok: true, data: store.resumen(desde, hasta) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  crearVentana();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) crearVentana(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

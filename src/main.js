'use strict';
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { crearStore } = require('./store');
const { sembrar } = require('./seed');
const { htmlTicket } = require('./ticket');

let store;
let ventana;
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
  return win;
}

const mutar = (fn) => (event, ...args) => {
  try {
    fn(...args);
    return { ok: true, data: store.estado() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

// Comprobante en su propia ventana: se imprime con el diálogo del sistema (58/80 mm).
function verTicket(ventaId) {
  const st = store.estado();
  const venta = st.ventas.find((v) => v.id === ventaId);
  if (!venta) return { ok: false, error: 'Venta inexistente' };
  const cliente = st.clientes.find((c) => c.id === venta.clienteId) || null;
  const html = htmlTicket(venta, st.negocio, cliente);
  const win = new BrowserWindow({
    width: 420, height: 760, title: `Comprobante #${venta.id}`,
    backgroundColor: '#ffffff', autoHideMenuBar: true,
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return { ok: true, data: true };
}

app.whenReady().then(() => {
  store = crearStore(datos());
  sembrar(store);
  respaldar();

  ipcMain.handle('estado', () => ({ ok: true, data: store.estado() }));

  ipcMain.handle('negocio', mutar((n) => store.negocio(n)));
  ipcMain.handle('producto', mutar((p) => store.producto(p)));
  ipcMain.handle('borrarProducto', mutar((id) => store.borrarProducto(id)));
  ipcMain.handle('cliente', mutar((c) => store.cliente(c)));
  ipcMain.handle('borrarCliente', mutar((id) => store.borrarCliente(id)));
  ipcMain.handle('vender', mutar((items, medio, opciones) => store.vender(items, medio, opciones)));
  ipcMain.handle('anular', mutar((id, motivo) => store.anular(id, motivo)));
  ipcMain.handle('ajustar', mutar((id, c, m) => store.ajustar(id, c, m)));
  ipcMain.handle('proveedor', mutar((p) => store.proveedor(p)));
  ipcMain.handle('compra', mutar((prov, items) => store.compra(prov, items)));
  ipcMain.handle('esperar', mutar((items, opciones) => store.esperar(items, opciones)));
  ipcMain.handle('borrarEspera', mutar((id) => store.borrarEspera(id)));
  ipcMain.handle('guardarCierre', mutar((fecha, contado) => store.guardarCierre(fecha, contado)));

  ipcMain.handle('recuperarEspera', (event, id) => {
    try {
      const espera = store.recuperarEspera(id);
      return { ok: true, data: store.estado(), espera };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('resumen', (event, desde, hasta) => {
    try {
      return { ok: true, data: store.resumen(desde, hasta) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('cierre', (event, fecha) => {
    try {
      return { ok: true, data: store.cierre(fecha) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('verTicket', (event, ventaId) => verTicket(ventaId));

  ipcMain.handle('exportarCSV', async (event, tipo, desde, hasta) => {
    try {
      const nombre = tipo === 'productos' ? 'productos.csv' : `ventas-${desde}-a-${hasta}.csv`;
      const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
        title: 'Guardar CSV',
        defaultPath: path.join(app.getPath('documents'), nombre),
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });
      if (canceled || !filePath) return { ok: false, cancelado: true };
      fs.writeFileSync(filePath, tipo === 'productos' ? store.csvProductos() : store.csvVentas(desde, hasta));
      return { ok: true, data: filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('respaldarArchivo', async () => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
        title: 'Guardar respaldo',
        defaultPath: path.join(app.getPath('documents'), `bodega-respaldo-${new Date().toISOString().slice(0, 10)}.json`),
        filters: [{ name: 'Respaldo Bodega', extensions: ['json'] }],
      });
      if (canceled || !filePath) return { ok: false, cancelado: true };
      store.respaldar(filePath);
      return { ok: true, data: filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('restaurarArchivo', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(ventana, {
        title: 'Restaurar respaldo',
        properties: ['openFile'],
        filters: [{ name: 'Respaldo Bodega', extensions: ['json'] }],
      });
      if (canceled || !filePaths.length) return { ok: false, cancelado: true };
      store.restaurar(fs.readFileSync(filePaths[0], 'utf8'));
      return { ok: true, data: store.estado() };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ventana = crearVentana();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) ventana = crearVentana(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

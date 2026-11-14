'use strict';
// Canales IPC. Un solo lugar donde se ve qué puede pedir el renderer y con qué
// validación. Todo lo que muta devuelve el estado completo: el renderer repinta
// desde una única fuente de verdad y no hay caché que se desincronice.

const { ipcMain, app, shell } = require('electron');
const { abrirComprobante } = require('./ventana');
const { exportarCSV, guardarRespaldo, abrirRespaldo, importarCSV } = require('./archivos');
const path = require('node:path');

const ok = (fn) => (event, ...args) => {
  try {
    return { ok: true, data: fn(...args) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

// Para handlers que abren diálogos: son asíncronos y sus errores no los atrapa `ok`.
const okAsync = (fn) => async (event, ...args) => {
  try {
    return { ok: true, data: await fn(...args) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

// Igual que `ok`, pero además devuelve el estado nuevo: evita un round-trip extra.
const mutar = (store, fn) => (event, ...args) => {
  try {
    fn(...args);
    return { ok: true, data: store.estado() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

function registrarIpc(store, obtenerVentana) {
  ipcMain.handle('estado', ok(() => store.estado()));

  ipcMain.handle('negocio', mutar(store, (n) => store.negocio(n)));
  ipcMain.handle('producto', mutar(store, (p) => store.producto(p)));
  ipcMain.handle('borrarProducto', mutar(store, (id) => store.borrarProducto(id)));
  ipcMain.handle('ajustar', mutar(store, (id, c, m) => store.ajustar(id, c, m)));

  ipcMain.handle('cliente', mutar(store, (c) => store.cliente(c)));
  ipcMain.handle('borrarCliente', mutar(store, (id) => store.borrarCliente(id)));

  ipcMain.handle('proveedor', mutar(store, (p) => store.proveedor(p)));
  ipcMain.handle('compra', mutar(store, (prov, items) => store.compra(prov, items)));

  ipcMain.handle('vender', mutar(store, (items, medio, opciones) => store.vender(items, medio, opciones)));
  ipcMain.handle('anular', mutar(store, (id, motivo) => store.anular(id, motivo)));

  ipcMain.handle('esperar', mutar(store, (items, opciones) => store.esperar(items, opciones)));
  ipcMain.handle('borrarEspera', mutar(store, (id) => store.borrarEspera(id)));
  ipcMain.handle('recuperarEspera', (event, id) => {
    try {
      const espera = store.recuperarEspera(id);
      return { ok: true, data: store.estado(), espera };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('resumen', ok((desde, hasta) => store.resumen(desde, hasta)));
  ipcMain.handle('cierre', ok((fecha) => store.cierre(fecha)));
  ipcMain.handle('guardarCierre', mutar(store, (fecha, contado) => store.guardarCierre(fecha, contado)));

  ipcMain.handle('verTicket', ok((ventaId) => abrirComprobante(store, ventaId)));

  ipcMain.handle('exportarCSV', okAsync((tipo, desde, hasta) => exportarCSV(obtenerVentana(), store, tipo, desde, hasta)));
  ipcMain.handle('respaldarArchivo', okAsync(() => guardarRespaldo(obtenerVentana(), store)));
  ipcMain.handle('restaurarArchivo', okAsync(() => abrirRespaldo(obtenerVentana(), store)));
  ipcMain.handle('importarArchivo', okAsync(() => importarCSV(obtenerVentana(), store)));

  ipcMain.handle('reiniciar', mutar(store, () => store.reiniciar()));

  // Para soporte: qué versión corre y dónde están los datos.
  ipcMain.handle('version', ok(() => app.getVersion()));
  ipcMain.handle('abrirCarpetaDatos', okAsync(async () => {
    const carpeta = app.getPath('userData');
    await shell.openPath(carpeta);
    return carpeta;
  }));
  ipcMain.handle('rutaDatos', ok(() => path.join(app.getPath('userData'), 'bodega.json')));

  // La app no se actualiza sola (eso pide firma de código); al menos avisa dónde mirar.
  ipcMain.handle('abrirReleases', okAsync(async () => {
    await shell.openExternal('https://github.com/blehgk/bodega/releases/latest');
    return true;
  }));
}

module.exports = { registrarIpc };

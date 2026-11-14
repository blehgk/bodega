'use strict';
// Diálogos de archivo: exportar CSV, guardar respaldo, restaurar respaldo.
// Viven acá y no en el renderer porque el renderer no toca el sistema de archivos.

const { dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const filtroCSV = [{ name: 'CSV', extensions: ['csv'] }];
const filtroRespaldo = [{ name: 'Respaldo Bodega', extensions: ['json'] }];

async function exportarCSV(ventana, store, tipo, desde, hasta) {
  const nombre = tipo === 'productos' ? 'productos.csv' : `ventas-${desde}-a-${hasta}.csv`;
  const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
    title: 'Guardar CSV',
    defaultPath: path.join(require('electron').app.getPath('documents'), nombre),
    filters: filtroCSV,
  });
  if (canceled || !filePath) return { ok: false, cancelado: true };

  fs.writeFileSync(filePath, tipo === 'productos' ? store.csvProductos() : store.csvVentas(desde, hasta));
  return { ok: true, data: filePath };
}

async function guardarRespaldo(ventana, store) {
  const hoy = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
    title: 'Guardar respaldo',
    defaultPath: path.join(require('electron').app.getPath('documents'), `bodega-respaldo-${hoy}.json`),
    filters: filtroRespaldo,
  });
  if (canceled || !filePath) return { ok: false, cancelado: true };

  store.respaldar(filePath);
  return { ok: true, data: filePath };
}

async function abrirRespaldo(ventana, store) {
  const { canceled, filePaths } = await dialog.showOpenDialog(ventana, {
    title: 'Restaurar respaldo',
    properties: ['openFile'],
    filters: filtroRespaldo,
  });
  if (canceled || !filePaths.length) return { ok: false, cancelado: true };

  store.restaurar(fs.readFileSync(filePaths[0], 'utf8'));
  return { ok: true, data: store.estado() };
}

module.exports = { exportarCSV, guardarRespaldo, abrirRespaldo };

'use strict';
// Puente mínimo: el renderer no toca Node ni el sistema de archivos.
const { contextBridge, ipcRenderer } = require('electron');

const llamar = (canal, ...args) => ipcRenderer.invoke(canal, ...args);

contextBridge.exposeInMainWorld('api', {
  estado: () => llamar('estado'),
  negocio: (n) => llamar('negocio', n),
  producto: (p) => llamar('producto', p),
  borrarProducto: (id) => llamar('borrarProducto', id),
  cliente: (c) => llamar('cliente', c),
  borrarCliente: (id) => llamar('borrarCliente', id),
  vender: (items, medio, opciones) => llamar('vender', items, medio, opciones),
  anular: (id, motivo) => llamar('anular', id, motivo),
  ajustar: (id, cantidad, motivo) => llamar('ajustar', id, cantidad, motivo),
  proveedor: (p) => llamar('proveedor', p),
  compra: (proveedorId, items) => llamar('compra', proveedorId, items),
  esperar: (items, opciones) => llamar('esperar', items, opciones),
  recuperarEspera: (id) => llamar('recuperarEspera', id),
  borrarEspera: (id) => llamar('borrarEspera', id),
  resumen: (desde, hasta) => llamar('resumen', desde, hasta),
  cierre: (fecha) => llamar('cierre', fecha),
  guardarCierre: (fecha, contado) => llamar('guardarCierre', fecha, contado),
  verTicket: (ventaId) => llamar('verTicket', ventaId),
  exportarCSV: (tipo, desde, hasta) => llamar('exportarCSV', tipo, desde, hasta),
  respaldarArchivo: () => llamar('respaldarArchivo'),
  restaurarArchivo: () => llamar('restaurarArchivo'),
  importarArchivo: () => llamar('importarArchivo'),
  reiniciar: () => llamar('reiniciar'),
  version: () => llamar('version'),
  rutaDatos: () => llamar('rutaDatos'),
  abrirCarpetaDatos: () => llamar('abrirCarpetaDatos'),
  abrirReleases: () => llamar('abrirReleases'),
});

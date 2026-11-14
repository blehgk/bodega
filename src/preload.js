'use strict';
// Puente mínimo: el renderer no toca Node ni el sistema de archivos.
const { contextBridge, ipcRenderer } = require('electron');

const llamar = (canal, ...args) => ipcRenderer.invoke(canal, ...args);

contextBridge.exposeInMainWorld('api', {
  estado: () => llamar('estado'),
  producto: (p) => llamar('producto', p),
  borrarProducto: (id) => llamar('borrarProducto', id),
  vender: (items, medio) => llamar('vender', items, medio),
  ajustar: (id, cantidad, motivo) => llamar('ajustar', id, cantidad, motivo),
  proveedor: (p) => llamar('proveedor', p),
  compra: (proveedorId, items) => llamar('compra', proveedorId, items),
  resumen: (desde, hasta) => llamar('resumen', desde, hasta),
});

'use strict';
// Punto de entrada del proceso principal: abre los datos, siembra el demo la primera
// vez, registra los canales IPC y muestra la ventana. Nada de lógica de negocio acá.

const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { crearStore } = require('../core/store');
const { sembrar } = require('../core/seed');
const { crearVentana } = require('./ventana');
const { registrarIpc } = require('./ipc');
const { respaldarDiario } = require('./respaldo-diario');

let ventana = null;

app.whenReady().then(() => {
  const carpetaDatos = app.getPath('userData');
  const store = crearStore(path.join(carpetaDatos, 'bodega.json'));

  sembrar(store); // solo hace algo si la base está vacía
  respaldarDiario(store, carpetaDatos);

  // El IPC pide la ventana en el momento (para los diálogos), no una referencia vieja.
  registrarIpc(store, () => ventana);

  ventana = crearVentana();
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) ventana = crearVentana();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

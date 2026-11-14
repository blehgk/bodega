'use strict';
// Punto de entrada del proceso principal: abre los datos, decide qué hacer la primera
// vez, registra los canales IPC y muestra la ventana. Nada de lógica de negocio acá.

const { app, BrowserWindow, dialog, Menu } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { crearStore } = require('../core/store');
const { sembrar } = require('../core/seed');
const { crearVentana } = require('./ventana');
const { registrarIpc } = require('./ipc');
const { respaldarDiario } = require('./respaldo-diario');

let ventana = null;

// Una sola instancia: dos ventanas abiertas sobre el mismo archivo se pisan las
// ventas entre sí (cada una reescribe el archivo entero desde su copia en memoria).
const yaCorre = app.requestSingleInstanceLock();
if (!yaCorre) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!ventana) return;
    if (ventana.isMinimized()) ventana.restore();
    ventana.focus();
  });

  arrancar();
}

// Errores no controlados: quedan en un archivo que el usuario puede mandar por soporte.
function registrarErrores(carpeta) {
  const archivo = path.join(carpeta, 'errores.log');
  const anotar = (tipo, e) => {
    try {
      const linea = `[${new Date().toISOString()}] ${tipo}: ${e && (e.stack || e.message || e)}\n`;
      fs.appendFileSync(archivo, linea);
    } catch {
      // si no se puede escribir el log, no se rompe la app por eso
    }
  };
  process.on('uncaughtException', (e) => anotar('uncaughtException', e));
  process.on('unhandledRejection', (e) => anotar('unhandledRejection', e));
}

// Primera vez: el almacén decide si arranca vacío o con datos de ejemplo.
// Antes el demo entraba siempre y no había forma de sacarlo.
async function primeraVez(archivoDatos) {
  if (fs.existsSync(archivoDatos)) return false;
  // Para capturas y pruebas: BODEGA_DEMO=1 siembra el demo, BODEGA_DEMO=0 arranca vacío.
  if (process.env.BODEGA_DEMO === '1') return true;
  if (process.env.BODEGA_DEMO === '0') return false;

  const { response } = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Empezar vacío', 'Ver con datos de ejemplo', 'Salir'],
    defaultId: 0,
    cancelId: 2,
    title: 'Bodega',
    message: '¿Cómo querés empezar?',
    detail: 'Los datos de ejemplo son 60 productos y ventas inventadas, para probar la app. '
      + 'Si es tu almacén de verdad, elegí "Empezar vacío": después podés cargar tus productos a mano o importarlos desde un CSV.',
  });

  if (response === 2) {
    app.quit();
    return null;
  }
  return response === 1; // true = con demo
}

async function arrancar() {
  await app.whenReady();

  const carpetaDatos = app.getPath('userData');
  const archivoDatos = path.join(carpetaDatos, 'bodega.json');

  registrarErrores(carpetaDatos);
  Menu.setApplicationMenu(null); // sin el menú de Electron (Archivo/Ver/Desarrollador)

  const conDemo = await primeraVez(archivoDatos);
  if (conDemo === null) return;

  const store = crearStore(archivoDatos);
  if (conDemo) sembrar(store);

  respaldarDiario(store, carpetaDatos);

  // El IPC pide la ventana en el momento (para los diálogos), no una referencia vieja.
  registrarIpc(store, () => ventana);

  ventana = crearVentana();
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) ventana = crearVentana();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

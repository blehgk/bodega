'use strict';
// Ventanas de la app: la principal y la vista previa del comprobante.
// Toda ventana corre con contextIsolation, sandbox y sin Node en el renderer.

const { BrowserWindow, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { htmlTicket } = require('../core/ticket');

const SEGURIDAD = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
};

function crearVentana() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0d1014',
    title: 'Bodega',
    autoHideMenuBar: true,
    webPreferences: { ...SEGURIDAD, preload: path.join(__dirname, '..', 'preload.js') },
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Gancho de desarrollo para las capturas del README:
  // BODEGA_SHOT=/ruta.png BODEGA_TAB=caja npx electron .
  if (process.env.BODEGA_SHOT) {
    win.webContents.once('did-finish-load', async () => {
      if (process.env.BODEGA_TAB) {
        await win.webContents.executeJavaScript(`document.querySelector('[data-tab="${process.env.BODEGA_TAB}"]').click()`);
      }
      await new Promise((r) => setTimeout(r, 900));
      fs.writeFileSync(process.env.BODEGA_SHOT, (await win.webContents.capturePage()).toPNG());
      require('electron').app.quit();
    });
  }

  // Nada de ventanas nuevas del renderer: los enlaces salen al navegador del sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

// El comprobante se abre en su propia ventana para imprimir con el diálogo del sistema.
function abrirComprobante(store, ventaId) {
  const estado = store.estado();
  const venta = estado.ventas.find((v) => v.id === ventaId);
  if (!venta) return { ok: false, error: 'Venta inexistente' };

  const cliente = estado.clientes.find((c) => c.id === venta.clienteId) || null;
  const html = htmlTicket(venta, estado.negocio, cliente);

  const win = new BrowserWindow({
    width: 420,
    height: 760,
    title: `Comprobante #${venta.id}`,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: SEGURIDAD,
  });
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return { ok: true, data: true };
}

module.exports = { crearVentana, abrirComprobante };

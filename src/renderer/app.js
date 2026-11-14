'use strict';
// Arranque y enrutado. Este archivo es el único que conoce todas las vistas:
// cada una se registra acá y expone pintar() y montar().

import { $, $$ } from './ui/dom.js';
import { plata, isoLocal } from './ui/formato.js';
import { S, cargar } from './ui/estado.js';
import { aplicarTema, temaActual, montarSelector } from './ui/tema.js';

import * as caja from './vistas/caja.js';
import * as productos from './vistas/productos.js';
import * as stock from './vistas/stock.js';
import * as proveedores from './vistas/proveedores.js';
import * as clientes from './vistas/clientes.js';
import * as reportes from './vistas/reportes.js';
import * as cierre from './vistas/cierre.js';
import * as ajustes from './vistas/ajustes.js';

const VISTAS = { caja, productos, stock, proveedores, clientes, reportes, cierre, ajustes };

/* ---------- pintado global ---------- */

// La cabecera es la banda del almanaque: quién es el almacén, qué día es y cómo va el día.
function pintarCabecera() {
  const ahora = new Date();
  const hoy = isoLocal(ahora);
  const vendido = S.datos.ventas
    .filter((v) => !v.anulada && isoLocal(new Date(v.fecha)) === hoy)
    .reduce((s, v) => s + v.total, 0);
  const faltan = S.datos.productos.filter((p) => p.stock <= p.stockMinimo).length;

  const nombre = S.datos.negocio?.nombre || 'Bodega';
  $('#marca-nombre').textContent = nombre;

  $('#cabecera-fecha').textContent = ahora
    .toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^./, (l) => l.toUpperCase());
  $('#cabecera-vendido').textContent = plata(vendido);
  $('#cabecera-faltan').textContent = String(faltan);
}

export function pintar() {
  pintarCabecera();
  VISTAS[S.tab].pintar();
}

function cambiarTab(nuevo) {
  S.tab = nuevo;
  $$('#tabs button').forEach((b) => b.classList.toggle('activo', b.dataset.tab === nuevo));
  $$('.vista').forEach((v) => v.classList.toggle('activa', v.id === `vista-${nuevo}`));
  pintar();
}

/* ---------- atajos de teclado ---------- */

// El cajero no debería soltar el escáner: las acciones principales tienen tecla.
function atajos(e) {
  if ($('#modal').open) return; // dentro de un diálogo manda el diálogo

  const acciones = {
    F1: () => { cambiarTab('caja'); caja.enfocarBuscador(); },
    F2: () => caja.cobrar(),
    F3: () => caja.dejarEnEspera(),
    F4: () => caja.verEsperas(),
  };

  if (acciones[e.key]) {
    e.preventDefault();
    return acciones[e.key]();
  }

  if (e.key === 'Escape' && S.tab === 'caja') {
    caja.limpiarCarrito();
    caja.enfocarBuscador();
  }
}

/* ---------- arranque ---------- */

S.refrescar = pintar;

Object.values(VISTAS).forEach((vista) => vista.montar?.());

$('#tabs').addEventListener('click', (e) => {
  const boton = e.target.closest('button[data-tab]');
  if (boton) cambiarTab(boton.dataset.tab);
});

document.addEventListener('keydown', atajos);

(async () => {
  aplicarTema(temaActual());
  montarSelector();
  if (await cargar()) {
    pintar();
    caja.enfocarBuscador();
  }
})();

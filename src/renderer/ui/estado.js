'use strict';
// Estado de la interfaz y puente con el proceso principal.
// Una sola fuente de verdad: cada mutación devuelve el estado completo desde el main,
// así el renderer nunca queda con datos viejos.

import { avisar } from './aviso.js';

export const bd = window.api;

export const S = {
  datos: {
    negocio: {},
    productos: [],
    proveedores: [],
    clientes: [],
    ventas: [],
    compras: [],
    movimientos: [],
    esperas: [],
    cierres: [],
  },
  carrito: [],   // [{ productoId, cantidad }]
  tab: 'caja',
  filtro: '',
  filtroProd: '',
  rango: 'semana',
  // Lo define app.js: evita que este módulo dependa de las vistas (y de un ciclo).
  refrescar: () => {},
};

// Ejecuta una acción del main y repinta si salió bien.
export async function mutar(promesa) {
  const r = await promesa;
  if (!r.ok) {
    avisar(r.error, true);
    return false;
  }
  S.datos = r.data;
  S.refrescar();
  return true;
}

export async function cargar() {
  const r = await bd.estado();
  if (!r.ok) {
    avisar(r.error, true);
    return false;
  }
  S.datos = r.data;
  return true;
}

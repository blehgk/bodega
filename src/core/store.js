'use strict';
// Fachada de datos. Junta los módulos de dominio en un solo objeto que usa el proceso
// principal (y los tests). Cada módulo recibe `db` y expone sus métodos con el mismo
// nombre que el canal IPC: si mañana se agrega un dominio, se suma acá y nada más.

const { crearDb } = require('./db');
const { productos } = require('./productos');
const { clientes } = require('./clientes');
const { proveedores } = require('./proveedores');
const { ventas } = require('./ventas');
const { reportes } = require('./reportes');
const { caja } = require('./caja');
const { exportar } = require('./exportar');
const { respaldos } = require('./respaldos');
const { negocio } = require('./negocio');

function crearStore(archivo) {
  const db = crearDb(archivo);

  return {
    // Lectura del estado completo: el renderer pinta desde acá.
    estado: db.estado,

    ...negocio(db),
    ...productos(db),
    ...clientes(db),
    ...proveedores(db),
    ...ventas(db),
    ...reportes(db),
    ...caja(db),
    ...exportar(db),
    ...respaldos(db),
  };
}

module.exports = { crearStore };

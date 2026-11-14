'use strict';
// Fachada de datos. Junta los módulos de dominio en un solo objeto que usa el proceso
// principal (y los tests). Cada módulo recibe `db` y expone sus métodos con el mismo
// nombre que el canal IPC: si mañana se agrega un dominio, se suma acá y nada más.

const fs = require('node:fs');
const { crearDb } = require('./db');
const { estadoVacio } = require('./esquema');
const { productos } = require('./productos');
const { clientes } = require('./clientes');
const { proveedores } = require('./proveedores');
const { ventas } = require('./ventas');
const { reportes } = require('./reportes');
const { caja } = require('./caja');
const { exportar } = require('./exportar');
const { respaldos } = require('./respaldos');
const { negocio } = require('./negocio');
const { importar } = require('./importar');

function crearStore(archivo) {
  const db = crearDb(archivo);

  // El archivo se crea en el primer arranque aunque el almacén no venda nada:
  // si no, la pregunta de "¿cómo querés empezar?" volvería a salir en cada apertura.
  if (!fs.existsSync(archivo)) db.guardar();

  return {
    // Lectura del estado completo: el renderer pinta desde acá.
    estado: db.estado,

    // Empezar de cero: se borra todo menos los datos del negocio y el contador de folios.
    // El contador se conserva para que un folio no se repita nunca.
    reiniciar() {
      const actual = db.estado();
      const vacio = estadoVacio();
      vacio.negocio = actual.negocio;
      vacio.proximoId = actual.proximoId;
      db.reemplazar(vacio);
      return true;
    },

    ...negocio(db),
    ...productos(db),
    ...clientes(db),
    ...proveedores(db),
    ...ventas(db),
    ...reportes(db),
    ...caja(db),
    ...exportar(db),
    ...importar(db),
    ...respaldos(db),
  };
}

module.exports = { crearStore };

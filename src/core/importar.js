'use strict';
// Importación de productos desde un CSV. Todo se valida antes de escribir:
// o entra la fila entera, o se informa por qué no entró.

const { parsear, mapear } = require('./csv');
const { productos } = require('./productos');

function importar(db) {
  return {
    importarCSV(texto) {
      const filas = mapear(parsear(texto));
      if (!filas.length) throw new Error('El archivo no tiene filas con datos');
      return productos(db).importarProductos(filas);
    },
  };
}

module.exports = { importar };

'use strict';
// Respaldo manual y restauración. Restaurar reemplaza todo: por eso valida la forma
// del archivo antes de tocar nada, y el renderer pide confirmación antes de llamar.

const fs = require('node:fs');
const path = require('node:path');

function respaldos(db) {
  return {
    respaldar(destino) {
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, JSON.stringify(db.estado()));
      return destino;
    },

    restaurar(contenido) {
      let datos;
      try {
        datos = JSON.parse(contenido);
      } catch {
        throw new Error('El archivo no es un respaldo válido');
      }
      if (!datos || typeof datos !== 'object' || !Array.isArray(datos.productos)) {
        throw new Error('El archivo no es un respaldo de Bodega');
      }
      db.reemplazar(datos);
      return db.estado();
    },
  };
}

module.exports = { respaldos };

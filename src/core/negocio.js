'use strict';
// Datos del comercio: lo que sale impreso en el comprobante.

const { texto, opcional } = require('./validar');

function negocio(db) {
  return {
    negocio(datos = {}) {
      const actual = db.estado().negocio;
      db.estado().negocio = {
        nombre: texto(datos.nombre || actual.nombre, 'Nombre del negocio', 60),
        rut: opcional(datos.rut, 20),
        direccion: opcional(datos.direccion, 80),
        telefono: opcional(datos.telefono, 30),
        pie: opcional(datos.pie, 120),
      };
      db.guardar();
      return db.estado().negocio;
    },
  };
}

module.exports = { negocio };

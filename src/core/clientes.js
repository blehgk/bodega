'use strict';
// Clientes: nombre y teléfono. Sin cuenta corriente a propósito (eso es otro producto).

const { texto, opcional } = require('./validar');

function clientes(db) {
  return {
    cliente(c = {}) {
      const datos = {
        nombre: texto(c.nombre, 'Nombre del cliente', 60),
        telefono: opcional(c.telefono, 30),
      };
      const existente = c.id ? db.estado().clientes.find((x) => x.id === c.id) : null;
      if (existente) Object.assign(existente, datos);
      else db.estado().clientes.push({ id: db.nuevoId(), ...datos });

      db.guardar();
      return existente || db.estado().clientes[db.estado().clientes.length - 1];
    },

    // Se puede borrar el cliente: sus ventas quedan en el historial.
    borrarCliente(id) {
      const lista = db.estado().clientes;
      const i = lista.findIndex((c) => c.id === id);
      if (i < 0) throw new Error('Cliente inexistente');
      lista.splice(i, 1);
      db.guardar();
      return true;
    },
  };
}

module.exports = { clientes };

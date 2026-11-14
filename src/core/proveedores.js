'use strict';
// Proveedores y compras. Una compra repone stock y actualiza el último costo conocido,
// que es el que se usa para calcular margen en las ventas siguientes.

const { entero, texto, opcional } = require('./validar');

function proveedores(db) {
  return {
    proveedor(p = {}) {
      const datos = { nombre: texto(p.nombre, 'Nombre'), telefono: opcional(p.telefono, 30) };
      const existente = p.id ? db.estado().proveedores.find((x) => x.id === p.id) : null;
      if (existente) Object.assign(existente, datos);
      else db.estado().proveedores.push({ id: db.nuevoId(), ...datos });

      db.guardar();
      return existente || db.estado().proveedores[db.estado().proveedores.length - 1];
    },

    // items: [{ productoId, cantidad, costo }]
    compra(proveedorId, items, fecha = new Date().toISOString()) {
      if (!db.estado().proveedores.some((x) => x.id === proveedorId)) throw new Error('Proveedor inexistente');
      if (!Array.isArray(items) || !items.length) throw new Error('La compra está vacía');

      const detalle = items.map((it) => {
        const p = db.producto(it.productoId);
        const cantidad = entero(it.cantidad, 'Cantidad', { min: 1, max: 99999 });
        const costo = entero(it.costo ?? p.costo, 'Costo');

        p.stock += cantidad;
        p.costo = costo; // último costo conocido
        db.estado().movimientos.push({
          id: db.nuevoId(), fecha, productoId: p.id, tipo: 'compra', cantidad, motivo: 'Compra',
        });
        return { productoId: p.id, nombre: p.nombre, cantidad, costo };
      });

      const compra = {
        id: db.nuevoId(),
        fecha,
        proveedorId,
        items: detalle,
        total: detalle.reduce((s, d) => s + d.costo * d.cantidad, 0),
      };
      db.estado().compras.push(compra);
      db.guardar();
      return compra;
    },
  };
}

module.exports = { proveedores };

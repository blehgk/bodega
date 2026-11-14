'use strict';
// Productos y su stock. El stock solo cambia por venta, anulación, compra o ajuste:
// cada uno deja un movimiento, así siempre se puede reconstruir qué pasó.

const { entero, texto, opcional } = require('./validar');

function productos(db) {
  return {
    producto(p = {}) {
      const datos = {
        nombre: texto(p.nombre, 'Nombre'),
        codigo: opcional(p.codigo, 40),
        categoria: texto(p.categoria || 'General', 'Categoría', 40),
        costo: entero(p.costo, 'Costo'),
        precio: entero(p.precio, 'Precio'),
        stock: entero(p.stock, 'Stock'),
        stockMinimo: entero(p.stockMinimo ?? 0, 'Stock mínimo'),
      };
      if (datos.precio < datos.costo) throw new Error('El precio no puede ser menor al costo');

      const existente = p.id ? db.producto(p.id) : null;
      if (existente) Object.assign(existente, datos);
      else db.estado().productos.push({ id: db.nuevoId(), ...datos });

      db.guardar();
      return existente || db.estado().productos[db.estado().productos.length - 1];
    },

    borrarProducto(id) {
      const lista = db.estado().productos;
      const i = lista.findIndex((p) => p.id === id);
      if (i < 0) throw new Error('Producto inexistente');
      lista.splice(i, 1);
      db.guardar();
      return true;
    },

    // Ajuste manual: positivo entra, negativo sale. Nunca deja stock negativo.
    ajustar(productoId, cantidad, motivo = 'Ajuste manual') {
      const p = db.producto(productoId);
      const c = entero(cantidad, 'Cantidad', { min: -999999, max: 999999 });
      if (c === 0) throw new Error('La cantidad no puede ser 0');
      if (p.stock + c < 0) throw new Error(`Quedarían ${p.stock + c} unidades de ${p.nombre}`);

      p.stock += c;
      db.estado().movimientos.push({
        id: db.nuevoId(),
        fecha: new Date().toISOString(),
        productoId,
        tipo: 'ajuste',
        cantidad: c,
        motivo: texto(motivo, 'Motivo', 80),
      });
      db.guardar();
      return p;
    },
  };
}

module.exports = { productos };

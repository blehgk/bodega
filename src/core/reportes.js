'use strict';
// Reportes: una sola pasada sobre las ventas del rango devuelve todo lo que muestran
// las pantallas de Reportes y de Cierre. Las anuladas se cuentan aparte, nunca suman.

function reportes(db) {
  return {
    // desde/hasta: YYYY-MM-DD local, inclusive.
    resumen(desde, hasta) {
      const ventas = db.estado().ventas.filter((v) => db.enRango(v.fecha, desde, hasta));
      const validas = ventas.filter((v) => !v.anulada);

      const porMedio = {};
      const porProducto = new Map();
      const porDia = {};
      let total = 0;
      let margen = 0;
      let unidades = 0;
      let descuentos = 0;

      for (const v of validas) {
        total += v.total;
        descuentos += v.descuento || 0;
        porMedio[v.medio] = (porMedio[v.medio] || 0) + v.total;

        const f = new Date(v.fecha);
        const dia = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
        porDia[dia] = (porDia[dia] || 0) + v.total;

        for (const it of v.items) {
          unidades += it.cantidad;
          margen += (it.precio - it.costo) * it.cantidad;
          const acc = porProducto.get(it.productoId) || { nombre: it.nombre, cantidad: 0, total: 0 };
          acc.cantidad += it.cantidad;
          acc.total += it.precio * it.cantidad;
          porProducto.set(it.productoId, acc);
        }
      }

      return {
        total,
        margen,
        unidades,
        descuentos,
        tickets: validas.length,
        anuladas: ventas.length - validas.length,
        porMedio,
        porDia,
        top: [...porProducto.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5),
        faltantes: db.estado().productos
          .filter((p) => p.stock <= p.stockMinimo)
          .map((p) => ({ id: p.id, nombre: p.nombre, stock: p.stock })),
      };
    },
  };
}

module.exports = { reportes };

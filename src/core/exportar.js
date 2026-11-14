'use strict';
// Exportación a CSV para Excel (separador ; y BOM, si no Excel rompe los acentos).
// Los montos salen en pesos enteros: el contador no quiere centavos de CLP.

const pesos = (centavos) => Math.round(centavos / 100);

const csv = (filas) => '\uFEFF' + filas
  .map((f) => f.map((v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';'))
  .join('\r\n');

function exportar(db) {
  return {
    csvVentas(desde, hasta) {
      const filas = [['Folio', 'Fecha', 'Hora', 'Medio', 'Cliente', 'Detalle', 'Subtotal', 'Descuento', 'Total', 'Estado']];

      for (const v of db.estado().ventas.filter((x) => db.enRango(x.fecha, desde, hasta))) {
        const f = new Date(v.fecha);
        const cliente = db.estado().clientes.find((c) => c.id === v.clienteId);
        filas.push([
          v.id,
          f.toLocaleDateString('es-CL'),
          f.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          v.medio,
          cliente ? cliente.nombre : 'Consumidor final',
          v.items.map((it) => `${it.cantidad}× ${it.nombre}`).join(' | '),
          pesos(v.subtotal ?? v.total),
          pesos(v.descuento || 0),
          pesos(v.total),
          v.anulada ? 'Anulada' : 'Válida',
        ]);
      }
      return csv(filas);
    },

    csvProductos() {
      const filas = [['Producto', 'Código', 'Categoría', 'Costo', 'Precio', 'Stock', 'Stock mínimo', 'Valor a costo']];
      const ordenados = [...db.estado().productos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CL'));

      for (const p of ordenados) {
        filas.push([p.nombre, p.codigo, p.categoria, pesos(p.costo), pesos(p.precio), p.stock, p.stockMinimo, pesos(p.costo * p.stock)]);
      }
      return csv(filas);
    },
  };
}

module.exports = { exportar };

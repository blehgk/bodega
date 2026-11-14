'use strict';
// Ventas: cobrar, anular, dejar en espera y recuperar.
// Una venta guarda nombre, precio y costo del momento: cambiar precios no reescribe la historia.

const { entero, texto, opcional } = require('./validar');

function ventas(db) {
  // Arma el detalle validando stock. Se usa tanto para cobrar como para calcular totales.
  const detallar = (items) => {
    if (!Array.isArray(items) || !items.length) throw new Error('El carrito está vacío');
    return items.map((it) => {
      const p = db.producto(it.productoId);
      const cantidad = entero(it.cantidad, 'Cantidad', { min: 1, max: 9999 });
      if (p.stock < cantidad) throw new Error(`Sin stock de ${p.nombre} (quedan ${p.stock})`);
      return { productoId: p.id, nombre: p.nombre, cantidad, precio: p.precio, costo: p.costo };
    });
  };

  return {
    // opciones: { fecha, descuento, clienteId }
    vender(items, medio = 'Efectivo', opciones = {}) {
      const { fecha = new Date().toISOString(), descuento = 0, clienteId = null } = opciones;
      const detalle = detallar(items);

      const subtotal = detalle.reduce((s, d) => s + d.precio * d.cantidad, 0);
      const desc = entero(descuento, 'Descuento');
      if (desc > subtotal) throw new Error('El descuento no puede superar el subtotal');
      if (clienteId && !db.estado().clientes.some((c) => c.id === clienteId)) throw new Error('Cliente inexistente');

      const venta = {
        id: db.nuevoId(),
        fecha,
        medio: texto(medio, 'Medio de pago', 20),
        clienteId,
        items: detalle,
        subtotal,
        descuento: desc,
        total: subtotal - desc,
        anulada: false,
      };

      for (const d of detalle) {
        const p = db.producto(d.productoId);
        p.stock -= d.cantidad;
        db.estado().movimientos.push({
          id: db.nuevoId(), fecha: venta.fecha, productoId: p.id, tipo: 'venta', cantidad: -d.cantidad, motivo: `Venta #${venta.id}`,
        });
      }

      db.estado().ventas.push(venta);
      db.guardar();
      return venta;
    },

    // Devuelve la mercadería al stock y marca la venta. No se borra: es historia.
    anular(ventaId, motivo = 'Anulación') {
      const venta = db.estado().ventas.find((v) => v.id === ventaId);
      if (!venta) throw new Error('Venta inexistente');
      if (venta.anulada) throw new Error('Esa venta ya está anulada');

      for (const it of venta.items) {
        const p = db.estado().productos.find((x) => x.id === it.productoId);
        if (!p) continue; // producto borrado: la venta igual queda anulada
        p.stock += it.cantidad;
        db.estado().movimientos.push({
          id: db.nuevoId(), fecha: new Date().toISOString(), productoId: p.id, tipo: 'anulacion', cantidad: it.cantidad, motivo: `${texto(motivo, 'Motivo', 60)} #${venta.id}`,
        });
      }

      venta.anulada = true;
      db.guardar();
      return venta;
    },

    // Carrito guardado: no toca stock, solo espera.
    esperar(items, opciones = {}) {
      if (!Array.isArray(items) || !items.length) throw new Error('No hay nada para dejar en espera');
      const espera = {
        id: db.nuevoId(),
        fecha: new Date().toISOString(),
        items: items.map((it) => ({
          productoId: entero(it.productoId, 'Producto', { min: 1 }),
          cantidad: entero(it.cantidad, 'Cantidad', { min: 1, max: 9999 }),
        })),
        descuento: entero(opciones.descuento ?? 0, 'Descuento'),
        clienteId: opciones.clienteId || null,
        nota: opcional(opciones.nota, 60),
      };
      db.estado().esperas.push(espera);
      db.guardar();
      return espera;
    },

    recuperarEspera(id) {
      const lista = db.estado().esperas;
      const i = lista.findIndex((e) => e.id === id);
      if (i < 0) throw new Error('Esa venta en espera no existe');
      const [espera] = lista.splice(i, 1);
      db.guardar();
      return espera;
    },

    borrarEspera(id) {
      const lista = db.estado().esperas;
      const i = lista.findIndex((e) => e.id === id);
      if (i < 0) throw new Error('Esa venta en espera no existe');
      lista.splice(i, 1);
      db.guardar();
      return true;
    },
  };
}

module.exports = { ventas };

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

      // Dos productos con el mismo código hacen que el escáner agregue siempre el primero.
      if (datos.codigo) {
        const choque = db.estado().productos.find((x) => x.codigo === datos.codigo && x.id !== (existente ? existente.id : -1));
        if (choque) throw new Error(`El código ${datos.codigo} ya es de "${choque.nombre}"`);
      }

      if (existente) Object.assign(existente, datos);
      else db.estado().productos.push({ id: db.nuevoId(), ...datos });

      db.guardar();
      return existente || db.estado().productos[db.estado().productos.length - 1];
    },

    // Alta masiva (importación): valida todo antes de tocar nada y guarda una sola vez.
    // Devuelve cuántos entraron y el detalle de los que no.
    importarProductos(filas) {
      if (!Array.isArray(filas) || !filas.length) throw new Error('No hay filas para importar');

      const codigos = new Set(db.estado().productos.map((p) => p.codigo).filter(Boolean));
      const nuevos = [];
      const errores = [];

      filas.forEach((f, i) => {
        const n = f._linea || i + 1;
        try {
          const datos = {
            nombre: texto(f.nombre, 'Nombre'),
            codigo: opcional(f.codigo, 40),
            categoria: texto(f.categoria || 'General', 'Categoría', 40),
            costo: entero(f.costo, 'Costo'),
            precio: entero(f.precio, 'Precio'),
            stock: entero(f.stock, 'Stock'),
            stockMinimo: entero(f.stockMinimo ?? 0, 'Stock mínimo'),
          };
          if (datos.precio < datos.costo) throw new Error('El precio es menor al costo');
          if (datos.codigo && codigos.has(datos.codigo)) throw new Error(`El código ${datos.codigo} está repetido`);
          if (datos.codigo) codigos.add(datos.codigo);
          nuevos.push(datos);
        } catch (e) {
          errores.push({ fila: n, motivo: e.message });
        }
      });

      if (nuevos.length) {
        for (const d of nuevos) db.estado().productos.push({ id: db.nuevoId(), ...d });
        db.guardar();
      }
      return { importados: nuevos.length, errores };
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

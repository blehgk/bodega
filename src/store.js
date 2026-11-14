'use strict';
// Capa de datos: un JSON local, escritura atómica. Sin servidor, sin dependencias nativas.
// Precios en centavos (enteros) para que las cuentas de plata no arrastren errores de float.
const fs = require('node:fs');
const path = require('node:path');

const VERSION = 1;
const vacio = () => ({ version: VERSION, proximoId: 1, productos: [], proveedores: [], ventas: [], compras: [], movimientos: [] });

const entero = (v, campo, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${campo}: tiene que ser un número`);
  const r = Math.round(n);
  if (r < min || r > max) throw new Error(`${campo}: fuera de rango`);
  return r;
};

const texto = (v, campo, max = 80) => {
  const s = String(v ?? '').trim();
  if (!s) throw new Error(`${campo}: no puede quedar vacío`);
  if (s.length > max) throw new Error(`${campo}: demasiado largo`);
  return s;
};

function crearStore(archivo) {
  let st;
  try {
    const leido = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    st = leido && leido.version === VERSION ? leido : vacio();
  } catch (e) {
    if (e.code === 'ENOENT') st = vacio();
    else {
      // No pisar datos del comercio: se aparta el archivo roto y se arranca limpio.
      fs.renameSync(archivo, `${archivo}.corrupto-${Date.now()}`);
      st = vacio();
    }
  }

  const guardar = () => {
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    const tmp = `${archivo}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(st));
    fs.renameSync(tmp, archivo);
  };

  const nuevoId = () => st.proximoId++;
  const buscar = (id) => st.productos.find((p) => p.id === id) || (() => { throw new Error('Producto inexistente'); })();

  const api = {
    estado: () => st,

    producto(p = {}) {
      const datos = {
        nombre: texto(p.nombre, 'Nombre'),
        codigo: String(p.codigo ?? '').trim().slice(0, 40),
        categoria: texto(p.categoria || 'General', 'Categoría', 40),
        costo: entero(p.costo, 'Costo'),
        precio: entero(p.precio, 'Precio'),
        stock: entero(p.stock, 'Stock'),
        stockMinimo: entero(p.stockMinimo ?? 0, 'Stock mínimo'),
      };
      if (datos.precio < datos.costo) throw new Error('El precio no puede ser menor al costo');
      const existente = p.id ? buscar(p.id) : null;
      if (existente) Object.assign(existente, datos);
      else st.productos.push({ id: nuevoId(), ...datos });
      guardar();
      return existente || st.productos[st.productos.length - 1];
    },

    borrarProducto(id) {
      const i = st.productos.findIndex((p) => p.id === id);
      if (i < 0) throw new Error('Producto inexistente');
      st.productos.splice(i, 1);
      guardar();
      return true;
    },

    // items: [{ productoId, cantidad }]
    vender(items, medio = 'Efectivo', fecha = new Date().toISOString()) {
      if (!Array.isArray(items) || !items.length) throw new Error('El carrito está vacío');
      const detalle = [];
      for (const it of items) {
        const p = buscar(it.productoId);
        const cantidad = entero(it.cantidad, 'Cantidad', { min: 1, max: 9999 });
        if (p.stock < cantidad) throw new Error(`Sin stock de ${p.nombre} (quedan ${p.stock})`);
        detalle.push({ productoId: p.id, nombre: p.nombre, cantidad, precio: p.precio, costo: p.costo });
      }
      const total = detalle.reduce((s, d) => s + d.precio * d.cantidad, 0);
      const venta = { id: nuevoId(), fecha, medio: texto(medio, 'Medio de pago', 20), items: detalle, total };
      for (const d of detalle) {
        const p = buscar(d.productoId);
        p.stock -= d.cantidad;
        st.movimientos.push({ id: nuevoId(), fecha: venta.fecha, productoId: p.id, tipo: 'venta', cantidad: -d.cantidad, motivo: `Venta #${venta.id}` });
      }
      st.ventas.push(venta);
      guardar();
      return venta;
    },

    // cantidad positiva = entrada, negativa = salida
    ajustar(productoId, cantidad, motivo = 'Ajuste manual') {
      const p = buscar(productoId);
      const c = entero(cantidad, 'Cantidad', { min: -999999, max: 999999 });
      if (c === 0) throw new Error('La cantidad no puede ser 0');
      if (p.stock + c < 0) throw new Error(`Quedarían ${p.stock + c} unidades de ${p.nombre}`);
      p.stock += c;
      st.movimientos.push({ id: nuevoId(), fecha: new Date().toISOString(), productoId, tipo: 'ajuste', cantidad: c, motivo: texto(motivo, 'Motivo', 80) });
      guardar();
      return p;
    },

    proveedor(p = {}) {
      const datos = { nombre: texto(p.nombre, 'Nombre'), telefono: String(p.telefono ?? '').trim().slice(0, 30) };
      const existente = p.id ? st.proveedores.find((x) => x.id === p.id) : null;
      if (existente) Object.assign(existente, datos);
      else st.proveedores.push({ id: nuevoId(), ...datos });
      guardar();
      return existente || st.proveedores[st.proveedores.length - 1];
    },

    // items: [{ productoId, cantidad, costo }]
    compra(proveedorId, items, fecha = new Date().toISOString()) {
      if (!st.proveedores.some((x) => x.id === proveedorId)) throw new Error('Proveedor inexistente');
      if (!Array.isArray(items) || !items.length) throw new Error('La compra está vacía');
      const detalle = items.map((it) => {
        const p = buscar(it.productoId);
        const cantidad = entero(it.cantidad, 'Cantidad', { min: 1, max: 99999 });
        const costo = entero(it.costo ?? p.costo, 'Costo');
        p.stock += cantidad;
        p.costo = costo; // último costo conocido
        st.movimientos.push({ id: nuevoId(), fecha, productoId: p.id, tipo: 'compra', cantidad, motivo: 'Compra' });
        return { productoId: p.id, nombre: p.nombre, cantidad, costo };
      });
      const compra = { id: nuevoId(), fecha, proveedorId, items: detalle, total: detalle.reduce((s, d) => s + d.costo * d.cantidad, 0) };
      st.compras.push(compra);
      guardar();
      return compra;
    },

    // desde/hasta: ISO date (YYYY-MM-DD) inclusive
    resumen(desde, hasta) {
      const desdeT = new Date(`${desde}T00:00:00`).getTime();
      const hastaT = new Date(`${hasta}T23:59:59.999`).getTime();
      const ventas = st.ventas.filter((v) => {
        const t = new Date(v.fecha).getTime();
        return t >= desdeT && t <= hastaT;
      });
      const porMedio = {};
      const porProducto = new Map();
      const porDia = {};
      let total = 0;
      let margen = 0;
      let unidades = 0;
      for (const v of ventas) {
        total += v.total;
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
        total, margen, unidades, tickets: ventas.length, porMedio, porDia,
        top: [...porProducto.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5),
        faltantes: st.productos.filter((p) => p.stock <= p.stockMinimo).map((p) => ({ id: p.id, nombre: p.nombre, stock: p.stock })),
      };
    },

    respaldar(destino) {
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, JSON.stringify(st));
      return destino;
    },
  };

  return api;
}

module.exports = { crearStore, VERSION };

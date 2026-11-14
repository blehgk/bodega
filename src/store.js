'use strict';
// Capa de datos: un JSON local, escritura atómica. Sin servidor, sin dependencias nativas.
// Precios en centavos (enteros) para que las cuentas de plata no arrastren errores de float.
const fs = require('node:fs');
const path = require('node:path');

const VERSION = 2;

const negocioVacio = () => ({ nombre: 'Mi almacén', direccion: '', telefono: '', rut: '', pie: '¡Gracias por su compra!' });

const vacio = () => ({
  version: VERSION,
  proximoId: 1,
  negocio: negocioVacio(),
  productos: [],
  proveedores: [],
  clientes: [],
  ventas: [],
  compras: [],
  movimientos: [],
  esperas: [],
  cierres: [],
});

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

const opcional = (v, max = 80) => String(v ?? '').trim().slice(0, max);

// v1 → v2: se agregaron clientes, esperas, cierres, descuento y anulación.
function migrar(d) {
  if (!d || typeof d !== 'object') return vacio();
  if (d.version === VERSION) return d;
  if (d.version === 1) {
    return {
      ...vacio(),
      ...d,
      version: VERSION,
      negocio: d.negocio || negocioVacio(),
      clientes: d.clientes || [],
      esperas: [],
      cierres: [],
      ventas: (d.ventas || []).map((v) => ({ ...v, subtotal: v.subtotal ?? v.total, descuento: v.descuento ?? 0, anulada: false, clienteId: null })),
    };
  }
  return vacio();
}

const csv = (filas) => '\uFEFF' + filas
  .map((f) => f.map((v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';'))
  .join('\r\n');

const pesos = (c) => Math.round(c / 100);

function crearStore(archivo) {
  let st;
  try {
    st = migrar(JSON.parse(fs.readFileSync(archivo, 'utf8')));
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

  const enRango = (fecha, desde, hasta) => {
    const t = new Date(fecha).getTime();
    return t >= new Date(`${desde}T00:00:00`).getTime() && t <= new Date(`${hasta}T23:59:59.999`).getTime();
  };

  const api = {
    estado: () => st,

    negocio(datos = {}) {
      st.negocio = {
        nombre: texto(datos.nombre || st.negocio.nombre, 'Nombre del negocio', 60),
        rut: opcional(datos.rut, 20),
        direccion: opcional(datos.direccion, 80),
        telefono: opcional(datos.telefono, 30),
        pie: opcional(datos.pie, 120),
      };
      guardar();
      return st.negocio;
    },

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

    cliente(c = {}) {
      const datos = { nombre: texto(c.nombre, 'Nombre del cliente', 60), telefono: opcional(c.telefono, 30) };
      const existente = c.id ? st.clientes.find((x) => x.id === c.id) : null;
      if (existente) Object.assign(existente, datos);
      else st.clientes.push({ id: nuevoId(), ...datos });
      guardar();
      return existente || st.clientes[st.clientes.length - 1];
    },

    borrarCliente(id) {
      const i = st.clientes.findIndex((c) => c.id === id);
      if (i < 0) throw new Error('Cliente inexistente');
      st.clientes.splice(i, 1);
      guardar();
      return true;
    },

    // items: [{ productoId, cantidad }] — opciones: { fecha, descuento, clienteId }
    vender(items, medio = 'Efectivo', opciones = {}) {
      if (!Array.isArray(items) || !items.length) throw new Error('El carrito está vacío');
      const { fecha = new Date().toISOString(), descuento = 0, clienteId = null } = opciones;
      const detalle = [];
      for (const it of items) {
        const p = buscar(it.productoId);
        const cantidad = entero(it.cantidad, 'Cantidad', { min: 1, max: 9999 });
        if (p.stock < cantidad) throw new Error(`Sin stock de ${p.nombre} (quedan ${p.stock})`);
        detalle.push({ productoId: p.id, nombre: p.nombre, cantidad, precio: p.precio, costo: p.costo });
      }
      const subtotal = detalle.reduce((s, d) => s + d.precio * d.cantidad, 0);
      const desc = entero(descuento, 'Descuento');
      if (desc > subtotal) throw new Error('El descuento no puede superar el subtotal');
      if (clienteId && !st.clientes.some((c) => c.id === clienteId)) throw new Error('Cliente inexistente');
      const venta = {
        id: nuevoId(),
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
        const p = buscar(d.productoId);
        p.stock -= d.cantidad;
        st.movimientos.push({ id: nuevoId(), fecha: venta.fecha, productoId: p.id, tipo: 'venta', cantidad: -d.cantidad, motivo: `Venta #${venta.id}` });
      }
      st.ventas.push(venta);
      guardar();
      return venta;
    },

    // Devuelve la mercadería al stock y deja la venta marcada (no se borra: es historia).
    anular(ventaId, motivo = 'Anulación') {
      const v = st.ventas.find((x) => x.id === ventaId);
      if (!v) throw new Error('Venta inexistente');
      if (v.anulada) throw new Error('Esa venta ya está anulada');
      for (const it of v.items) {
        const p = st.productos.find((x) => x.id === it.productoId);
        if (!p) continue; // producto borrado: la venta igual queda anulada
        p.stock += it.cantidad;
        st.movimientos.push({ id: nuevoId(), fecha: new Date().toISOString(), productoId: p.id, tipo: 'anulacion', cantidad: it.cantidad, motivo: `${texto(motivo, 'Motivo', 60)} #${v.id}` });
      }
      v.anulada = true;
      guardar();
      return v;
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
      const datos = { nombre: texto(p.nombre, 'Nombre'), telefono: opcional(p.telefono, 30) };
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

    /* ---------- ventas en espera ---------- */
    esperar(items, opciones = {}) {
      if (!Array.isArray(items) || !items.length) throw new Error('No hay nada para dejar en espera');
      const espera = {
        id: nuevoId(),
        fecha: new Date().toISOString(),
        items: items.map((it) => ({ productoId: entero(it.productoId, 'Producto', { min: 1 }), cantidad: entero(it.cantidad, 'Cantidad', { min: 1, max: 9999 }) })),
        descuento: entero(opciones.descuento ?? 0, 'Descuento'),
        clienteId: opciones.clienteId || null,
        nota: opcional(opciones.nota, 60),
      };
      st.esperas.push(espera);
      guardar();
      return espera;
    },

    recuperarEspera(id) {
      const i = st.esperas.findIndex((e) => e.id === id);
      if (i < 0) throw new Error('Esa venta en espera no existe');
      const [espera] = st.esperas.splice(i, 1);
      guardar();
      return espera;
    },

    borrarEspera(id) {
      const i = st.esperas.findIndex((e) => e.id === id);
      if (i < 0) throw new Error('Esa venta en espera no existe');
      st.esperas.splice(i, 1);
      guardar();
      return true;
    },

    /* ---------- reportes ---------- */
    // desde/hasta: ISO date (YYYY-MM-DD) inclusive
    resumen(desde, hasta) {
      const ventas = st.ventas.filter((v) => enRango(v.fecha, desde, hasta));
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
        total, margen, unidades, descuentos,
        tickets: validas.length,
        anuladas: ventas.length - validas.length,
        porMedio,
        porDia,
        top: [...porProducto.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5),
        faltantes: st.productos.filter((p) => p.stock <= p.stockMinimo).map((p) => ({ id: p.id, nombre: p.nombre, stock: p.stock })),
      };
    },

    // Cuadre del día: lo que debería haber en caja según las ventas en efectivo.
    cierre(fecha) {
      const r = api.resumen(fecha, fecha);
      const esperado = r.porMedio.Efectivo || 0;
      const guardado = st.cierres.find((c) => c.fecha === fecha) || null;
      return { fecha, esperado, porMedio: r.porMedio, total: r.total, tickets: r.tickets, anuladas: r.anuladas, guardado };
    },

    guardarCierre(fecha, contado) {
      const c = api.cierre(fecha);
      const registro = {
        id: (st.cierres.find((x) => x.fecha === fecha) || {}).id || nuevoId(),
        fecha,
        esperado: c.esperado,
        contado: entero(contado, 'Efectivo contado'),
        diferencia: entero(contado, 'Efectivo contado') - c.esperado,
        total: c.total,
        tickets: c.tickets,
        porMedio: c.porMedio,
      };
      const i = st.cierres.findIndex((x) => x.fecha === fecha);
      if (i >= 0) st.cierres[i] = registro;
      else st.cierres.push(registro);
      guardar();
      return registro;
    },

    /* ---------- exportación ---------- */
    csvVentas(desde, hasta) {
      const filas = [['Folio', 'Fecha', 'Hora', 'Medio', 'Cliente', 'Detalle', 'Subtotal', 'Descuento', 'Total', 'Estado']];
      for (const v of st.ventas.filter((x) => enRango(x.fecha, desde, hasta))) {
        const f = new Date(v.fecha);
        const cliente = st.clientes.find((c) => c.id === v.clienteId);
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
      for (const p of [...st.productos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CL'))) {
        filas.push([p.nombre, p.codigo, p.categoria, pesos(p.costo), pesos(p.precio), p.stock, p.stockMinimo, pesos(p.costo * p.stock)]);
      }
      return csv(filas);
    },

    /* ---------- respaldo ---------- */
    respaldar(destino) {
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, JSON.stringify(st));
      return destino;
    },

    restaurar(contenido) {
      let datos;
      try {
        datos = JSON.parse(contenido);
      } catch {
        throw new Error('El archivo no es un respaldo válido');
      }
      if (!datos || typeof datos !== 'object' || !Array.isArray(datos.productos)) throw new Error('El archivo no es un respaldo de Bodega');
      st = migrar(datos);
      guardar();
      return st;
    },
  };

  return api;
}

module.exports = { crearStore, VERSION };

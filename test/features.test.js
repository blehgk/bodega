'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { crearStore } = require('../src/core/store');
const { htmlTicket } = require('../src/core/ticket');

const archivoNuevo = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bodega-')), 'datos.json');
const hoy = () => {
  const f = new Date();
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
};

// Todo en centavos: 150000 = $1.500.
const conProducto = (precio = 150000, stock = 10, costo = 100000) => {
  const s = crearStore(archivoNuevo());
  const p = s.producto({ nombre: 'Coca-Cola 500ml', costo, precio, stock });
  return { s, p };
};

test('el descuento baja el total y queda registrado', () => {
  const { s, p } = conProducto();
  const v = s.vender([{ productoId: p.id, cantidad: 2 }], 'Efectivo', { descuento: 50000 });
  assert.equal(v.subtotal, 300000);
  assert.equal(v.total, 250000);
  const r = s.resumen(hoy(), hoy());
  assert.equal(r.total, 250000);
  assert.equal(r.descuentos, 50000);
});

test('no acepta un descuento mayor al subtotal', () => {
  const { s, p } = conProducto();
  assert.throws(() => s.vender([{ productoId: p.id, cantidad: 1 }], 'Efectivo', { descuento: 99999999 }), /descuento/i);
  assert.equal(s.estado().ventas.length, 0);
});

test('anular devuelve el stock y saca la venta del resumen', () => {
  const { s, p } = conProducto();
  const v = s.vender([{ productoId: p.id, cantidad: 3 }], 'Efectivo');
  assert.equal(s.estado().productos[0].stock, 7);
  s.anular(v.id, 'Devolución');
  assert.equal(s.estado().productos[0].stock, 10);
  const r = s.resumen(hoy(), hoy());
  assert.equal(r.total, 0);
  assert.equal(r.anuladas, 1);
  assert.throws(() => s.anular(v.id), /ya está anulada/);
});

test('la venta puede quedar a nombre de un cliente', () => {
  const { s, p } = conProducto();
  const c = s.cliente({ nombre: 'María Soto', telefono: '+56 9 8123 4567' });
  const v = s.vender([{ productoId: p.id, cantidad: 1 }], 'Débito', { clienteId: c.id });
  assert.equal(v.clienteId, c.id);
  assert.throws(() => s.vender([{ productoId: p.id, cantidad: 1 }], 'Efectivo', { clienteId: 9999 }), /Cliente inexistente/);
});

test('venta en espera: se guarda, se recupera y no toca el stock', () => {
  const { s, p } = conProducto();
  const e = s.esperar([{ productoId: p.id, cantidad: 2 }], { nota: 'Se fue a buscar plata' });
  assert.equal(s.estado().productos[0].stock, 10);
  assert.equal(s.estado().esperas.length, 1);
  const recuperada = s.recuperarEspera(e.id);
  assert.equal(recuperada.items[0].cantidad, 2);
  assert.equal(s.estado().esperas.length, 0);
});

test('el cierre compara el efectivo esperado con el contado', () => {
  const { s, p } = conProducto();
  s.vender([{ productoId: p.id, cantidad: 2 }], 'Efectivo');
  s.vender([{ productoId: p.id, cantidad: 1 }], 'Débito');
  const c = s.cierre(hoy());
  assert.equal(c.esperado, 300000);
  assert.equal(c.total, 450000);
  const reg = s.guardarCierre(hoy(), 280000);
  assert.equal(reg.diferencia, -20000);
  assert.equal(s.cierre(hoy()).guardado.diferencia, -20000);
});

test('el CSV de ventas trae encabezado, separador ; y BOM', () => {
  const { s, p } = conProducto();
  s.vender([{ productoId: p.id, cantidad: 2 }], 'Efectivo');
  const csv = s.csvVentas(hoy(), hoy());
  assert.ok(csv.startsWith('\uFEFF'));
  const [cabecera, fila] = csv.split('\r\n');
  assert.match(cabecera, /Folio;Fecha;Hora;Medio/);
  assert.match(fila, /;Efectivo;/);
  assert.match(fila, /3000/);
});

test('el CSV de productos lista el catálogo con valor a costo', () => {
  const { s } = conProducto(150000, 4, 100000);
  const csv = s.csvProductos();
  assert.match(csv, /Coca-Cola 500ml/);
  assert.match(csv, /;4000$/m);
});

test('restaurar un respaldo reemplaza los datos y rechaza basura', () => {
  const { s } = conProducto();
  const respaldo = JSON.stringify(s.estado());
  s.borrarProducto(s.estado().productos[0].id);
  assert.equal(s.estado().productos.length, 0);
  s.restaurar(respaldo);
  assert.equal(s.estado().productos.length, 1);
  assert.throws(() => s.restaurar('no es json'), /no es un respaldo/);
  assert.throws(() => s.restaurar('{"hola":1}'), /no es un respaldo de Bodega/);
});

test('un archivo v1 se migra sin perder ventas', () => {
  const archivo = archivoNuevo();
  fs.writeFileSync(archivo, JSON.stringify({
    version: 1, proximoId: 3,
    productos: [{ id: 1, nombre: 'Yerba', codigo: '', categoria: 'Almacén', costo: 1000, precio: 1500, stock: 5, stockMinimo: 1 }],
    proveedores: [], compras: [], movimientos: [],
    ventas: [{ id: 2, fecha: new Date().toISOString(), medio: 'Efectivo', items: [{ productoId: 1, nombre: 'Yerba', cantidad: 1, precio: 1500, costo: 1000 }], total: 1500 }],
  }));
  const s = crearStore(archivo);
  assert.equal(s.estado().version, 2);
  assert.equal(s.estado().ventas[0].descuento, 0);
  assert.equal(s.estado().ventas[0].anulada, false);
  assert.deepEqual(s.estado().clientes, []);
  assert.equal(s.resumen(hoy(), hoy()).total, 1500);
});

test('el ticket imprime negocio, ítems, descuento y total', () => {
  const { s, p } = conProducto(150000, 10);
  s.negocio({ nombre: 'Almacén Doña Rosa', rut: '12.345.678-9', direccion: 'Av. Siempre Viva 742', telefono: '+56 9 1234 5678' });
  const v = s.vender([{ productoId: p.id, cantidad: 2 }], 'Efectivo', { descuento: 50000 });
  const html = htmlTicket(v, s.estado().negocio, null);
  assert.match(html, /Almacén Doña Rosa/);
  assert.match(html, /12\.345\.678-9/);
  assert.match(html, /2×/);
  assert.match(html, /Coca-Cola 500ml/);
  assert.match(html, /Descuento/);
  assert.match(html, /\$2\.500/);
  assert.match(html, /no tributario/);
  assert.match(html, /size: 58mm auto/);
});

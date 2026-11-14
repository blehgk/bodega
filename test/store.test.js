'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { crearStore } = require('../src/store');
const { sembrar } = require('../src/seed');

const archivoNuevo = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bodega-')), 'datos.json');
const hoy = () => {
  const f = new Date();
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
};

test('vender descuenta stock y suma al resumen del día', () => {
  const s = crearStore(archivoNuevo());
  const p = s.producto({ nombre: 'Coca 500', costo: 1000, precio: 1500, stock: 10 });
  const venta = s.vender([{ productoId: p.id, cantidad: 3 }], 'Efectivo');
  assert.equal(venta.total, 4500);
  assert.equal(s.estado().productos[0].stock, 7);
  const r = s.resumen(hoy(), hoy());
  assert.equal(r.total, 4500);
  assert.equal(r.unidades, 3);
  assert.equal(r.margen, 1500);
});

test('no vende más de lo que hay', () => {
  const s = crearStore(archivoNuevo());
  const p = s.producto({ nombre: 'Alfajor', costo: 500, precio: 900, stock: 2 });
  assert.throws(() => s.vender([{ productoId: p.id, cantidad: 3 }]), /Sin stock/);
  assert.equal(s.estado().productos[0].stock, 2);
  assert.equal(s.estado().ventas.length, 0);
});

test('los datos sobreviven al reinicio', () => {
  const archivo = archivoNuevo();
  const a = crearStore(archivo);
  a.producto({ nombre: 'Yerba', costo: 2000, precio: 3000, stock: 5 });
  const b = crearStore(archivo);
  assert.equal(b.estado().productos.length, 1);
  assert.equal(b.estado().productos[0].nombre, 'Yerba');
});

test('la compra suma stock y actualiza el costo', () => {
  const s = crearStore(archivoNuevo());
  const p = s.producto({ nombre: 'Azúcar', costo: 800, precio: 1200, stock: 1 });
  const prov = s.proveedor({ nombre: 'Mayorista' });
  s.compra(prov.id, [{ productoId: p.id, cantidad: 10, costo: 900 }]);
  const actual = s.estado().productos[0];
  assert.equal(actual.stock, 11);
  assert.equal(actual.costo, 900);
});

test('un ajuste no puede dejar stock negativo', () => {
  const s = crearStore(archivoNuevo());
  const p = s.producto({ nombre: 'Sal', costo: 100, precio: 200, stock: 2 });
  assert.throws(() => s.ajustar(p.id, -5), /Quedarían/);
  s.ajustar(p.id, -2, 'Rotura');
  assert.equal(s.estado().productos[0].stock, 0);
});

test('el demo carga 60 productos y sus ventas cuadran', () => {
  const s = crearStore(archivoNuevo());
  assert.equal(sembrar(s), true);
  assert.equal(s.estado().productos.length, 60);
  const st = s.estado();
  const sumaVentas = st.ventas.reduce((t, v) => t + v.total, 0);
  const d = new Date(Date.now() - 7 * 864e5);
  const desde = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.equal(s.resumen(desde, hoy()).total, sumaVentas);
  assert.ok(st.ventas.length > 20);
  assert.equal(st.compras.length, 3);
  assert.equal(sembrar(s), false, 'no vuelve a sembrar si ya hay datos');
});

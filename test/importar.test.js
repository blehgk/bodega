'use strict';
// Importación de productos: CSV, validación por fila y arranque de cero.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { crearStore } = require('../src/core/store');
const { parsear, mapear } = require('../src/core/csv');

const archivoNuevo = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bodega-')), 'datos.json');

test('el CSV que exporta la app se puede volver a importar', () => {
  const s = crearStore(archivoNuevo());
  s.producto({ nombre: 'Café Nescafé 100g', codigo: '7801', categoria: 'Almacén', costo: 300000, precio: 450000, stock: 8, stockMinimo: 2 });
  const csv = s.csvProductos();

  const otro = crearStore(archivoNuevo());
  const r = otro.importarCSV(csv);
  assert.equal(r.importados, 1);
  assert.equal(r.errores.length, 0);

  const p = otro.estado().productos[0];
  assert.equal(p.nombre, 'Café Nescafé 100g');
  assert.equal(p.codigo, '7801');
  assert.equal(p.precio, 450000); // $4.500 en centavos
  assert.equal(p.stockMinimo, 2);
});

test('acepta coma como separador y sin cabecera', () => {
  const texto = 'Pan marraqueta,7802,Panadería,100,200,50,5\nHallulla,7803,Panadería,100,200,30,5';
  const s = crearStore(archivoNuevo());
  const r = s.importarCSV(texto);
  assert.equal(r.importados, 2);
  assert.equal(s.estado().productos[1].nombre, 'Hallulla');
});

test('una fila mala no arrastra a las buenas', () => {
  const texto = [
    'Producto;Código;Categoría;Costo;Precio;Stock;Stock mínimo',
    'Bien;1;Almacén;100;200;5;1',
    'Sin precio;2;Almacén;100;;5;1',
    'Precio bajo el costo;3;Almacén;500;100;5;1',
    'Código repetido;1;Almacén;100;200;5;1',
  ].join('\n');

  const s = crearStore(archivoNuevo());
  const r = s.importarCSV(texto);
  assert.equal(r.importados, 1);
  assert.equal(r.errores.length, 3);
  assert.deepEqual(r.errores.map((e) => e.fila), [3, 4, 5]);
});

test('no se pueden repetir códigos de barras', () => {
  const s = crearStore(archivoNuevo());
  s.producto({ nombre: 'Pan', codigo: '7801', categoria: 'Panadería', costo: 100, precio: 200, stock: 5 });
  assert.throws(
    () => s.producto({ nombre: 'Pan grande', codigo: '7801', categoria: 'Panadería', costo: 100, precio: 300, stock: 5 }),
    /ya es de "Pan"/,
  );
});

test('editar un producto conserva su propio código', () => {
  const s = crearStore(archivoNuevo());
  const p = s.producto({ nombre: 'Pan', codigo: '7801', categoria: 'Panadería', costo: 100, precio: 200, stock: 5 });
  const editado = s.producto({ id: p.id, nombre: 'Pan grande', codigo: '7801', categoria: 'Panadería', costo: 100, precio: 300, stock: 5 });
  assert.equal(editado.precio, 300);
});

test('el parser respeta comillas y comillas escapadas', () => {
  const filas = parsear('a;"b;con punto y coma";"c ""entre comillas"""\nd;e;f');
  assert.deepEqual(filas, [['a', 'b;con punto y coma', 'c "entre comillas"'], ['d', 'e', 'f']]);
});

test('el parser ignora el BOM y las líneas vacías', () => {
  const filas = parsear('\uFEFFProducto;Código\nPan;1\n\n');
  assert.deepEqual(filas, [['Producto', 'Código'], ['Pan', '1']]);
});

test('mapear reconoce las columnas por nombre, en cualquier orden', () => {
  const filas = parsear('Precio;Nombre;Stock\n200;Pan;5');
  const [fila] = mapear(filas);
  assert.equal(fila.nombre, 'Pan');
  assert.equal(fila.precio, 20000); // el CSV trae pesos; la app guarda centavos
  assert.equal(fila.stock, '5');
});

test('empezar de cero borra todo menos el negocio y el contador de folios', () => {
  const s = crearStore(archivoNuevo());
  s.negocio({ nombre: 'Almacén Don Pedro', rut: '11.111.111-1', telefono: '', direccion: '', pie: 'Gracias' });
  const p = s.producto({ nombre: 'Pan', codigo: '1', categoria: 'Panadería', costo: 100, precio: 200, stock: 10 });
  s.vender([{ productoId: p.id, cantidad: 1 }], 'Efectivo');
  const folioAntes = s.estado().proximoId;

  s.reiniciar();

  assert.equal(s.estado().productos.length, 0);
  assert.equal(s.estado().ventas.length, 0);
  assert.equal(s.estado().movimientos.length, 0);
  assert.equal(s.estado().negocio.nombre, 'Almacén Don Pedro');
  assert.equal(s.estado().proximoId, folioAntes, 'el folio no se puede repetir');
});

test('si el disco falla, la memoria no queda adelantada al archivo', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bodega-'));
  const archivo = path.join(dir, 'datos.json');
  const s = crearStore(archivo);
  const p = s.producto({ nombre: 'Pan', codigo: '1', categoria: 'Panadería', costo: 100, precio: 200, stock: 10 });
  const ventasAntes = s.estado().ventas.length;

  fs.chmodSync(dir, 0o500); // carpeta de solo lectura: simula disco lleno o sin permisos
  let error = null;
  try {
    s.vender([{ productoId: p.id, cantidad: 1 }], 'Efectivo');
  } catch (e) {
    error = e.message;
  }
  fs.chmodSync(dir, 0o700);

  assert.match(error || '', /No se pudo guardar/);
  assert.equal(s.estado().ventas.length, ventasAntes, 'la venta no puede quedar en memoria');
  assert.equal(s.estado().productos[0].stock, 10, 'el stock no puede quedar descontado');
});

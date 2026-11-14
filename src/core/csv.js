'use strict';
// Lectura de CSV para importar productos. Acepta lo que exporta la propia app
// (separador ; y BOM) y también lo que sale de Excel en español (, o ;).
// No es un parser RFC completo: cubre comillas, comillas escapadas y saltos de línea.

const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Devuelve las filas como arrays de celdas.
function parsear(texto) {
  const limpio = String(texto).replace(/^\uFEFF/, '');
  const primera = limpio.slice(0, limpio.indexOf('\n') + 1 || limpio.length);
  const sep = (primera.match(/;/g) || []).length >= (primera.match(/,/g) || []).length ? ';' : ',';

  const filas = [];
  let celda = '';
  let fila = [];
  let entreComillas = false;

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];

    if (entreComillas) {
      if (c === '"' && limpio[i + 1] === '"') { celda += '"'; i++; }
      else if (c === '"') entreComillas = false;
      else celda += c;
      continue;
    }

    if (c === '"') { entreComillas = true; continue; }
    if (c === sep) { fila.push(celda); celda = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { fila.push(celda); filas.push(fila); fila = []; celda = ''; continue; }
    celda += c;
  }
  if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }

  return filas.filter((f) => f.some((c) => String(c).trim() !== ''));
}

// Nombres de columna que reconoce, además del orden por defecto de la exportación.
const ALIAS = {
  nombre: ['producto', 'nombre', 'descripcion', 'articulo'],
  codigo: ['codigo', 'codigo de barras', 'codigo barras', 'ean', 'sku', 'barra'],
  categoria: ['categoria', 'rubro', 'familia'],
  costo: ['costo', 'costo unitario', 'precio de costo', 'compra'],
  precio: ['precio', 'precio de venta', 'venta', 'precio venta'],
  stock: ['stock', 'cantidad', 'existencia', 'unidades'],
  stockMinimo: ['stock minimo', 'minimo', 'stock min', 'min'],
};

const ORDEN = ['nombre', 'codigo', 'categoria', 'costo', 'precio', 'stock', 'stockMinimo'];

// En el CSV los montos van en pesos, como los ve el dueño ("4.500").
// La app los guarda en centavos. Acepta punto de miles y coma decimal.
const aCentavos = (v) => {
  const limpio = String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  if (!limpio) return NaN;
  const n = Number(limpio);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};

function mapear(filas) {
  if (!filas.length) return [];

  const cabecera = filas[0].map(sinTildes);
  const indice = {};
  for (const [campo, alias] of Object.entries(ALIAS)) {
    const i = cabecera.findIndex((c) => alias.includes(c));
    if (i >= 0) indice[campo] = i;
  }

  // Sin cabecera reconocible: se asume el orden de la exportación de la app.
  const conCabecera = Object.keys(indice).length >= 3;
  const cuerpo = conCabecera ? filas.slice(1) : filas;

  return cuerpo.map((f, i) => {
    const fila = {};
    ORDEN.forEach((campo, j) => {
      const pos = conCabecera ? indice[campo] : j;
      fila[campo] = pos === undefined ? '' : String(f[pos] ?? '').trim();
    });
    fila.costo = aCentavos(fila.costo);
    fila.precio = aCentavos(fila.precio);
    // Número de línea en el archivo, para que el error diga algo que el usuario pueda buscar.
    fila._linea = conCabecera ? i + 2 : i + 1;
    return fila;
  });
}

module.exports = { parsear, mapear };

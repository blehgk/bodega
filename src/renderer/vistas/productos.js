'use strict';
// Vista Productos: alta, edición y borrado del catálogo.

import { $ } from '../ui/dom.js';
import { plata, esc, pesosAcentavos } from '../ui/formato.js';
import { abrirModal } from '../ui/modal.js';
import { S, bd, mutar } from '../ui/estado.js';

export function pintar() {
  const f = S.filtroProd.trim().toLowerCase();
  const lista = S.datos.productos
    .filter((p) => !f || p.nombre.toLowerCase().includes(f) || (p.codigo || '').includes(f) || p.categoria.toLowerCase().includes(f))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CL'));

  $('#tabla-productos').innerHTML = `<table>
    <thead><tr>
      <th>Producto</th><th>Código</th><th>Categoría</th>
      <th class="num">Costo</th><th class="num">Precio</th><th class="num">Stock</th><th></th>
    </tr></thead>
    <tbody>${lista.map((p) => `<tr>
      <td>${esc(p.nombre)}</td>
      <td class="num">${esc(p.codigo || '—')}</td>
      <td>${esc(p.categoria)}</td>
      <td class="num">${plata(p.costo)}</td>
      <td class="num">${plata(p.precio)}</td>
      <td class="num">${p.stock}</td>
      <td><div class="acciones-fila">
        <button class="secundario chico" data-editar="${p.id}">Editar</button>
        <button class="secundario chico" data-borrar="${p.id}">Borrar</button>
      </div></td>
    </tr>`).join('') || '<tr><td colspan="7" class="vacio">Sin productos que coincidan</td></tr>'}</tbody>
  </table>`;
}

function formulario(p = {}) {
  const pesos = (centavos) => (centavos ? centavos / 100 : '');

  abrirModal(p.id ? 'Editar producto' : 'Nuevo producto', `
    <div class="campo"><label>Nombre</label><input name="nombre" required maxlength="80" value="${esc(p.nombre)}"></div>
    <div class="doble">
      <div class="campo"><label>Código de barras</label><input name="codigo" maxlength="40" value="${esc(p.codigo)}"></div>
      <div class="campo"><label>Categoría</label><input name="categoria" maxlength="40" value="${esc(p.categoria || 'General')}"></div>
    </div>
    <div class="doble">
      <div class="campo"><label>Costo ($)</label><input name="costo" type="number" step="1" min="0" required value="${pesos(p.costo)}"></div>
      <div class="campo"><label>Precio de venta ($)</label><input name="precio" type="number" step="1" min="0" required value="${pesos(p.precio)}"></div>
    </div>
    <div class="doble">
      <div class="campo"><label>Stock</label><input name="stock" type="number" min="0" required value="${p.stock ?? 0}"></div>
      <div class="campo"><label>Stock mínimo</label><input name="stockMinimo" type="number" min="0" value="${p.stockMinimo ?? 0}"></div>
    </div>`,
  (datos) => mutar(bd.producto({
    id: p.id,
    nombre: datos.get('nombre'),
    codigo: datos.get('codigo'),
    categoria: datos.get('categoria'),
    costo: pesosAcentavos(datos.get('costo')),
    precio: pesosAcentavos(datos.get('precio')),
    stock: Number(datos.get('stock')),
    stockMinimo: Number(datos.get('stockMinimo') || 0),
  })));
}

export function montar() {
  $('#buscar-producto').addEventListener('input', (e) => {
    S.filtroProd = e.target.value;
    pintar();
  });

  $('#nuevo-producto').addEventListener('click', () => formulario());

  $('#tabla-productos').addEventListener('click', (e) => {
    const editar = e.target.closest('[data-editar]');
    const borrar = e.target.closest('[data-borrar]');

    if (editar) formulario(S.datos.productos.find((p) => p.id === Number(editar.dataset.editar)));

    if (borrar) {
      const p = S.datos.productos.find((x) => x.id === Number(borrar.dataset.borrar));
      if (p && confirm(`¿Borrar "${p.nombre}"? Las ventas ya hechas no se tocan.`)) mutar(bd.borrarProducto(p.id));
    }
  });
}

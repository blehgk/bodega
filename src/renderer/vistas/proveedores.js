'use strict';
// Vista Proveedores: alta de proveedores y registro de compras que reponen stock.

import { $, $$ } from '../ui/dom.js';
import { plata, esc, pesosAcentavos } from '../ui/formato.js';
import { avisar } from '../ui/aviso.js';
import { abrirModal } from '../ui/modal.js';
import { S, bd, mutar } from '../ui/estado.js';

export function pintar() {
  const comprasDe = (id) => S.datos.compras.filter((c) => c.proveedorId === id);

  $('#lista-proveedores').innerHTML = `<table>
    <thead><tr><th>Proveedor</th><th>Teléfono</th><th class="num">Compras</th><th></th></tr></thead>
    <tbody>${S.datos.proveedores.map((p) => `<tr>
      <td>${esc(p.nombre)}</td>
      <td>${esc(p.telefono || '—')}</td>
      <td class="num">${comprasDe(p.id).length}</td>
      <td><div class="acciones-fila"><button class="secundario chico" data-compra="${p.id}">Compra</button></div></td>
    </tr>`).join('') || '<tr><td colspan="4" class="vacio">Todavía no hay proveedores</td></tr>'}</tbody>
  </table>`;

  const ultimas = [...S.datos.compras].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);
  $('#compras').innerHTML = `<table>
    <thead><tr><th>Últimas compras</th><th class="num">Total</th></tr></thead>
    <tbody>${ultimas.map((c) => {
      const prov = S.datos.proveedores.find((x) => x.id === c.proveedorId);
      return `<tr>
        <td>${esc(prov?.nombre || '—')}<br><small class="pista">${new Date(c.fecha).toLocaleDateString('es-CL')} · ${c.items.length} producto(s)</small></td>
        <td class="num">${plata(c.total)}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="2" class="vacio">Sin compras registradas</td></tr>'}</tbody>
  </table>`;
}

function formularioProveedor() {
  abrirModal('Nuevo proveedor', `
    <div class="campo"><label>Nombre</label><input name="nombre" required maxlength="80"></div>
    <div class="campo"><label>Teléfono</label><input name="telefono" maxlength="30"></div>`,
  (datos) => mutar(bd.proveedor({ nombre: datos.get('nombre'), telefono: datos.get('telefono') })));
}

function formularioCompra(proveedorId) {
  const lineas = [];
  const opciones = S.datos.productos.map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');

  abrirModal('Registrar compra', `
    <div class="campo"><label>Proveedor</label>
      <select name="proveedor">
        ${S.datos.proveedores.map((p) => `<option value="${p.id}"${p.id === proveedorId ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('')}
      </select>
    </div>
    <div class="doble">
      <div class="campo"><label>Producto</label><select id="c-prod">${opciones}</select></div>
      <div class="campo"><label>Cantidad</label><input id="c-cant" type="number" min="1" value="1"></div>
    </div>
    <div class="doble">
      <div class="campo"><label>Costo unitario ($)</label><input id="c-costo" type="number" min="0" step="1"></div>
      <div class="campo boton"><button type="button" class="secundario" id="c-add">Agregar ítem</button></div>
    </div>
    <div id="c-lineas" class="campos"></div>`,
  (datos) => {
    if (!lineas.length) {
      avisar('Agrega al menos un ítem', true);
      return false;
    }
    return mutar(bd.compra(Number(datos.get('proveedor')), lineas.map((l) => ({
      productoId: l.productoId, cantidad: l.cantidad, costo: l.costo,
    }))));
  });

  const pintarLineas = () => {
    const contenedor = $('#c-lineas');
    if (!contenedor) return;

    contenedor.innerHTML = lineas.map((l, i) => `<div class="linea">
      <span class="nom">${esc(l.nombre)}</span>
      <span class="sub">${plata(l.costo * l.cantidad)}</span>
      <span class="ctrl">
        <span class="pista">${l.cantidad} × ${plata(l.costo)}</span>
        <button type="button" class="quitar" data-quitar="${i}">Quitar</button>
      </span>
    </div>`).join('');

    $$('[data-quitar]', contenedor).forEach((boton) => {
      boton.onclick = () => {
        lineas.splice(Number(boton.dataset.quitar), 1);
        pintarLineas();
      };
    });
  };

  $('#c-add').onclick = () => {
    const producto = S.datos.productos.find((p) => p.id === Number($('#c-prod').value));
    const cantidad = Number($('#c-cant').value);
    if (!producto || !(cantidad > 0)) return avisar('Cantidad inválida', true);

    const costo = pesosAcentavos($('#c-costo').value) || producto.costo;
    lineas.push({ productoId: producto.id, nombre: producto.nombre, cantidad, costo });
    pintarLineas();
  };
}

export function montar() {
  $('#nuevo-proveedor').addEventListener('click', formularioProveedor);

  $('#lista-proveedores').addEventListener('click', (e) => {
    const boton = e.target.closest('[data-compra]');
    if (boton) formularioCompra(Number(boton.dataset.compra));
  });
}

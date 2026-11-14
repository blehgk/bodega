'use strict';
// Vista Stock: qué falta reponer y ajustes manuales con motivo.

import { $ } from '../ui/dom.js';
import { esc } from '../ui/formato.js';
import { abrirModal } from '../ui/modal.js';
import { S, bd, mutar } from '../ui/estado.js';

export function pintar() {
  const lista = [...S.datos.productos].sort((a, b) => a.stock - b.stock || a.nombre.localeCompare(b.nombre, 'es-CL'));

  $('#tabla-stock').innerHTML = `<table>
    <thead><tr>
      <th>Producto</th><th>Categoría</th><th class="num">Stock</th><th class="num">Mínimo</th><th>Estado</th><th></th>
    </tr></thead>
    <tbody>${lista.map((p) => {
      const estado = p.stock === 0
        ? '<span class="etiqueta cero">Sin stock</span>'
        : p.stock <= p.stockMinimo
          ? '<span class="etiqueta bajo">Reponer</span>'
          : '<span class="etiqueta ok">OK</span>';

      return `<tr>
        <td>${esc(p.nombre)}</td>
        <td>${esc(p.categoria)}</td>
        <td class="num">${p.stock}</td>
        <td class="num">${p.stockMinimo}</td>
        <td>${estado}</td>
        <td><div class="acciones-fila"><button class="secundario chico" data-ajustar="${p.id}">Ajustar</button></div></td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function formulario(p) {
  abrirModal(`Ajustar stock · ${p.nombre}`, `
    <p class="pista">Stock actual: ${p.stock}. Usa números negativos para descontar (rotura, vencimiento, robo).</p>
    <div class="doble">
      <div class="campo"><label>Cantidad</label><input name="cantidad" type="number" required value="1"></div>
      <div class="campo"><label>Motivo</label><input name="motivo" maxlength="80" value="Ajuste manual"></div>
    </div>`,
  (datos) => mutar(bd.ajustar(p.id, Number(datos.get('cantidad')), datos.get('motivo'))));
}

export function montar() {
  $('#tabla-stock').addEventListener('click', (e) => {
    const boton = e.target.closest('[data-ajustar]');
    const p = boton && S.datos.productos.find((x) => x.id === Number(boton.dataset.ajustar));
    if (p) formulario(p);
  });
}

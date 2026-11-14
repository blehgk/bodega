'use strict';
// Vista Clientes: quién compra y cuánto. Sin cuenta corriente.

import { $ } from '../ui/dom.js';
import { plata, esc } from '../ui/formato.js';
import { abrirModal } from '../ui/modal.js';
import { S, bd, mutar } from '../ui/estado.js';

export function pintar() {
  const comprasDe = (id) => S.datos.ventas.filter((v) => v.clienteId === id && !v.anulada);

  $('#tabla-clientes').innerHTML = `<table>
    <thead><tr><th>Cliente</th><th>Teléfono</th><th class="num">Compras</th><th class="num">Total</th><th></th></tr></thead>
    <tbody>${S.datos.clientes.map((c) => {
      const ventas = comprasDe(c.id);
      return `<tr>
        <td>${esc(c.nombre)}</td>
        <td>${esc(c.telefono || '—')}</td>
        <td class="num">${ventas.length}</td>
        <td class="num">${plata(ventas.reduce((s, v) => s + v.total, 0))}</td>
        <td><div class="acciones-fila">
          <button class="secundario chico" data-editar-cliente="${c.id}">Editar</button>
          <button class="secundario chico" data-borrar-cliente="${c.id}">Borrar</button>
        </div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" class="vacio">Todavía no hay clientes</td></tr>'}</tbody>
  </table>`;
}

function formulario(c = {}) {
  abrirModal(c.id ? 'Editar cliente' : 'Nuevo cliente', `
    <div class="campo"><label>Nombre</label><input name="nombre" required maxlength="60" value="${esc(c.nombre)}"></div>
    <div class="campo"><label>Teléfono</label><input name="telefono" maxlength="30" value="${esc(c.telefono)}"></div>`,
  (datos) => mutar(bd.cliente({ id: c.id, nombre: datos.get('nombre'), telefono: datos.get('telefono') })));
}

export function montar() {
  $('#nuevo-cliente').addEventListener('click', () => formulario());

  $('#tabla-clientes').addEventListener('click', (e) => {
    const editar = e.target.closest('[data-editar-cliente]');
    const borrar = e.target.closest('[data-borrar-cliente]');

    if (editar) formulario(S.datos.clientes.find((c) => c.id === Number(editar.dataset.editarCliente)));

    if (borrar) {
      const c = S.datos.clientes.find((x) => x.id === Number(borrar.dataset.borrarCliente));
      if (c && confirm(`¿Borrar a "${c.nombre}"? Sus ventas quedan en el historial.`)) mutar(bd.borrarCliente(c.id));
    }
  });
}

'use strict';
// Vista Reportes: números del período, ventas por día, más vendidos y últimas ventas
// (desde acá también se anula y se reimprime el comprobante).

import { $ } from '../ui/dom.js';
import { plata, esc, isoLocal } from '../ui/formato.js';
import { avisar } from '../ui/aviso.js';
import { S, bd, mutar } from '../ui/estado.js';

export async function pintar() {
  const hoy = new Date();
  const dias = S.rango === 'hoy' ? 0 : S.rango === 'semana' ? 6 : 29;
  const desde = isoLocal(new Date(hoy.getTime() - dias * 864e5));
  const hasta = isoLocal(hoy);

  const r = await bd.resumen(desde, hasta);
  if (!r.ok) return avisar(r.error, true);
  const d = r.data;

  const diasRango = [];
  for (let i = dias; i >= 0; i--) {
    const f = new Date(hoy.getTime() - i * 864e5);
    diasRango.push({ clave: isoLocal(f), etiqueta: f.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) });
  }
  const maximo = Math.max(1, ...diasRango.map((x) => d.porDia[x.clave] || 0));

  const ultimas = S.datos.ventas
    .filter((v) => isoLocal(new Date(v.fecha)) >= desde)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 12);

  $('#reporte').innerHTML = `
    <div class="kpis">
      <div class="kpi"><span>Vendido</span><strong>${plata(d.total)}</strong></div>
      <div class="kpi"><span>Tickets</span><strong>${d.tickets}</strong></div>
      <div class="kpi"><span>Unidades</span><strong>${d.unidades}</strong></div>
      <div class="kpi"><span>Margen</span><strong>${plata(d.margen)}</strong></div>
    </div>

    <div class="kpis chicos">
      <div class="kpi"><span>Descuentos</span><strong>${plata(d.descuentos)}</strong></div>
      <div class="kpi"><span>Anuladas</span><strong>${d.anuladas}</strong></div>
      <div class="kpi"><span>Ticket promedio</span><strong>${plata(d.tickets ? Math.round(d.total / d.tickets) : 0)}</strong></div>
      <div class="kpi"><span>Efectivo</span><strong>${plata(d.porMedio.Efectivo || 0)}</strong></div>
    </div>

    <p class="titulo-seccion">Ventas por día</p>
    <div class="grafico">${diasRango.map((x) => {
      const valor = d.porDia[x.clave] || 0;
      return `<div class="barra-dia" title="${x.clave}: ${plata(valor)}">
        <i style="height:${Math.round((valor / maximo) * 100)}%"></i>
        <small>${x.etiqueta}</small>
      </div>`;
    }).join('')}</div>

    <div class="dos dos-tablas">
      <div>
        <p class="titulo-seccion">Más vendidos</p>
        <table><tbody>${d.top.map((t) => `<tr>
          <td>${esc(t.nombre)}</td><td class="num">${t.cantidad} u.</td><td class="num">${plata(t.total)}</td>
        </tr>`).join('') || '<tr><td class="vacio">Sin ventas</td></tr>'}</tbody></table>
      </div>
      <div>
        <p class="titulo-seccion">Para reponer</p>
        <table><tbody>${d.faltantes.map((f) => `<tr>
          <td>${esc(f.nombre)}</td>
          <td class="num ${f.stock === 0 ? 'rojo' : ''}">${f.stock === 0 ? 'sin stock' : `quedan ${f.stock}`}</td>
        </tr>`).join('') || '<tr><td class="vacio">Todo en orden</td></tr>'}</tbody></table>
      </div>
    </div>

    <p class="titulo-seccion">Últimas ventas</p>
    <table>
      <thead><tr><th>#</th><th>Hora</th><th>Medio</th><th>Cliente</th><th class="num">Total</th><th></th></tr></thead>
      <tbody>${ultimas.map((v) => `<tr class="${v.anulada ? 'anulada' : ''}">
        <td>${v.id}</td>
        <td>${new Date(v.fecha).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${esc(v.medio)}</td>
        <td>${esc((S.datos.clientes.find((c) => c.id === v.clienteId) || {}).nombre || '—')}</td>
        <td class="num">${plata(v.total)}</td>
        <td><div class="acciones-fila">
          <button class="secundario chico" data-ticket="${v.id}">Comprobante</button>
          ${v.anulada ? '<span class="etiqueta cero">Anulada</span>' : `<button class="secundario chico" data-anular="${v.id}">Anular</button>`}
        </div></td>
      </tr>`).join('') || '<tr><td colspan="6" class="vacio">Sin ventas en el período</td></tr>'}</tbody>
    </table>`;
}

export function montar() {
  $('#rangos').addEventListener('click', (e) => {
    const boton = e.target.closest('button[data-rango]');
    if (!boton) return;

    S.rango = boton.dataset.rango;
    [...document.querySelectorAll('#rangos button')].forEach((b) => b.classList.toggle('activo', b === boton));
    pintar();
  });

  $('#reporte').addEventListener('click', async (e) => {
    const ticket = e.target.closest('[data-ticket]');
    const anular = e.target.closest('[data-anular]');

    if (ticket) bd.verTicket(Number(ticket.dataset.ticket));

    if (anular) {
      const venta = S.datos.ventas.find((v) => v.id === Number(anular.dataset.anular));
      if (!venta) return;
      if (!confirm(`¿Anular la venta #${venta.id} por ${plata(venta.total)}? La mercadería vuelve al stock.`)) return;
      if (await mutar(bd.anular(venta.id, 'Anulación manual'))) avisar(`Venta #${venta.id} anulada`);
    }
  });
}

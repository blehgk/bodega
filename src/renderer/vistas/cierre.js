'use strict';
// Vista Cierre de caja: lo esperado por medio de pago contra el efectivo contado.

import { $ } from '../ui/dom.js';
import { plata, esc, isoLocal, pesosAcentavos } from '../ui/formato.js';
import { avisar } from '../ui/aviso.js';
import { S, bd, mutar } from '../ui/estado.js';

let esperado = 0; // se guarda para recalcular la diferencia sin repintar el panel
let ultimoCierre = null; // el cierre ya guardado de hoy, si lo hay

export async function pintar() {
  const fecha = isoLocal(new Date());
  const r = await bd.cierre(fecha);
  if (!r.ok) return avisar(r.error, true);

  const c = r.data;
  esperado = c.esperado;
  ultimoCierre = c.guardado;

  $('#cierre-fecha').textContent = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  $('#cierre').innerHTML = `
    <div class="kpis">
      <div class="kpi"><span>Vendido hoy</span><strong>${plata(c.total)}</strong></div>
      <div class="kpi"><span>Tickets</span><strong>${c.tickets}</strong></div>
      <div class="kpi"><span>Efectivo esperado</span><strong>${plata(c.esperado)}</strong></div>
      <div class="kpi"><span>Anuladas</span><strong>${c.anuladas}</strong></div>
    </div>

    <div class="dos dos-tablas">
      <div>
        <p class="titulo-seccion">Por medio de pago</p>
        <table><tbody>${Object.entries(c.porMedio).map(([medio, total]) => `<tr>
          <td>${esc(medio)}</td><td class="num">${plata(total)}</td>
        </tr>`).join('') || '<tr><td class="vacio">Sin ventas</td></tr>'}</tbody></table>
      </div>

      <div>
        <p class="titulo-seccion">Cuadre de efectivo</p>
        <div class="cuadre">
          <label for="contado">Efectivo contado ($)</label>
          <input id="contado" type="number" min="0" step="100" placeholder="0" value="${c.guardado ? c.guardado.contado / 100 : ''}">
          <div class="diferencia"></div>
          <button id="guardar-cierre" class="primario">Guardar cierre</button>
          ${c.guardado ? `<p class="pista">Último cierre: ${plata(c.guardado.contado)} (${c.guardado.diferencia === 0 ? 'cuadra' : (c.guardado.diferencia > 0 ? '+' : '') + plata(c.guardado.diferencia)})</p>` : ''}
        </div>
      </div>
    </div>

    <p class="titulo-seccion">Cierres anteriores</p>
    <table>
      <thead><tr><th>Fecha</th><th class="num">Vendido</th><th class="num">Esperado</th><th class="num">Contado</th><th class="num">Diferencia</th></tr></thead>
      <tbody>${[...S.datos.cierres].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 10).map((x) => `<tr>
        <td>${x.fecha}</td>
        <td class="num">${plata(x.total)}</td>
        <td class="num">${plata(x.esperado)}</td>
        <td class="num">${plata(x.contado)}</td>
        <td class="num ${x.diferencia === 0 ? '' : 'rojo'}">${x.diferencia > 0 ? '+' : ''}${plata(x.diferencia)}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="vacio">Sin cierres guardados</td></tr>'}</tbody>
    </table>`;

  $('#contado').addEventListener('input', actualizarDiferencia);
  actualizarDiferencia();

  $('#guardar-cierre').addEventListener('click', async () => {
    const monto = pesosAcentavos($('#contado').value);

    // Volver a cerrar el mismo día reemplaza lo anterior: se avisa antes, no después.
    if (ultimoCierre && !confirm(`El ${fecha} ya tiene un cierre guardado con ${plata(ultimoCierre.contado)} contados.\n\n¿Reemplazarlo por ${plata(monto)}?`)) return;

    if (await mutar(bd.guardarCierre(fecha, monto))) {
      avisar('Cierre guardado');
      pintar();
    }
  });
}

// Se actualiza sin repintar: repintar el panel haría perder el foco del input.
function actualizarDiferencia() {
  const el = $('.diferencia');
  if (!el) return;

  const contado = pesosAcentavos($('#contado').value);
  const diferencia = contado - esperado;

  el.className = `diferencia ${contado === 0 ? '' : diferencia === 0 ? 'ok' : diferencia > 0 ? 'bajo' : 'cero'}`;
  el.textContent = contado === 0
    ? 'Ingresa el efectivo para cuadrar'
    : diferencia === 0
      ? 'Cuadra exacto'
      : diferencia > 0
        ? `Sobran ${plata(diferencia)}`
        : `Faltan ${plata(-diferencia)}`;
}

export function montar() {
  // El panel se repinta entero en cada visita: los listeners se atan en pintar().
}

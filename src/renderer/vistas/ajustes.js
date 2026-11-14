'use strict';
// Vista Ajustes: datos del comercio (salen en el comprobante), exportación y respaldos.

import { $ } from '../ui/dom.js';
import { esc, isoLocal } from '../ui/formato.js';
import { avisar } from '../ui/aviso.js';
import { S, bd, mutar } from '../ui/estado.js';
import { montarSelector } from '../ui/tema.js';

export function pintar() {
  const n = S.datos.negocio || {};

  $('#ajustes').innerHTML = `
    <div class="dos dos-tablas">
      <div>
        <p class="titulo-seccion">Datos del negocio (salen en el comprobante)</p>
        <div class="campos">
          <div class="campo"><label>Nombre</label><input id="n-nombre" maxlength="60" value="${esc(n.nombre)}"></div>
          <div class="doble">
            <div class="campo"><label>RUT</label><input id="n-rut" maxlength="20" placeholder="12.345.678-9" value="${esc(n.rut)}"></div>
            <div class="campo"><label>Teléfono</label><input id="n-telefono" maxlength="30" placeholder="+56 9 1234 5678" value="${esc(n.telefono)}"></div>
          </div>
          <div class="campo"><label>Dirección</label><input id="n-direccion" maxlength="80" value="${esc(n.direccion)}"></div>
          <div class="campo"><label>Pie del comprobante</label><input id="n-pie" maxlength="120" value="${esc(n.pie)}"></div>
          <label class="check">
            <input type="checkbox" id="n-imprimir" ${localStorage.getItem('imprimirAuto') !== '0' ? 'checked' : ''}>
            Abrir el comprobante al cobrar
          </label>
          <button id="guardar-negocio" class="primario">Guardar datos</button>
        </div>
      </div>

      <div>
        <p class="titulo-seccion">Datos y respaldo</p>
        <div class="campos">
          <button class="secundario" data-exportar="ventas">Exportar ventas del mes (CSV)</button>
          <button class="secundario" data-exportar="productos">Exportar productos (CSV)</button>
          <button class="secundario" data-respaldar>Guardar respaldo…</button>
          <button class="secundario" data-restaurar>Restaurar respaldo…</button>
          <p class="pista">Los CSV se abren en Excel. El respaldo es un archivo con todos los datos: guárdalo en un pendrive o en la nube.</p>
          <p class="pista">Los datos viven en esta computadora, sin internet.</p>
        </div>

      </div>
    </div>

    <p class="titulo-seccion">Apariencia</p>
    <div class="campos">
      <div class="campo">
        <label for="selector-tema">Piel de la interfaz</label>
        <select id="selector-tema"></select>
        <p class="pista" id="tema-nota"></p>
      </div>
    </div>`;

  montarSelector();

  $('#guardar-negocio').addEventListener('click', async () => {
    localStorage.setItem('imprimirAuto', $('#n-imprimir').checked ? '1' : '0');
    if (await mutar(bd.negocio({
      nombre: $('#n-nombre').value,
      rut: $('#n-rut').value,
      telefono: $('#n-telefono').value,
      direccion: $('#n-direccion').value,
      pie: $('#n-pie').value,
    }))) avisar('Datos guardados');
  });
}

export function montar() {
  $('#ajustes').addEventListener('click', async (e) => {
    const exportar = e.target.closest('[data-exportar]');

    if (exportar) {
      const hoy = new Date();
      const desde = isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      const r = await bd.exportarCSV(exportar.dataset.exportar, desde, isoLocal(hoy));
      if (r.ok) avisar(`Guardado en ${r.data}`);
      else if (!r.cancelado) avisar(r.error, true);
      return;
    }

    if (e.target.closest('[data-respaldar]')) {
      const r = await bd.respaldarArchivo();
      if (r.ok) avisar(`Respaldo guardado en ${r.data}`);
      else if (!r.cancelado) avisar(r.error, true);
      return;
    }

    if (e.target.closest('[data-restaurar]')) {
      if (!confirm('Restaurar un respaldo reemplaza TODOS los datos actuales. ¿Seguir?')) return;
      const r = await bd.restaurarArchivo();
      if (r.ok) {
        S.datos = r.data;
        S.refrescar();
        avisar('Respaldo restaurado');
      } else if (!r.cancelado) {
        avisar(r.error, true);
      }
    }
  });
}

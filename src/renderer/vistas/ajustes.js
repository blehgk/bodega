'use strict';
// Vista Ajustes: datos del comercio (salen en el comprobante), importación,
// respaldos, apariencia y datos del equipo.

import { $ } from '../ui/dom.js';
import { esc, isoLocal } from '../ui/formato.js';
import { avisar } from '../ui/aviso.js';
import { S, bd, mutar } from '../ui/estado.js';
import { montarSelector } from '../ui/tema.js';

const CLAVE_RESPALDO = 'ultimoRespaldoFuera';

// "nunca" o "hace 3 días": el respaldo automático vive en el mismo disco,
// así que lo que importa es cuándo se sacó una copia fuera del equipo.
function cuandoFueElRespaldo() {
  const iso = localStorage.getItem(CLAVE_RESPALDO);
  if (!iso) return 'nunca';
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

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
        <p class="titulo-seccion">Productos</p>
        <div class="campos">
          <button class="secundario" data-importar>Importar productos desde CSV…</button>
          <p class="pista">El CSV lleva las columnas Producto, Código, Categoría, Costo, Precio, Stock y Stock mínimo. Sirve el que exporta esta misma app.</p>
        </div>

        <p class="titulo-seccion">Datos y respaldo</p>
        <div class="campos">
          <button class="secundario" data-exportar="ventas">Exportar ventas del mes (CSV)</button>
          <button class="secundario" data-exportar="productos">Exportar productos (CSV)</button>
          <button class="secundario" data-respaldar>Guardar respaldo en otro lugar…</button>
          <button class="secundario" data-restaurar>Restaurar respaldo…</button>
          <p class="pista">La app guarda una copia automática por día, pero en el mismo disco. Si el disco muere, se va todo: sacá un respaldo a un pendrive o a la nube de vez en cuando.</p>
          <p class="pista">Último respaldo fuera de este equipo: <strong>${cuandoFueElRespaldo()}</strong></p>
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
    </div>

    <p class="titulo-seccion">Este equipo</p>
    <div class="campos">
      <p class="pista">Bodega <span id="version-texto">—</span> · los datos viven en esta computadora, sin internet.</p>
      <p class="pista" id="ruta-datos"></p>
      <div class="fila">
        <button class="secundario" data-actualizacion>Buscar actualizaciones</button>
        <button class="secundario" data-abrir-carpeta>Abrir la carpeta de datos</button>
        <button class="secundario" data-reiniciar>Empezar de cero…</button>
      </div>
    </div>`;

  montarSelector();

  // La versión y la ruta llegan del proceso principal: se completan sin retrasar el pintado.
  bd.version().then((v) => { if (v.ok) $('#version-texto').textContent = v.data; });
  bd.rutaDatos().then((r) => { if (r.ok) $('#ruta-datos').textContent = r.data; });

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

    if (e.target.closest('[data-importar]')) {
      const r = await bd.importarArchivo();
      if (!r.ok) {
        if (!r.cancelado) avisar(r.error, true);
        return;
      }
      const { importados, errores } = r.data;
      await mutar(bd.estado());
      if (errores.length) {
        const detalle = errores.slice(0, 5).map((x) => `fila ${x.fila}: ${x.motivo}`).join('\n');
        avisar(`${importados} productos importados. ${errores.length} con problemas:\n${detalle}`, true);
      } else {
        avisar(`${importados} productos importados`);
      }
      return;
    }

    if (e.target.closest('[data-respaldar]')) {
      const r = await bd.respaldarArchivo();
      if (r.ok) {
        localStorage.setItem(CLAVE_RESPALDO, new Date().toISOString());
        avisar(`Respaldo guardado en ${r.data}`);
        pintar();
      } else if (!r.cancelado) {
        avisar(r.error, true);
      }
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
      return;
    }

    if (e.target.closest('[data-actualizacion]')) {
      const r = await bd.abrirReleases();
      if (!r.ok) avisar(r.error, true);
      return;
    }

    if (e.target.closest('[data-abrir-carpeta]')) {
      const r = await bd.abrirCarpetaDatos();
      if (!r.ok) avisar(r.error, true);
      return;
    }

    if (e.target.closest('[data-reiniciar]')) {
      if (!confirm('Esto borra productos, ventas, clientes, proveedores y cierres.\n\nLos datos del negocio se mantienen. ¿Seguir?')) return;
      if (!confirm('Última confirmación: no se puede deshacer.\n\n¿Empezar de cero?')) return;
      if (await mutar(bd.reiniciar())) {
        S.carrito = [];
        avisar('Listo, empezaste de cero');
      }
    }
  });
}

'use strict';
// Diálogo de formularios. El cuerpo lo arma cada vista; acá solo se maneja
// el ciclo abrir → validar → guardar → cerrar.

import { $ } from './dom.js';
import { esc } from './formato.js';

// `alGuardar` devuelve true si salió bien; si devuelve false el diálogo queda abierto
// para que el usuario corrija sin perder lo que escribió.
export function abrirModal(titulo, cuerpo, alGuardar, textoBoton = 'Guardar') {
  const dialogo = $('#modal');
  const form = $('#form-modal');

  form.innerHTML = `
    <h2>${esc(titulo)}</h2>
    <div class="campos">${cuerpo}</div>
    <div class="fila">
      <button type="button" class="secundario" data-cerrar>Cancelar</button>
      <button type="submit" class="primario">${esc(textoBoton)}</button>
    </div>`;

  form.querySelector('[data-cerrar]').onclick = () => dialogo.close();
  form.onsubmit = async (evento) => {
    evento.preventDefault();
    if (await alGuardar(new FormData(form), form)) dialogo.close();
  };

  dialogo.showModal();
  form.querySelector('input, select')?.focus();
}

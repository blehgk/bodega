'use strict';
// Avisos efímeros (toast). Uno solo a la vez: el cajero no lee dos mensajes.

import { $ } from './dom.js';

let temporizador = null;

export function avisar(mensaje, error = false) {
  const el = $('#aviso');
  el.textContent = mensaje;
  el.className = `aviso visible${error ? ' error' : ''}`;

  clearTimeout(temporizador);
  temporizador = setTimeout(() => { el.className = 'aviso'; }, 2600);
}

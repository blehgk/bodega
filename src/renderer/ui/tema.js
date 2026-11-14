'use strict';
// Aplica y recuerda la piel elegida. La piel es un CSS que se carga después
// de styles.css y sobreescribe la piel, nunca la estructura.

import { TEMAS, POR_DEFECTO, buscarTema } from '../temas/index.js';

const CLAVE = 'tema';

export function temaActual() {
  const id = localStorage.getItem(CLAVE) || POR_DEFECTO;
  return buscarTema(id).id;
}

export function aplicarTema(id) {
  const tema = buscarTema(id);
  const anterior = document.getElementById('tema-css');
  if (anterior) anterior.remove();

  if (tema.archivo) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = 'tema-css';
    link.href = tema.archivo;
    document.head.appendChild(link);
  }

  document.documentElement.dataset.tema = tema.id;
  localStorage.setItem(CLAVE, tema.id);
}

export function montarSelector() {
  const select = document.getElementById('selector-tema');
  if (!select) return;

  select.innerHTML = TEMAS.map((t) => `<option value="${t.id}">${t.nombre}</option>`).join('');
  select.value = temaActual();

  const nota = document.getElementById('tema-nota');
  const pintarNota = () => {
    if (nota) nota.textContent = buscarTema(select.value).nota;
  };
  pintarNota();

  select.addEventListener('change', () => {
    aplicarTema(select.value);
    pintarNota();
  });
}

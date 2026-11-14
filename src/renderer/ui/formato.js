'use strict';
// Formato y utilidades puras. Sin DOM, sin estado: se pueden probar solas.

// CLP no usa decimales: se guarda en centavos y se muestra redondeado.
export const plata = (centavos) => '$' + Math.round(centavos / 100).toLocaleString('es-CL');

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

// Fecha local en YYYY-MM-DD: el día del comercio, no el de UTC.
export const isoLocal = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

// El usuario escribe pesos; la base guarda centavos.
export const pesosAcentavos = (v) => Math.round(Number(v || 0) * 100);

// "12.345" → 12345 (para comparar montos formateados en las pruebas de UI).
export const num = (texto) => Number(String(texto).replace(/[^\d]/g, '')) || 0;

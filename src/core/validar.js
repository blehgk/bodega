'use strict';
// Validación en el borde de confianza: todo lo que llega del renderer pasa por acá.
// Los mensajes son para el cajero, no para el log: dicen qué campo y qué hacer.

const entero = (valor, campo, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const n = Number(valor);
  if (!Number.isFinite(n)) throw new Error(`${campo}: tiene que ser un número`);
  const redondeado = Math.round(n);
  if (redondeado < min || redondeado > max) throw new Error(`${campo}: fuera de rango`);
  return redondeado;
};

const texto = (valor, campo, max = 80) => {
  const s = String(valor ?? '').trim();
  if (!s) throw new Error(`${campo}: no puede quedar vacío`);
  if (s.length > max) throw new Error(`${campo}: demasiado largo`);
  return s;
};

// Para campos que pueden ir vacíos (teléfono, RUT, dirección).
const opcional = (valor, max = 80) => String(valor ?? '').trim().slice(0, max);

module.exports = { entero, texto, opcional };

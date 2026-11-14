'use strict';
// Manifiesto de pieles. El orden es el que ve el usuario en Ajustes.
// `archivo: null` = la piel base, ya incluida en styles.css.

export const TEMAS = [
  {
    id: 'almanaque',
    nombre: 'Almanaque',
    nota: 'Papel de diario, tinta negra y un solo rojo. La piel original.',
    archivo: null,
  },
  {
    id: 'ios-glass',
    nombre: 'iOS · Liquid Glass',
    nota: 'Capas translúcidas con desenfoque real y bordes de luz. La más moderna del lote.',
    archivo: 'temas/ios-glass.css',
  },
  {
    id: 'ios-clasico',
    nombre: 'iOS · Listas agrupadas',
    nota: 'Fondo gris azulado, tarjetas blancas y separadores de medio píxel.',
    archivo: 'temas/ios-clasico.css',
  },
  {
    id: 'one-ui',
    nombre: 'Samsung · One UI',
    nota: 'Bloques grandes, radios de 26px y acciones al alcance del pulgar.',
    archivo: 'temas/one-ui.css',
  },
  {
    id: 'material',
    nombre: 'Android · Material 3',
    nota: 'Superficies teñidas, botones rellenos y elevación en vez de bordes.',
    archivo: 'temas/material.css',
  },
  {
    id: 'glass',
    nombre: 'Glassmorphism',
    nota: 'Vidrio esmerilado sobre un degradado de color. La más llamativa y la menos legible.',
    archivo: 'temas/glass.css',
  },
  {
    id: 'neumorfismo',
    nombre: 'Neumorfismo',
    nota: 'Todo del mismo material; la forma la da la luz. Elegante y de bajo contraste.',
    archivo: 'temas/neumorfismo.css',
  },
  {
    id: 'fluent',
    nombre: 'Windows · Fluent',
    nota: 'Mica translúcida, radio de 8px y una línea de acento. La más sobria.',
    archivo: 'temas/fluent.css',
  },
  {
    id: 'brutal',
    nombre: 'Neo-brutalismo',
    nota: 'Borde negro de 3px, sombra dura y amarillo. Ruidoso a propósito.',
    archivo: 'temas/brutal.css',
  },
  {
    id: 'terminal',
    nombre: 'Terminal',
    nota: 'Fósforo verde sobre negro, todo monoespaciado. Para quien extraña la consola.',
    archivo: 'temas/terminal.css',
  },
  {
    id: 'tinta',
    nombre: 'Tinta electrónica',
    nota: '1 bit: negro puro sobre blanco, grises de trama y cero animación. Para pantallas e-ink.',
    archivo: 'temas/tinta.css',
  },
  {
    id: 'editorial',
    nombre: 'Editorial',
    nota: 'Serif, reglas finas y aire. La más tranquila para leer números todo el día.',
    archivo: 'temas/editorial.css',
  },
];

export const POR_DEFECTO = 'almanaque';

export const buscarTema = (id) => TEMAS.find((t) => t.id === id) || TEMAS[0];

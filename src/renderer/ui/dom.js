'use strict';
// Azúcar de DOM. Nada más: si algo crece acá, va a su propio módulo.

export const $ = (selector, raiz = document) => raiz.querySelector(selector);

export const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

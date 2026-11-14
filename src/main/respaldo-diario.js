'use strict';
// Respaldo automático: una copia por día en la carpeta de datos, se conservan 7.
// Es la red de seguridad mínima antes de que alguien confíe sus ventas a la app.

const fs = require('node:fs');
const path = require('node:path');

const DIAS = 7;

function respaldarDiario(store, carpetaDatos) {
  const dir = path.join(carpetaDatos, 'respaldos');
  fs.mkdirSync(dir, { recursive: true });

  const destino = path.join(dir, `bodega-${new Date().toISOString().slice(0, 10)}.json`);
  if (fs.existsSync(destino)) return destino; // ya hay uno de hoy

  store.respaldar(destino);
  fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .slice(0, -DIAS)
    .forEach((f) => fs.rmSync(path.join(dir, f), { force: true }));

  return destino;
}

module.exports = { respaldarDiario };

'use strict';
// Persistencia: un JSON local, escritura atómica, archivo roto apartado.
// El resto de los módulos nunca toca el disco: piden `estado()`, mutan y llaman `guardar()`.

const fs = require('node:fs');
const path = require('node:path');
const { estadoVacio, migrar } = require('./esquema');

function leerArchivo(archivo) {
  try {
    return migrar(JSON.parse(fs.readFileSync(archivo, 'utf8')));
  } catch (e) {
    if (e.code === 'ENOENT') return estadoVacio();
    // Nunca pisar datos del comercio: se aparta el archivo roto y se arranca limpio.
    fs.renameSync(archivo, `${archivo}.corrupto-${Date.now()}`);
    return estadoVacio();
  }
}

function crearDb(archivo) {
  let estado = leerArchivo(archivo);

  const guardar = () => {
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    const temporal = `${archivo}.tmp`;
    fs.writeFileSync(temporal, JSON.stringify(estado));
    fs.renameSync(temporal, archivo); // rename atómico: nunca queda un archivo a medias
  };

  return {
    archivo,
    estado: () => estado,
    guardar,

    // Restaurar un respaldo cambia el estado entero; los módulos leen por `estado()`.
    reemplazar: (nuevo) => {
      estado = migrar(nuevo);
      guardar();
    },

    nuevoId: () => estado.proximoId++,

    producto: (id) => {
      const p = estado.productos.find((x) => x.id === id);
      if (!p) throw new Error('Producto inexistente');
      return p;
    },

    // Rango de fechas local (YYYY-MM-DD), inclusive en ambos extremos.
    enRango: (fecha, desde, hasta) => {
      const t = new Date(fecha).getTime();
      return t >= new Date(`${desde}T00:00:00`).getTime() && t <= new Date(`${hasta}T23:59:59.999`).getTime();
    },
  };
}

module.exports = { crearDb };

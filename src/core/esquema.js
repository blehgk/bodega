'use strict';
// Forma del archivo de datos y migraciones entre versiones.
// Subir VERSION obliga a agregar un paso en `migrar` para no perder datos del comercio.

const VERSION = 2;

const negocioVacio = () => ({
  nombre: 'Mi almacén',
  direccion: '',
  telefono: '',
  rut: '',
  pie: '¡Gracias por su compra!',
});

const estadoVacio = () => ({
  version: VERSION,
  proximoId: 1,
  negocio: negocioVacio(),
  productos: [],
  proveedores: [],
  clientes: [],
  ventas: [],
  compras: [],
  movimientos: [],
  esperas: [],
  cierres: [],
});

// v1 → v2: aparecieron clientes, esperas, cierres, descuento y anulación.
function migrar(datos) {
  if (!datos || typeof datos !== 'object') return estadoVacio();
  if (datos.version === VERSION) return datos;
  if (datos.version === 1) {
    return {
      ...estadoVacio(),
      ...datos,
      version: VERSION,
      negocio: datos.negocio || negocioVacio(),
      clientes: datos.clientes || [],
      esperas: [],
      cierres: [],
      ventas: (datos.ventas || []).map((v) => ({
        ...v,
        subtotal: v.subtotal ?? v.total,
        descuento: v.descuento ?? 0,
        anulada: false,
        clienteId: null,
      })),
    };
  }
  // Versión desconocida (más nueva que esta app): se arranca limpio en vez de adivinar.
  return estadoVacio();
}

module.exports = { VERSION, estadoVacio, negocioVacio, migrar };

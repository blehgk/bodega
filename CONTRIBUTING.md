# Contribuir

Gracias por tomarte el tiempo. Este proyecto es chico a propósito: se acepta lo que mejora la caja del almacén, no lo que agranda el producto.

## Antes de escribir código

- Para un cambio de comportamiento, abrí un issue primero. Evita que trabajes en algo que no se va a fusionar.
- Un bug necesita: qué esperabas, qué pasó, y los pasos para reproducirlo.
- Un cambio de diseño necesita una razón de uso, no un gusto.

## Poner el proyecto a andar

```bash
npm install
npm start     # abre la app
npm test      # tests de la capa de datos
```

En Linux sin sandbox configurado: `npx electron . --no-sandbox`.

Para arrancar con datos limpios sin tocar los reales:

```bash
npx electron . --user-data-dir=/tmp/bodega-demo
```

## Dónde va cada cosa

| Si tocás… | Va en… |
|---|---|
| Reglas de negocio (stock, ventas, cierre) | `src/core/` |
| Ventanas, diálogos, canales IPC | `src/main/` |
| Pantallas y componentes | `src/renderer/vistas/` y `src/renderer/ui/` |
| Estilos | `src/renderer/styles.css` (un archivo, por orden) |

Reglas que el proyecto ya sigue y un PR debe respetar:

- **El renderer no toca Node.** Todo pasa por `window.api` (ver `src/preload.js`).
- **El proceso principal no tiene lógica de negocio.** Solo conecta.
- **El dominio no sabe que existe Electron.** Por eso se testea con `node --test`.
- **La plata va en centavos enteros.** Nunca floats.
- **Toda validación ocurre en el proceso principal**, no en la UI.

## Tests

```bash
npm test
```

Cualquier cambio en `src/core/` necesita un test que falle sin el cambio. Los tests no levantan Electron: crean un store sobre un archivo temporal.

Si agregás una función de UI, verificá a mano el flujo completo (venta, espera, anulación, cierre) antes de abrir el PR.

## Commits y PRs

- Mensajes en español, en imperativo: `Agrega descuento por línea`, no `agregado`.
- Un PR, un tema. Si el diff toca tres cosas distintas, son tres PRs.
- Describe **qué cambia para el cajero**, no qué archivos tocaste.
- Si el cambio se ve, adjunta una captura.

## Lo que no se acepta

- Dependencias nuevas para resolver algo que la plataforma ya hace.
- Bundlers, TypeScript o base de datos sin una razón medida.
- Funciones que prometen boleta electrónica del SII sin el trámite detrás: el comprobante es un documento interno y así se declara.

## Licencia

Al contribuir aceptás que tu aporte se publique bajo la licencia MIT del proyecto.

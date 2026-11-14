# Bodega

Gestor de stock y ventas para almacenes y kioscos chilenos. App de escritorio que funciona sin internet y sin servidor: los datos viven en la máquina del comercio. Precios en CLP, sin decimales.

![Caja](docs/caja.png)

## Qué hace

- **Caja** — buscar por nombre o escanear código, carrito, cobro por medio de pago.
- **Productos** — alta y edición, código de barras, costo, precio y stock mínimo.
- **Stock** — alertas de reposición y ajustes con motivo (rotura, vencimiento, conteo).
- **Proveedores** — compras que reponen stock y actualizan el último costo.
- **Reportes** — vendido, tickets, unidades, margen, ventas por día y más vendidos.
- **Demo incluida** — 60 productos de kiosco y 7 días de ventas para que se vea lleno al abrir.

## Capturas

| Productos | Stock |
|---|---|
| ![Productos](docs/productos.png) | ![Stock](docs/stock.png) |

| Proveedores | Reportes |
|---|---|
| ![Proveedores](docs/proveedores.png) | ![Reportes](docs/reportes.png) |

## Correrlo

```bash
npm install
npm start     # abre la app
npm test      # tests de la capa de datos
```

En Linux dentro de un contenedor sin sandbox configurado: `npx electron . --no-sandbox`.

## Cómo se guardan los datos

Un JSON en el directorio de usuario de la app (`~/.config/Bodega/bodega.json` en Linux, `%APPDATA%\Bodega` en Windows):

- Escritura atómica (archivo temporal + rename): nunca queda un archivo a medias.
- Si el archivo está corrupto, se aparta como `bodega.json.corrupto-<fecha>` y la app arranca limpia en lugar de pisarlo.
- Respaldo automático diario, se conservan los últimos 7.
- Los precios se guardan en centavos enteros y se muestran en pesos chilenos sin decimales: las cuentas no arrastran errores de redondeo.
- Las ventas guardan nombre, precio y costo del momento: cambiar un precio no reescribe la historia.

## Stack

Electron + HTML/CSS/JS sin bundler. Sin dependencias nativas, sin base de datos, sin build step. El renderer corre con `contextIsolation`, `sandbox` y `nodeIntegration: false`; toda la escritura pasa por IPC validado en el proceso principal.

## Qué no hace (a propósito)

Boleta electrónica del SII, multi-usuario, sincronización en la nube, lector de código de barras físico, impresora de boletas. Empaquetado `.exe`: pendiente.

## Licencia

MIT — ver [LICENSE](LICENSE).

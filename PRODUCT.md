# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Electron 45 + HTML/CSS/JS con ES modules nativos. Sin bundler, sin TypeScript, sin base de datos: JSON local con escritura atómica. Empaquetado con electron-builder (NSIS para Windows, AppImage para Linux).

## Users

Dueño o cajero de un almacén o kiosco de barrio chileno. Una sola PC en el mostrador, muchas veces un monitor TN de 1366×768 bajo luz fluorescente, con el cliente esperando del otro lado. Lo usa todo el día, de pie, con una mano en el escáner y la otra en el teclado. No tiene conocimientos técnicos y no va a configurar nada.

## Product Purpose

Reemplazar el cuaderno y la planilla por una caja que registre la venta, descuente stock y cierre el día con el efectivo cuadrado. Éxito = el dueño abre la app sin ayuda, vende, y al final del día sabe cuánto vendió, cuánto ganó y qué le falta reponer.

## Positioning

Funciona sin internet, sin servidor y sin instalador de base de datos: se abre en dos segundos en la PC del mostrador. Ninguno de los POS open source relevados (1.008 repos) ofrece eso junto con reportes de margen y cierre de caja.

## Operating Context

- Venta rápida en el mostrador, con cliente presente: la latencia se nota.
- Escáner de código de barras que emula teclado (termina en Enter).
- Impresora térmica de 58/80 mm instalada como impresora del sistema.
- Cierre de caja al final del día, comparando el efectivo contado contra lo vendido.
- El dueño revisa números, no configura software.
- Boleta electrónica del SII fuera de alcance: el comprobante es un documento interno, no tributario.

## Capabilities and Constraints

Caja (buscar/escanear, carrito, descuento, cliente, medio de pago), ventas en espera, anulación con devolución de stock, comprobante imprimible, productos con stock mínimo, ajustes con motivo, proveedores y compras, clientes, reportes por rango, cierre de caja, CSV y respaldos.

Restricciones: offline total; datos en un JSON local; precios en centavos enteros; CLP sin decimales; español de Chile; una sola caja (sin LAN ni multiusuario).

## Brand Commitments

Nombre del producto: **Bodega**. El nombre del comercio encabeza la app: la herramienta es del almacén, no nuestra. Sin gamificación, sin hype, sin emojis.

## Evidence on Hand

60 productos de almacén chileno y 7 días de ventas como datos demo deterministas (semilla fija). Capturas reales en `docs/`. Sin clientes reales, sin testimonios, sin métricas de uso: nada de eso puede fabricarse.

## Product Principles

1. La venta manda: cualquier cosa que agregue pasos entre el cliente y el cobro está mal.
2. El teclado es el instrumento principal; el mouse es el respaldo.
3. Los números del dueño (margen, faltantes, cierre) se ven sin buscar en menús.
4. Nada se pierde: cada cambio de stock deja rastro y todo se puede respaldar.
5. Si no se puede explicar en una pantalla, no va.

## Accessibility & Inclusion

Contraste mínimo AA sobre superficies oscuras o claras según la escena; texto funcional nunca por debajo de 11px; foco visible en todo control; nada depende solo del color para indicar estado.

# Changelog

Todas las versiones publicadas de Bodega. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [0.3.1] — 2026-11-14

### Agregado

- Adaptación a cualquier tamaño de ventana: de 880×560 a monitores grandes. El ticket cede ancho antes que la grilla, y en ventanas angostas la venta pasa abajo.
- CI en GitHub Actions (Node 20 y 22), plantillas de issue y de pull request, changelog y guía de contribución.

### Corregido

- La fila incompleta de la grilla dejaba ver el fondo negro entre celdas.
- El texto funcional por debajo de 11px en etiquetas, badges y encabezados de tabla.

## [0.3.0] — 2026-11-13

Rediseño completo de la interfaz.

### Cambiado

- **Nueva dirección visual**: la app toma el almanaque de pared del almacén. Papel de diario, tinta negra y un solo rojo para lo que hay que mirar. Sin tarjetas, sin sombras, sin esquinas redondeadas.
- La navegación pasa de barra lateral a cabecera con pestañas; el nombre del comercio, la fecha y el día en curso quedan siempre a la vista.
- La grilla de productos son celdas de calendario: el número de cada celda es su stock, en rojo cuando llegó al mínimo.
- Reportes y cierre se leen como una hoja de números, no como tarjetas de métricas.
- Tipografía condensada para rótulos y monoespaciada para todo número.

### Agregado

- Adaptación a cualquier tamaño de ventana: de 880×560 a monitores grandes. El ticket cede ancho antes que la grilla, y en ventanas angostas la venta pasa abajo.
- Todo el texto funcional en un piso de 11px.

## [0.2.1] — 2026-11-13

### Cambiado

- Refactor completo en módulos: `main/` (ventanas, IPC, archivos), `core/` (dominio sin Electron) y `renderer/` (vistas con ES modules nativos).
- Barra de atajos visible en la caja y foco automático en el buscador después de cada venta.
- Icono propio de la aplicación.

## [0.2.0] — 2026-11-13

### Agregado

- Descuento en la venta y ventas en espera.
- Comprobante imprimible de 58/80 mm con los datos del negocio.
- Anulación de ventas con devolución de stock.
- Cierre de caja con cuadre de efectivo.
- Clientes con historial de compras.
- Exportación a CSV y respaldo/restauración desde Ajustes.
- Migración automática de datos v1 → v2.

## [0.1.0] — 2026-11-13

### Agregado

- Caja con búsqueda, carrito y cobro por medio de pago.
- Productos con código de barras, costo, precio y stock mínimo.
- Stock con alertas de reposición y ajustes con motivo.
- Proveedores y compras.
- Reportes por rango de fechas.
- Datos demo: 60 productos de almacén chileno y 7 días de ventas.

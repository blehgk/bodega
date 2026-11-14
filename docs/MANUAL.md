# Manual de Bodega

Para quien atiende el almacén. No hace falta saber de computación.

---

## 1. Instalar

1. Descargá `Bodega Setup X.X.X.exe` desde la página de descargas.
2. Doble clic y seguí el asistente. Si Windows muestra **"Windows protegió tu PC"**, tocá
   *Más información* → *Ejecutar de todas formas*. La app todavía no tiene firma digital
   (cuesta plata al año), así que Windows desconfía la primera vez.
3. Al terminar queda el ícono **Bodega** en el escritorio.

Funciona sin internet. No manda nada a ningún lado.

## 2. La primera vez

Al abrir por primera vez te pregunta cómo empezar:

- **Empezar vacío** — para tu almacén de verdad. No hay productos ni ventas.
- **Ver con datos de ejemplo** — 60 productos y ventas inventadas, para probar sin cargar nada.

Si elegiste el ejemplo y después querés tu almacén real: **Ajustes → Empezar de cero**.
Borra los productos, las ventas y los clientes de prueba, y deja los datos de tu negocio.

## 3. Cargar los productos

**De a uno:** Productos → *Nuevo producto*. Nombre, precio y stock son obligatorios.
El código de barras es opcional, pero si lo ponés, el escáner lo va a encontrar al instante.

**Muchos de una vez:** Ajustes → *Importar productos desde CSV*. El archivo tiene que tener
estas columnas (el orden no importa):

```
Producto;Código;Categoría;Costo;Precio;Stock;Stock mínimo
Pan marraqueta;7801234567890;Panadería;120;250;40;10
Coca-Cola 1.5L;7801610001234;Bebidas;1100;1900;24;6
```

Los precios van en pesos, sin puntos ni decimales. Si una fila tiene un error, la app te dice
en qué línea y no importa el resto a medias: las buenas entran, las malas no.

Un dato: **no puede haber dos productos con el mismo código de barras**. Si lo intentás, la
app te avisa cuál es el otro.

## 4. Vender

1. Escaneá el código o escribí parte del nombre. Se filtra solo.
2. Hacé clic en el producto (o Enter si es el primero de la lista).
3. Ajustá la cantidad con los botones `+` y `−`.
4. Elegí el medio de pago y tocá **Cobrar**.

Se abre el comprobante para imprimir. Si no querés que se abra solo, desmarcá
*Abrir el comprobante al cobrar* en Ajustes.

**Atajos de teclado** (el cajero no suelta el escáner):

| Tecla | Qué hace |
|---|---|
| `Enter` | Agrega el código escaneado o el primer resultado |
| `F1` | Vuelve a la caja y pone el cursor en el buscador |
| `F2` | Cobrar |
| `F3` | Dejar la venta en espera |
| `F4` | Ver las ventas en espera |
| `Esc` | Vaciar el carrito |

**Si el cliente vuelve después:** F3 deja el carrito guardado. F4 lo recupera cuando vuelve.

**Si te equivocaste:** Reportes → buscá la venta → *Anular*. La mercadería vuelve al stock y
la venta queda marcada como anulada, no se borra.

## 5. Cerrar la caja

Cierre → contá el efectivo y escribilo. La app te muestra la diferencia contra lo que debería
haber. Si ya cerraste ese día y volvés a guardar, te pregunta antes de reemplazar.

## 6. Los respaldos (leelo aunque sea lo único que leas)

La app guarda una copia automática por día, **pero en el mismo disco**. Si el disco se muere,
se va la app y se van las copias.

**Una vez por semana:** Ajustes → *Guardar respaldo en otro lugar…* y elegí un pendrive o una
carpeta de la nube. Ajustes te dice cuándo fue el último respaldo que sacaste fuera del equipo.

Para volver atrás: Ajustes → *Restaurar respaldo…* y elegí el archivo. Reemplaza todo.

## 7. Cambiar la cara de la app

Ajustes → *Piel de la interfaz*. Hay doce. La app se acuerda de la que elegiste en esta
computadora. Ninguna cambia los datos ni el funcionamiento: es solo la ropa.

## 8. Si algo sale mal

- **La app no abre:** reiniciá la computadora. Si sigue, abrí Ajustes → *Abrir la carpeta de
  datos* desde otra máquina y guardá el archivo `bodega.json`: ahí están todas tus ventas.
- **Se ve raro o no responde:** cerrá y volvé a abrir. Los datos se guardan en cada venta.
- **Querés reportar un problema:** Ajustes → *Abrir la carpeta de datos* y mandá el archivo
  `errores.log` junto con la versión que aparece en esa misma pantalla.

## Lo que la app no hace

- **No emite boleta electrónica del SII.** El papel que imprime dice "Documento no tributario".
  Si tu almacén está formalizado y necesita boleta, esta app no te sirve sola.
- No funciona en varias computadoras a la vez ni sincroniza entre ellas.
- No tiene usuarios ni contraseñas: cualquiera que abra la computadora ve todo.

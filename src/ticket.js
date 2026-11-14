'use strict';
// Comprobante de venta para impresora térmica (58/80 mm). No es boleta del SII:
// es un comprobante interno, y así se declara en el papel.

const plata = (c) => '$' + Math.round(c / 100).toLocaleString('es-CL');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function htmlTicket(venta, negocio = {}, cliente = null, { ancho = 58 } = {}) {
  const f = new Date(venta.fecha);
  const fecha = f.toLocaleDateString('es-CL');
  const hora = f.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  const lineas = venta.items.map((it) => `
      <tr>
        <td class="cant">${it.cantidad}×</td>
        <td class="nom">${esc(it.nombre)}</td>
        <td class="imp">${plata(it.precio * it.cantidad)}</td>
      </tr>`).join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Comprobante #${venta.id}</title>
<style>
  @page { size: ${ancho}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    width: ${ancho}mm; margin: 0 auto; padding: 4mm 3mm;
    font: 11px/1.35 "DejaVu Sans Mono", ui-monospace, monospace; color: #000; background: #fff;
  }
  .barra { display: flex; gap: 6px; justify-content: center; margin-bottom: 8px; }
  .barra button { font: 12px system-ui; padding: 6px 14px; border-radius: 6px; border: 1px solid #999; background: #eee; cursor: pointer; }
  h1 { font-size: 14px; text-align: center; margin: 0 0 2px; letter-spacing: 0.5px; }
  .centro { text-align: center; }
  .tenue { color: #444; font-size: 10px; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 1px 0; }
  .cant { width: 22px; }
  .nom { word-break: break-word; }
  .imp { text-align: right; white-space: nowrap; padding-left: 6px; }
  .totales td { padding: 1px 0; }
  .totales .et { text-align: right; padding-right: 6px; }
  .totales .vl { text-align: right; white-space: nowrap; }
  .total { font-size: 15px; font-weight: bold; border-top: 1px solid #000; padding-top: 3px; }
  @media print { .barra { display: none; } body { padding: 0 2mm; } }
</style>
</head>
<body>
  <div class="barra"><button onclick="window.print()">Imprimir</button></div>

  <h1>${esc(negocio.nombre || 'Almacén')}</h1>
  ${negocio.rut ? `<div class="centro tenue">RUT ${esc(negocio.rut)}</div>` : ''}
  ${negocio.direccion ? `<div class="centro tenue">${esc(negocio.direccion)}</div>` : ''}
  ${negocio.telefono ? `<div class="centro tenue">Tel. ${esc(negocio.telefono)}</div>` : ''}

  <hr>
  <div class="centro"><strong>COMPROBANTE DE VENTA</strong></div>
  <div class="centro">N° ${venta.id}</div>
  <div>${fecha} ${hora}</div>
  <div>Cliente: ${esc(cliente ? cliente.nombre : 'Consumidor final')}</div>
  <div class="tenue">Documento no tributario</div>
  <hr>

  <table>${lineas}</table>

  <hr>
  <table class="totales">
    ${venta.descuento ? `<tr><td class="et">Subtotal</td><td class="vl">${plata(venta.subtotal ?? venta.total + venta.descuento)}</td></tr>
    <tr><td class="et">Descuento</td><td class="vl">-${plata(venta.descuento)}</td></tr>` : ''}
    <tr><td class="et total">TOTAL</td><td class="vl total">${plata(venta.total)}</td></tr>
  </table>
  <div>Pago: ${esc(venta.medio)}</div>

  <hr>
  <div class="centro">${esc(negocio.pie || '¡Gracias por su compra!')}</div>
</body>
</html>`;
}

module.exports = { htmlTicket, plata };

'use strict';
// Vista Caja: buscar, armar el carrito, cobrar, dejar en espera.
// Es la pantalla que el cajero usa todo el día: teclado primero, mouse después.

import { $, $$ } from '../ui/dom.js';
import { plata, esc, pesosAcentavos } from '../ui/formato.js';
import { avisar } from '../ui/aviso.js';
import { abrirModal } from '../ui/modal.js';
import { S, bd, mutar } from '../ui/estado.js';

/* ---------- cálculo ---------- */

const productoDe = (id) => S.datos.productos.find((p) => p.id === id);

const subtotal = () => S.carrito.reduce((s, l) => {
  const p = productoDe(l.productoId);
  return s + (p ? p.precio * l.cantidad : 0);
}, 0);

const descuento = () => Math.min(pesosAcentavos($('#descuento').value), subtotal());

/* ---------- pintado ---------- */

export function pintar() {
  pintarSelectorCliente();
  const lista = visibles().slice(0, 60);

  $('#grilla').innerHTML = lista.length
    ? lista.map((p) => `
      <button class="producto${p.stock ? '' : ' agotado'}" data-id="${p.id}" ${p.stock ? '' : 'disabled'}>
        <span class="c">${esc(p.categoria)}</span>
        <span class="n">${esc(p.nombre)}</span>
        <span class="p">${plata(p.precio)}</span>
        <span class="s">${p.stock} en stock</span>
      </button>`).join('')
    : `<div class="vacio-panel">
         <p>Sin resultados para “${esc(S.filtro)}”</p>
         <button class="secundario chico" data-limpiar-busqueda>Ver todo</button>
       </div>`;

  pintarCarrito();

  const enEspera = S.datos.esperas.length;
  const boton = $('#btn-esperas');
  boton.hidden = !enEspera;
  boton.textContent = `En espera (${enEspera})`;
}

// El cliente se elige una vez por venta; "Consumidor final" es el caso normal.
function pintarSelectorCliente() {
  const select = $('#cliente');
  const actual = select.value;
  select.innerHTML = '<option value="">Consumidor final</option>' +
    S.datos.clientes.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
  select.value = actual;
}

function visibles() {
  const f = S.filtro.trim().toLowerCase();
  return S.datos.productos
    .filter((p) => !f || p.nombre.toLowerCase().includes(f) || (p.codigo || '').includes(f))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CL'));
}

export function pintarCarrito() {
  const filas = S.carrito.map((linea) => {
    const p = productoDe(linea.productoId);
    if (!p) return '';
    return `<div class="linea">
      <span class="nom">${esc(p.nombre)}</span>
      <span class="sub">${plata(p.precio * linea.cantidad)}</span>
      <span class="ctrl">
        <button data-acc="menos" data-id="${p.id}" aria-label="Restar">−</button>
        <span>${linea.cantidad}</span>
        <button data-acc="mas" data-id="${p.id}" aria-label="Sumar">+</button>
        <button class="quitar" data-acc="quitar" data-id="${p.id}">Quitar</button>
      </span>
    </div>`;
  }).join('');

  $('#carrito').innerHTML = filas || '<p class="vacio">Toca un producto para agregarlo</p>';

  const bruto = subtotal();
  const desc = descuento();

  $('#subtotal-fila').hidden = !desc;
  $('#subtotal').textContent = plata(bruto);
  $('#descuento-fila').hidden = !desc;
  $('#descuento-monto').textContent = '-' + plata(desc);
  $('#total').textContent = plata(bruto - desc);

  $('#cobrar').disabled = !S.carrito.length;
  $('#esperar').disabled = !S.carrito.length;
  $('#limpiar').disabled = !S.carrito.length;
}

/* ---------- acciones ---------- */

export function agregar(productoId) {
  const p = productoDe(productoId);
  if (!p) return;

  const linea = S.carrito.find((l) => l.productoId === productoId);
  const cantidad = (linea?.cantidad || 0) + 1;
  if (cantidad > p.stock) return avisar(`Solo quedan ${p.stock} de ${p.nombre}`, true);

  if (linea) linea.cantidad = cantidad;
  else S.carrito.push({ productoId, cantidad: 1 });

  pintarCarrito();
}

export function limpiarCarrito() {
  S.carrito = [];
  $('#descuento').value = '0';
  $('#cliente').value = '';
  pintarCarrito();
}

export function enfocarBuscador() {
  const input = $('#buscar');
  input.focus();
  input.select();
}

export async function cobrar() {
  if (!S.carrito.length) return;

  const opciones = {
    descuento: descuento(),
    clienteId: Number($('#cliente').value) || null,
  };
  const total = subtotal() - opciones.descuento;

  if (!(await mutar(bd.vender(S.carrito.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })), $('#medio').value, opciones)))) return;

  const venta = S.datos.ventas[S.datos.ventas.length - 1];
  limpiarCarrito();
  avisar(`Venta #${venta.id} cobrada: ${plata(total)}`);

  // El cajero ya está escaneando el próximo producto.
  enfocarBuscador();
  if (localStorage.getItem('imprimirAuto') !== '0') bd.verTicket(venta.id);
}

export async function dejarEnEspera() {
  if (!S.carrito.length) return;

  const opciones = { descuento: descuento(), clienteId: Number($('#cliente').value) || null };
  const items = S.carrito.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad }));

  if (await mutar(bd.esperar(items, opciones))) {
    limpiarCarrito();
    avisar('Venta dejada en espera');
    enfocarBuscador();
  }
}

export function verEsperas() {
  const cuerpo = S.datos.esperas.length
    ? `<div class="esperas">${S.datos.esperas.map((e) => {
      const total = e.items.reduce((s, it) => {
        const p = productoDe(it.productoId);
        return s + (p ? p.precio * it.cantidad : 0);
      }, 0) - (e.descuento || 0);
      const cliente = S.datos.clientes.find((c) => c.id === e.clienteId);
      return `<div class="linea">
        <span class="nom">${e.items.length} producto(s) · ${cliente ? esc(cliente.nombre) : 'Consumidor final'}</span>
        <span class="sub">${plata(total)}</span>
        <span class="ctrl">
          <span class="pista">${new Date(e.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
          <button type="button" class="secundario chico" data-recuperar="${e.id}">Recuperar</button>
          <button type="button" class="quitar" data-descartar="${e.id}">Descartar</button>
        </span>
      </div>`;
    }).join('')}</div>`
    : '<p class="vacio">No hay ventas en espera</p>';

  abrirModal('Ventas en espera', cuerpo, async () => true, 'Cerrar');

  $$('[data-recuperar]').forEach((boton) => {
    boton.onclick = async () => {
      const r = await bd.recuperarEspera(Number(boton.dataset.recuperar));
      if (!r.ok) return avisar(r.error, true);

      S.datos = r.data;
      S.carrito = r.espera.items;
      $('#descuento').value = String((r.espera.descuento || 0) / 100);
      $('#cliente').value = r.espera.clienteId || '';
      $('#modal').close();
      pintar();
      avisar('Venta recuperada');
    };
  });

  $$('[data-descartar]').forEach((boton) => {
    boton.onclick = async () => {
      await mutar(bd.borrarEspera(Number(boton.dataset.descartar)));
      $('#modal').close();
    };
  });
}

/* ---------- eventos ---------- */

export function montar() {
  $('#buscar').addEventListener('input', (e) => {
    S.filtro = e.target.value;
    pintar();
  });

  // Enter con un código escaneado agrega directo; si no, agrega el primer resultado.
  $('#buscar').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const texto = e.target.value.trim();
    if (!texto) return;

    const exacto = S.datos.productos.find((p) => p.codigo && p.codigo === texto);
    const objetivo = exacto || visibles()[0];
    if (objetivo) {
      agregar(objetivo.id);
      e.target.select();
    }
  });

  $('#grilla').addEventListener('click', (e) => {
    if (e.target.closest('[data-limpiar-busqueda]')) {
      S.filtro = '';
      $('#buscar').value = '';
      return pintar();
    }
    const boton = e.target.closest('button[data-id]');
    if (boton) agregar(Number(boton.dataset.id));
  });

  $('#carrito').addEventListener('click', (e) => {
    const boton = e.target.closest('button[data-acc]');
    if (!boton) return;

    const id = Number(boton.dataset.id);
    const i = S.carrito.findIndex((l) => l.productoId === id);
    if (i < 0) return;

    if (boton.dataset.acc === 'quitar') S.carrito.splice(i, 1);
    if (boton.dataset.acc === 'mas') return agregar(id);
    if (boton.dataset.acc === 'menos') {
      S.carrito[i].cantidad -= 1;
      if (S.carrito[i].cantidad <= 0) S.carrito.splice(i, 1);
    }
    pintarCarrito();
  });

  $('#descuento').addEventListener('input', pintarCarrito);
  $('#cobrar').addEventListener('click', cobrar);
  $('#esperar').addEventListener('click', dejarEnEspera);
  $('#btn-esperas').addEventListener('click', verEsperas);
  $('#limpiar').addEventListener('click', () => { limpiarCarrito(); enfocarBuscador(); });
}

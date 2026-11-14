'use strict';
const bd = window.api;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
// CLP no usa decimales: se guarda en centavos y se muestra redondeado.
const plata = (c) => '$' + Math.round(c / 100).toLocaleString('es-CL');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isoLocal = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

let st = { productos: [], proveedores: [], ventas: [], compras: [], movimientos: [] };
let carrito = [];
let tab = 'caja';
let filtro = '';
let filtroProd = '';
let rango = 'semana';

/* ---------------- infra ---------------- */
let temporizador;
function avisar(msg, error = false) {
  const el = $('#aviso');
  el.textContent = msg;
  el.className = `aviso visible${error ? ' error' : ''}`;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { el.className = 'aviso'; }, 2600);
}

async function mutar(promesa) {
  const r = await promesa;
  if (!r.ok) { avisar(r.error, true); return false; }
  st = r.data;
  pintar();
  return true;
}

function abrirModal(titulo, cuerpo, alGuardar) {
  const dlg = $('#modal');
  const form = $('#form-modal');
  form.innerHTML = `<h2>${esc(titulo)}</h2><div class="campos">${cuerpo}</div>
    <div class="fila"><button type="button" class="secundario" data-cerrar>Cancelar</button><button type="submit" class="primario">Guardar</button></div>`;
  form.querySelector('[data-cerrar]').onclick = () => dlg.close();
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (await alGuardar(new FormData(form), form)) dlg.close();
  };
  dlg.showModal();
  form.querySelector('input, select')?.focus();
}

/* ---------------- pintado ---------------- */
function pintar() {
  pintarPie();
  if (tab === 'caja') pintarCaja();
  if (tab === 'productos') pintarProductos();
  if (tab === 'stock') pintarStock();
  if (tab === 'proveedores') pintarProveedores();
  if (tab === 'reportes') pintarReportes();
}

function pintarPie() {
  const hoy = isoLocal(new Date());
  const total = st.ventas.filter((v) => isoLocal(new Date(v.fecha)) === hoy).reduce((s, v) => s + v.total, 0);
  const faltan = st.productos.filter((p) => p.stock <= p.stockMinimo).length;
  $('#pie').innerHTML = `Vendido hoy<br><b>${plata(total)}</b><br>${faltan} producto${faltan === 1 ? '' : 's'} por reponer`;
}

function cambiarTab(nuevo) {
  tab = nuevo;
  $$('#tabs button').forEach((b) => b.classList.toggle('activo', b.dataset.tab === nuevo));
  $$('.vista').forEach((v) => v.classList.toggle('activa', v.id === `vista-${nuevo}`));
  pintar();
}

/* ---------------- caja ---------------- */
function visibles() {
  const f = filtro.trim().toLowerCase();
  return st.productos
    .filter((p) => !f || p.nombre.toLowerCase().includes(f) || (p.codigo || '').includes(f))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CL'));
}

function pintarCaja() {
  const lista = visibles().slice(0, 60);
  $('#grilla').innerHTML = lista.length
    ? lista.map((p) => `<button class="producto${p.stock ? '' : ' agotado'}" data-id="${p.id}" ${p.stock ? '' : 'disabled'}>
        <span class="c">${esc(p.categoria)}</span>
        <span class="n">${esc(p.nombre)}</span>
        <span class="p">${plata(p.precio)}</span>
        <span class="s">${p.stock} en stock</span>
      </button>`).join('')
    : '<p class="vacio">Sin resultados</p>';
  pintarCarrito();
}

function pintarCarrito() {
  const filas = carrito.map((l) => {
    const p = st.productos.find((x) => x.id === l.productoId);
    if (!p) return '';
    return `<div class="linea">
      <span class="nom">${esc(p.nombre)}</span>
      <span class="sub">${plata(p.precio * l.cantidad)}</span>
      <span class="ctrl">
        <button data-acc="menos" data-id="${p.id}" aria-label="Restar">−</button>
        <span>${l.cantidad}</span>
        <button data-acc="mas" data-id="${p.id}" aria-label="Sumar">+</button>
        <button class="quitar" data-acc="quitar" data-id="${p.id}">Quitar</button>
      </span>
    </div>`;
  }).join('');
  $('#carrito').innerHTML = filas || '<p class="vacio">Toca un producto para agregarlo</p>';
  const total = carrito.reduce((s, l) => {
    const p = st.productos.find((x) => x.id === l.productoId);
    return s + (p ? p.precio * l.cantidad : 0);
  }, 0);
  $('#total').textContent = plata(total);
  $('#cobrar').disabled = !carrito.length;
}

function agregar(productoId) {
  const p = st.productos.find((x) => x.id === productoId);
  if (!p) return;
  const linea = carrito.find((l) => l.productoId === productoId);
  const cantidad = (linea?.cantidad || 0) + 1;
  if (cantidad > p.stock) return avisar(`Solo quedan ${p.stock} de ${p.nombre}`, true);
  if (linea) linea.cantidad = cantidad;
  else carrito.push({ productoId, cantidad: 1 });
  pintarCarrito();
}

async function cobrar() {
  const medio = $('#medio').value;
  const items = carrito.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad }));
  const total = carrito.reduce((s, l) => s + st.productos.find((x) => x.id === l.productoId).precio * l.cantidad, 0);
  if (await mutar(bd.vender(items, medio))) {
    carrito = [];
    pintarCarrito();
    avisar(`Venta cobrada: ${plata(total)}`);
  }
}

/* ---------------- productos ---------------- */
function pintarProductos() {
  const f = filtroProd.trim().toLowerCase();
  const lista = st.productos
    .filter((p) => !f || p.nombre.toLowerCase().includes(f) || (p.codigo || '').includes(f) || p.categoria.toLowerCase().includes(f))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CL'));
  $('#tabla-productos').innerHTML = `<table>
    <thead><tr><th>Producto</th><th>Código</th><th>Categoría</th><th class="num">Costo</th><th class="num">Precio</th><th class="num">Stock</th><th></th></tr></thead>
    <tbody>${lista.map((p) => `<tr>
      <td>${esc(p.nombre)}</td>
      <td class="num">${esc(p.codigo || '—')}</td>
      <td>${esc(p.categoria)}</td>
      <td class="num">${plata(p.costo)}</td>
      <td class="num">${plata(p.precio)}</td>
      <td class="num">${p.stock}</td>
      <td><div class="acciones-fila">
        <button class="secundario chico" data-editar="${p.id}">Editar</button>
        <button class="secundario chico" data-borrar="${p.id}">Borrar</button>
      </div></td>
    </tr>`).join('')}</tbody></table>`;
}

function formProducto(p = {}) {
  const pesos = (c) => (c ? c / 100 : '');
  abrirModal(p.id ? 'Editar producto' : 'Nuevo producto', `
    <div class="campo"><label>Nombre</label><input name="nombre" required maxlength="80" value="${esc(p.nombre)}"></div>
    <div class="doble">
      <div class="campo"><label>Código de barras</label><input name="codigo" maxlength="40" value="${esc(p.codigo)}"></div>
      <div class="campo"><label>Categoría</label><input name="categoria" maxlength="40" value="${esc(p.categoria || 'General')}"></div>
    </div>
    <div class="doble">
      <div class="campo"><label>Costo ($)</label><input name="costo" type="number" step="0.01" min="0" required value="${pesos(p.costo)}"></div>
      <div class="campo"><label>Precio de venta ($)</label><input name="precio" type="number" step="0.01" min="0" required value="${pesos(p.precio)}"></div>
    </div>
    <div class="doble">
      <div class="campo"><label>Stock</label><input name="stock" type="number" min="0" required value="${p.stock ?? 0}"></div>
      <div class="campo"><label>Stock mínimo</label><input name="stockMinimo" type="number" min="0" value="${p.stockMinimo ?? 0}"></div>
    </div>`, (fd) => mutar(bd.producto({
    id: p.id,
    nombre: fd.get('nombre'),
    codigo: fd.get('codigo'),
    categoria: fd.get('categoria'),
    costo: Math.round(Number(fd.get('costo')) * 100),
    precio: Math.round(Number(fd.get('precio')) * 100),
    stock: Number(fd.get('stock')),
    stockMinimo: Number(fd.get('stockMinimo') || 0),
  })));
}

/* ---------------- stock ---------------- */
function pintarStock() {
  const lista = [...st.productos].sort((a, b) => a.stock - b.stock || a.nombre.localeCompare(b.nombre, 'es-CL'));
  $('#tabla-stock').innerHTML = `<table>
    <thead><tr><th>Producto</th><th>Categoría</th><th class="num">Stock</th><th class="num">Mínimo</th><th>Estado</th><th></th></tr></thead>
    <tbody>${lista.map((p) => {
      const estado = p.stock === 0 ? '<span class="etiqueta cero">Sin stock</span>'
        : p.stock <= p.stockMinimo ? '<span class="etiqueta bajo">Reponer</span>'
          : '<span class="etiqueta ok">OK</span>';
      return `<tr>
        <td>${esc(p.nombre)}</td>
        <td>${esc(p.categoria)}</td>
        <td class="num">${p.stock}</td>
        <td class="num">${p.stockMinimo}</td>
        <td>${estado}</td>
        <td><div class="acciones-fila"><button class="secundario chico" data-ajustar="${p.id}">Ajustar</button></div></td>
      </tr>`;
    }).join('')}</tbody></table>`;
}

function formAjuste(p) {
  abrirModal(`Ajustar stock · ${p.nombre}`, `
    <p class="pista">Stock actual: ${p.stock}. Usa números negativos para descontar (rotura, vencimiento, robo).</p>
    <div class="doble">
      <div class="campo"><label>Cantidad</label><input name="cantidad" type="number" required value="1"></div>
      <div class="campo"><label>Motivo</label><input name="motivo" maxlength="80" value="Ajuste manual"></div>
    </div>`, (fd) => mutar(bd.ajustar(p.id, Number(fd.get('cantidad')), fd.get('motivo'))));
}

/* ---------------- proveedores ---------------- */
function pintarProveedores() {
  const comprasDe = (id) => st.compras.filter((c) => c.proveedorId === id);
  $('#lista-proveedores').innerHTML = `<table>
    <thead><tr><th>Proveedor</th><th>Teléfono</th><th class="num">Compras</th><th></th></tr></thead>
    <tbody>${st.proveedores.map((p) => `<tr>
      <td>${esc(p.nombre)}</td>
      <td>${esc(p.telefono || '—')}</td>
      <td class="num">${comprasDe(p.id).length}</td>
      <td><div class="acciones-fila"><button class="secundario chico" data-compra="${p.id}">Compra</button></div></td>
    </tr>`).join('')}</tbody></table>`;

  const ultimas = [...st.compras].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);
  $('#compras').innerHTML = `<table>
    <thead><tr><th>Últimas compras</th><th class="num">Total</th></tr></thead>
    <tbody>${ultimas.map((c) => {
      const prov = st.proveedores.find((x) => x.id === c.proveedorId);
      return `<tr><td>${esc(prov?.nombre || '—')}<br><small class="pista">${new Date(c.fecha).toLocaleDateString('es-CL')} · ${c.items.length} producto(s)</small></td><td class="num">${plata(c.total)}</td></tr>`;
    }).join('') || '<tr><td colspan="2" class="vacio">Sin compras registradas</td></tr>'}</tbody></table>`;
}

function formCompra(proveedorId) {
  const lineas = [];
  const opciones = st.productos.map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
  abrirModal('Registrar compra', `
    <div class="campo"><label>Proveedor</label><select name="proveedor">
      ${st.proveedores.map((p) => `<option value="${p.id}"${p.id === proveedorId ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('')}
    </select></div>
    <div class="doble">
      <div class="campo"><label>Producto</label><select id="c-prod">${opciones}</select></div>
      <div class="campo"><label>Cantidad</label><input id="c-cant" type="number" min="1" value="1"></div>
    </div>
    <div class="doble">
      <div class="campo"><label>Costo unitario ($)</label><input id="c-costo" type="number" min="0" step="0.01"></div>
      <div class="campo boton"><button type="button" class="secundario" id="c-add">Agregar ítem</button></div>
    </div>
    <div id="c-lineas" class="campos"></div>`, (fd) => {
    if (!lineas.length) { avisar('Agrega al menos un ítem', true); return false; }
    return mutar(bd.compra(Number(fd.get('proveedor')), lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, costo: l.costo }))));
  });

  const pintarLineas = () => {
    const cont = $('#c-lineas');
    if (!cont) return;
    cont.innerHTML = lineas.map((l, i) => `<div class="linea">
      <span class="nom">${esc(l.nombre)}</span><span class="sub">${plata(l.costo * l.cantidad)}</span>
      <span class="ctrl"><span class="pista">${l.cantidad} × ${plata(l.costo)}</span>
      <button type="button" class="quitar" data-quitar="${i}">Quitar</button></span>
    </div>`).join('');
    $$('[data-quitar]', cont).forEach((b) => { b.onclick = () => { lineas.splice(Number(b.dataset.quitar), 1); pintarLineas(); }; });
  };

  $('#c-add').onclick = () => {
    const prod = st.productos.find((p) => p.id === Number($('#c-prod').value));
    const cantidad = Number($('#c-cant').value);
    const costo = Math.round(Number($('#c-costo').value || prod.costo / 100) * 100);
    if (!prod || !(cantidad > 0)) return avisar('Cantidad inválida', true);
    lineas.push({ productoId: prod.id, nombre: prod.nombre, cantidad, costo });
    pintarLineas();
  };
}

function formProveedor() {
  abrirModal('Nuevo proveedor', `
    <div class="campo"><label>Nombre</label><input name="nombre" required maxlength="80"></div>
    <div class="campo"><label>Teléfono</label><input name="telefono" maxlength="30"></div>`,
  (fd) => mutar(bd.proveedor({ nombre: fd.get('nombre'), telefono: fd.get('telefono') })));
}

/* ---------------- reportes ---------------- */
async function pintarReportes() {
  const hoy = new Date();
  const dias = rango === 'hoy' ? 0 : rango === 'semana' ? 6 : 29;
  const desde = isoLocal(new Date(hoy.getTime() - dias * 864e5));
  const hasta = isoLocal(hoy);
  const r = await bd.resumen(desde, hasta);
  if (!r.ok) return avisar(r.error, true);
  const d = r.data;

  const diasRango = [];
  for (let i = dias; i >= 0; i--) {
    const f = new Date(hoy.getTime() - i * 864e5);
    diasRango.push({ clave: isoLocal(f), etiqueta: f.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) });
  }
  const maximo = Math.max(1, ...diasRango.map((x) => d.porDia[x.clave] || 0));

  $('#reporte').innerHTML = `
    <div class="kpis">
      <div class="kpi"><span>Vendido</span><strong>${plata(d.total)}</strong></div>
      <div class="kpi"><span>Tickets</span><strong>${d.tickets}</strong></div>
      <div class="kpi"><span>Unidades</span><strong>${d.unidades}</strong></div>
      <div class="kpi"><span>Margen</span><strong>${plata(d.margen)}</strong></div>
    </div>
    <p class="titulo-seccion">Ventas por día</p>
    <div class="grafico">${diasRango.map((x) => {
      const valor = d.porDia[x.clave] || 0;
      return `<div class="barra-dia" title="${x.clave}: ${plata(valor)}">
        <i style="height:${Math.round((valor / maximo) * 100)}%"></i><small>${x.etiqueta}</small></div>`;
    }).join('')}</div>
    <div class="dos" style="grid-template-columns:1fr 1fr">
      <div>
        <p class="titulo-seccion">Más vendidos</p>
        <table><tbody>${d.top.map((t) => `<tr><td>${esc(t.nombre)}</td><td class="num">${t.cantidad} u.</td><td class="num">${plata(t.total)}</td></tr>`).join('') || '<tr><td class="vacio">Sin ventas</td></tr>'}</tbody></table>
      </div>
      <div>
        <p class="titulo-seccion">Para reponer</p>
        <table><tbody>${d.faltantes.map((f) => `<tr><td>${esc(f.nombre)}</td><td class="num">${f.stock} u.</td></tr>`).join('') || '<tr><td class="vacio">Todo en orden</td></tr>'}</tbody></table>
      </div>
    </div>`;
}

/* ---------------- eventos ---------------- */
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (b) cambiarTab(b.dataset.tab);
});

$('#buscar').addEventListener('input', (e) => { filtro = e.target.value; pintarCaja(); });
$('#buscar').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const f = e.target.value.trim();
  if (!f) return;
  const exacto = st.productos.find((p) => p.codigo && p.codigo === f);
  const objetivo = exacto || visibles()[0];
  if (objetivo) { agregar(objetivo.id); e.target.select(); }
});
$('#grilla').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id]');
  if (b) agregar(Number(b.dataset.id));
});
$('#carrito').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-acc]');
  if (!b) return;
  const id = Number(b.dataset.id);
  const i = carrito.findIndex((l) => l.productoId === id);
  if (i < 0) return;
  if (b.dataset.acc === 'quitar') carrito.splice(i, 1);
  if (b.dataset.acc === 'mas') return agregar(id);
  if (b.dataset.acc === 'menos') {
    carrito[i].cantidad -= 1;
    if (carrito[i].cantidad <= 0) carrito.splice(i, 1);
  }
  pintarCarrito();
});
$('#cobrar').addEventListener('click', cobrar);

$('#buscar-producto').addEventListener('input', (e) => { filtroProd = e.target.value; pintarProductos(); });
$('#nuevo-producto').addEventListener('click', () => formProducto());
$('#tabla-productos').addEventListener('click', (e) => {
  const editar = e.target.closest('[data-editar]');
  const borrar = e.target.closest('[data-borrar]');
  if (editar) formProducto(st.productos.find((p) => p.id === Number(editar.dataset.editar)));
  if (borrar) {
    const p = st.productos.find((x) => x.id === Number(borrar.dataset.borrar));
    if (p && confirm(`¿Borrar "${p.nombre}"? Las ventas ya hechas no se tocan.`)) mutar(bd.borrarProducto(p.id));
  }
});

$('#tabla-stock').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ajustar]');
  const p = b && st.productos.find((x) => x.id === Number(b.dataset.ajustar));
  if (p) formAjuste(p);
});

$('#nuevo-proveedor').addEventListener('click', formProveedor);
$('#lista-proveedores').addEventListener('click', (e) => {
  const b = e.target.closest('[data-compra]');
  if (b) formCompra(Number(b.dataset.compra));
});

$('#rangos').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-rango]');
  if (!b) return;
  rango = b.dataset.rango;
  $$('#rangos button').forEach((x) => x.classList.toggle('activo', x === b));
  pintarReportes();
});

/* ---------------- arranque ---------------- */
(async () => {
  const r = await bd.estado();
  if (!r.ok) return avisar(r.error, true);
  st = r.data;
  pintar();
})();
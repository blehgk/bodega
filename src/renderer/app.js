'use strict';
const bd = window.api;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
// CLP no usa decimales: se guarda en centavos y se muestra redondeado.
const plata = (c) => '$' + Math.round(c / 100).toLocaleString('es-CL');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isoLocal = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
const pesosAcentavos = (v) => Math.round(Number(v || 0) * 100);

let st = { negocio: {}, productos: [], proveedores: [], clientes: [], ventas: [], compras: [], movimientos: [], esperas: [], cierres: [] };
let carrito = [];
let tab = 'caja';
let filtro = '';
let filtroProd = '';
let rango = 'semana';
let cierreEsperado = 0;

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

function abrirModal(titulo, cuerpo, alGuardar, textoBoton = 'Guardar') {
  const dlg = $('#modal');
  const form = $('#form-modal');
  form.innerHTML = `<h2>${esc(titulo)}</h2><div class="campos">${cuerpo}</div>
    <div class="fila"><button type="button" class="secundario" data-cerrar>Cancelar</button><button type="submit" class="primario">${esc(textoBoton)}</button></div>`;
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
  pintarClienteSelect();
  if (tab === 'caja') pintarCaja();
  if (tab === 'productos') pintarProductos();
  if (tab === 'stock') pintarStock();
  if (tab === 'proveedores') pintarProveedores();
  if (tab === 'clientes') pintarClientes();
  if (tab === 'reportes') pintarReportes();
  if (tab === 'cierre') pintarCierre();
  if (tab === 'ajustes') pintarAjustes();
}

function pintarPie() {
  const hoy = isoLocal(new Date());
  const total = st.ventas.filter((v) => !v.anulada && isoLocal(new Date(v.fecha)) === hoy).reduce((s, v) => s + v.total, 0);
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

function pintarClienteSelect() {
  const sel = $('#cliente');
  const actual = sel.value;
  sel.innerHTML = '<option value="">Consumidor final</option>' +
    st.clientes.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
  sel.value = actual;
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
  const n = st.esperas.length;
  const btn = $('#btn-esperas');
  btn.hidden = !n;
  btn.textContent = `En espera (${n})`;
}

function subtotalCarrito() {
  return carrito.reduce((s, l) => {
    const p = st.productos.find((x) => x.id === l.productoId);
    return s + (p ? p.precio * l.cantidad : 0);
  }, 0);
}

function descuentoCarrito() {
  return Math.min(pesosAcentavos($('#descuento').value), subtotalCarrito());
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
  const subtotal = subtotalCarrito();
  const desc = descuentoCarrito();
  $('#subtotal-fila').hidden = !desc;
  $('#subtotal').textContent = plata(subtotal);
  $('#descuento-fila').hidden = !desc;
  $('#descuento-monto').textContent = '-' + plata(desc);
  $('#total').textContent = plata(subtotal - desc);
  $('#cobrar').disabled = !carrito.length;
  $('#esperar').disabled = !carrito.length;
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

function limpiarCarrito() {
  carrito = [];
  $('#descuento').value = '0';
  $('#cliente').value = '';
  pintarCarrito();
}

async function cobrar() {
  const medio = $('#medio').value;
  const items = carrito.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad }));
  const opciones = { descuento: descuentoCarrito(), clienteId: Number($('#cliente').value) || null };
  const total = subtotalCarrito() - opciones.descuento;
  if (!(await mutar(bd.vender(items, medio, opciones)))) return;
  const venta = st.ventas[st.ventas.length - 1];
  limpiarCarrito();
  avisar(`Venta #${venta.id} cobrada: ${plata(total)}`);
  if (localStorage.getItem('imprimirAuto') !== '0') bd.verTicket(venta.id);
}

async function dejarEnEspera() {
  const opciones = { descuento: descuentoCarrito(), clienteId: Number($('#cliente').value) || null };
  if (await mutar(bd.esperar(carrito.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })), opciones))) {
    limpiarCarrito();
    avisar('Venta dejada en espera');
  }
}

function verEsperas() {
  const cuerpo = st.esperas.length
    ? `<div class="esperas">${st.esperas.map((e) => {
      const total = e.items.reduce((s, it) => {
        const p = st.productos.find((x) => x.id === it.productoId);
        return s + (p ? p.precio * it.cantidad : 0);
      }, 0) - (e.descuento || 0);
      const cliente = st.clientes.find((c) => c.id === e.clienteId);
      return `<div class="linea">
        <span class="nom">${e.items.length} producto(s) · ${cliente ? esc(cliente.nombre) : 'Consumidor final'}</span>
        <span class="sub">${plata(total)}</span>
        <span class="ctrl"><span class="pista">${new Date(e.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
          <button type="button" class="secundario chico" data-recuperar="${e.id}">Recuperar</button>
          <button type="button" class="quitar" data-descartar="${e.id}">Descartar</button>
        </span>
      </div>`;
    }).join('')}</div>`
    : '<p class="vacio">No hay ventas en espera</p>';

  abrirModal('Ventas en espera', cuerpo, async () => true, 'Cerrar');
  $('#form-modal').querySelector('[data-cerrar]').textContent = 'Cerrar';

  $$('[data-recuperar]').forEach((b) => {
    b.onclick = async () => {
      const r = await bd.recuperarEspera(Number(b.dataset.recuperar));
      if (!r.ok) return avisar(r.error, true);
      const espera = r.espera;
      st = r.data;
      carrito = espera.items;
      $('#descuento').value = String((espera.descuento || 0) / 100);
      $('#cliente').value = espera.clienteId || '';
      $('#modal').close();
      pintar();
      avisar('Venta recuperada');
    };
  });
  $$('[data-descartar]').forEach((b) => {
    b.onclick = () => mutar(bd.borrarEspera(Number(b.dataset.descartar))).then(() => $('#modal').close());
  });
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
      <div class="campo"><label>Costo ($)</label><input name="costo" type="number" step="1" min="0" required value="${pesos(p.costo)}"></div>
      <div class="campo"><label>Precio de venta ($)</label><input name="precio" type="number" step="1" min="0" required value="${pesos(p.precio)}"></div>
    </div>
    <div class="doble">
      <div class="campo"><label>Stock</label><input name="stock" type="number" min="0" required value="${p.stock ?? 0}"></div>
      <div class="campo"><label>Stock mínimo</label><input name="stockMinimo" type="number" min="0" value="${p.stockMinimo ?? 0}"></div>
    </div>`, (fd) => mutar(bd.producto({
    id: p.id,
    nombre: fd.get('nombre'),
    codigo: fd.get('codigo'),
    categoria: fd.get('categoria'),
    costo: pesosAcentavos(fd.get('costo')),
    precio: pesosAcentavos(fd.get('precio')),
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
      <div class="campo"><label>Costo unitario ($)</label><input id="c-costo" type="number" min="0" step="1"></div>
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
    const costo = pesosAcentavos($('#c-costo').value) || prod.costo;
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

/* ---------------- clientes ---------------- */
function pintarClientes() {
  const comprasDe = (id) => st.ventas.filter((v) => v.clienteId === id && !v.anulada);
  $('#tabla-clientes').innerHTML = `<table>
    <thead><tr><th>Cliente</th><th>Teléfono</th><th class="num">Compras</th><th class="num">Total</th><th></th></tr></thead>
    <tbody>${st.clientes.map((c) => {
      const vs = comprasDe(c.id);
      return `<tr>
        <td>${esc(c.nombre)}</td>
        <td>${esc(c.telefono || '—')}</td>
        <td class="num">${vs.length}</td>
        <td class="num">${plata(vs.reduce((s, v) => s + v.total, 0))}</td>
        <td><div class="acciones-fila">
          <button class="secundario chico" data-editar-cliente="${c.id}">Editar</button>
          <button class="secundario chico" data-borrar-cliente="${c.id}">Borrar</button>
        </div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" class="vacio">Todavía no hay clientes</td></tr>'}</tbody></table>`;
}

function formCliente(c = {}) {
  abrirModal(c.id ? 'Editar cliente' : 'Nuevo cliente', `
    <div class="campo"><label>Nombre</label><input name="nombre" required maxlength="60" value="${esc(c.nombre)}"></div>
    <div class="campo"><label>Teléfono</label><input name="telefono" maxlength="30" value="${esc(c.telefono)}"></div>`,
  (fd) => mutar(bd.cliente({ id: c.id, nombre: fd.get('nombre'), telefono: fd.get('telefono') })));
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
  const ultimas = st.ventas.filter((v) => v.fecha.slice(0, 10) >= desde).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 12);

  $('#reporte').innerHTML = `
    <div class="kpis">
      <div class="kpi"><span>Vendido</span><strong>${plata(d.total)}</strong></div>
      <div class="kpi"><span>Tickets</span><strong>${d.tickets}</strong></div>
      <div class="kpi"><span>Unidades</span><strong>${d.unidades}</strong></div>
      <div class="kpi"><span>Margen</span><strong>${plata(d.margen)}</strong></div>
    </div>
    <div class="kpis chicos">
      <div class="kpi"><span>Descuentos</span><strong>${plata(d.descuentos)}</strong></div>
      <div class="kpi"><span>Anuladas</span><strong>${d.anuladas}</strong></div>
      <div class="kpi"><span>Ticket promedio</span><strong>${plata(d.tickets ? Math.round(d.total / d.tickets) : 0)}</strong></div>
      <div class="kpi"><span>Efectivo</span><strong>${plata(d.porMedio.Efectivo || 0)}</strong></div>
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
    </div>
    <p class="titulo-seccion">Últimas ventas</p>
    <table>
      <thead><tr><th>#</th><th>Hora</th><th>Medio</th><th>Cliente</th><th class="num">Total</th><th></th></tr></thead>
      <tbody>${ultimas.map((v) => `<tr class="${v.anulada ? 'anulada' : ''}">
        <td>${v.id}</td>
        <td>${new Date(v.fecha).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${esc(v.medio)}</td>
        <td>${esc((st.clientes.find((c) => c.id === v.clienteId) || {}).nombre || '—')}</td>
        <td class="num">${plata(v.total)}</td>
        <td><div class="acciones-fila">
          <button class="secundario chico" data-ticket="${v.id}">Comprobante</button>
          ${v.anulada ? '<span class="etiqueta cero">Anulada</span>' : `<button class="secundario chico" data-anular="${v.id}">Anular</button>`}
        </div></td>
      </tr>`).join('') || '<tr><td colspan="6" class="vacio">Sin ventas en el período</td></tr>'}</tbody>
    </table>`;
}

/* ---------------- cierre ---------------- */
function pintarCierre() {
  const fecha = isoLocal(new Date());
  bd.cierre(fecha).then((r) => {
    if (!r.ok) return avisar(r.error, true);
    const c = r.data;
    const contado = Number($('#contado')?.value || 0) * 100;
    const diferencia = contado - c.esperado;
    $('#cierre-fecha').textContent = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#cierre').innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>Vendido hoy</span><strong>${plata(c.total)}</strong></div>
        <div class="kpi"><span>Tickets</span><strong>${c.tickets}</strong></div>
        <div class="kpi"><span>Efectivo esperado</span><strong>${plata(c.esperado)}</strong></div>
        <div class="kpi"><span>Anuladas</span><strong>${c.anuladas}</strong></div>
      </div>
      <div class="dos" style="grid-template-columns:1fr 1fr">
        <div>
          <p class="titulo-seccion">Por medio de pago</p>
          <table><tbody>${Object.entries(c.porMedio).map(([m, t]) => `<tr><td>${esc(m)}</td><td class="num">${plata(t)}</td></tr>`).join('') || '<tr><td class="vacio">Sin ventas</td></tr>'}</tbody></table>
        </div>
        <div>
          <p class="titulo-seccion">Cuadre de efectivo</p>
          <div class="cuadre">
            <label for="contado">Efectivo contado ($)</label>
            <input id="contado" type="number" min="0" step="100" value="${c.guardado ? c.guardado.contado / 100 : ''}" placeholder="0">
            <div class="diferencia"></div>
            <button id="guardar-cierre" class="primario">Guardar cierre</button>
            ${c.guardado ? `<p class="pista">Último cierre guardado: ${plata(c.guardado.contado)} (${c.guardado.diferencia === 0 ? 'cuadra' : c.guardado.diferencia > 0 ? '+' : ''}${plata(c.guardado.diferencia)})</p>` : ''}
          </div>
        </div>
      </div>
      <p class="titulo-seccion">Cierres anteriores</p>
      <table>
        <thead><tr><th>Fecha</th><th class="num">Vendido</th><th class="num">Esperado</th><th class="num">Contado</th><th class="num">Diferencia</th></tr></thead>
        <tbody>${[...st.cierres].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 10).map((x) => `<tr>
          <td>${x.fecha}</td><td class="num">${plata(x.total)}</td><td class="num">${plata(x.esperado)}</td>
          <td class="num">${plata(x.contado)}</td>
          <td class="num ${x.diferencia === 0 ? '' : 'rojo'}">${x.diferencia > 0 ? '+' : ''}${plata(x.diferencia)}</td>
        </tr>`).join('') || '<tr><td colspan="5" class="vacio">Sin cierres guardados</td></tr>'}</tbody>
      </table>`;

    cierreEsperado = c.esperado;
    $('#contado').addEventListener('input', actualizarDiferencia);
    actualizarDiferencia();
    $('#guardar-cierre').addEventListener('click', async () => {
      const monto = pesosAcentavos($('#contado').value);
      const res = await bd.guardarCierre(fecha, monto);
      if (!res.ok) return avisar(res.error, true);
      st = res.data;
      avisar('Cierre guardado');
      pintarCierre();
    });
  });
}

// Se actualiza sin repintar: repintar el panel haría perder el foco del input.
function actualizarDiferencia() {
  const el = $('.diferencia');
  if (!el) return;
  const contado = pesosAcentavos($('#contado').value);
  const d = contado - cierreEsperado;
  el.className = `diferencia ${contado === 0 ? '' : d === 0 ? 'ok' : d > 0 ? 'bajo' : 'cero'}`;
  el.textContent = contado === 0 ? 'Ingresa el efectivo para cuadrar'
    : d === 0 ? 'Cuadra exacto'
      : d > 0 ? `Sobran ${plata(d)}` : `Faltan ${plata(-d)}`;
}

/* ---------------- ajustes ---------------- */
function pintarAjustes() {
  const n = st.negocio || {};
  $('#ajustes').innerHTML = `
    <div class="dos" style="grid-template-columns:1fr 1fr">
      <div>
        <p class="titulo-seccion">Datos del negocio (salen en el comprobante)</p>
        <div class="campos">
          <div class="campo"><label>Nombre</label><input id="n-nombre" maxlength="60" value="${esc(n.nombre)}"></div>
          <div class="doble">
            <div class="campo"><label>RUT</label><input id="n-rut" maxlength="20" value="${esc(n.rut)}"></div>
            <div class="campo"><label>Teléfono</label><input id="n-telefono" maxlength="30" value="${esc(n.telefono)}"></div>
          </div>
          <div class="campo"><label>Dirección</label><input id="n-direccion" maxlength="80" value="${esc(n.direccion)}"></div>
          <div class="campo"><label>Pie del comprobante</label><input id="n-pie" maxlength="120" value="${esc(n.pie)}"></div>
          <label class="check"><input type="checkbox" id="n-imprimir" ${localStorage.getItem('imprimirAuto') !== '0' ? 'checked' : ''}> Abrir el comprobante al cobrar</label>
          <button id="guardar-negocio" class="primario">Guardar datos</button>
        </div>
      </div>
      <div>
        <p class="titulo-seccion">Datos y respaldo</p>
        <div class="campos">
          <button class="secundario" data-exportar="ventas">Exportar ventas del mes (CSV)</button>
          <button class="secundario" data-exportar="productos">Exportar productos (CSV)</button>
          <button class="secundario" data-respaldar>Guardar respaldo…</button>
          <button class="secundario" data-restaurar>Restaurar respaldo…</button>
          <p class="pista">Los archivos CSV se abren en Excel. El respaldo es un archivo con todos los datos: guárdalo en un pendrive o en la nube.</p>
          <p class="pista">Bodega ${'0.2.0'} · datos guardados en esta computadora, sin internet.</p>
        </div>
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
$('#descuento').addEventListener('input', pintarCarrito);
$('#cobrar').addEventListener('click', cobrar);
$('#esperar').addEventListener('click', dejarEnEspera);
$('#btn-esperas').addEventListener('click', verEsperas);

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

$('#nuevo-cliente').addEventListener('click', () => formCliente());
$('#tabla-clientes').addEventListener('click', (e) => {
  const editar = e.target.closest('[data-editar-cliente]');
  const borrar = e.target.closest('[data-borrar-cliente]');
  if (editar) formCliente(st.clientes.find((c) => c.id === Number(editar.dataset.editarCliente)));
  if (borrar) {
    const c = st.clientes.find((x) => x.id === Number(borrar.dataset.borrarCliente));
    if (c && confirm(`¿Borrar a "${c.nombre}"? Sus ventas quedan en el historial.`)) mutar(bd.borrarCliente(c.id));
  }
});

$('#rangos').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-rango]');
  if (!b) return;
  rango = b.dataset.rango;
  $$('#rangos button').forEach((x) => x.classList.toggle('activo', x === b));
  pintarReportes();
});

$('#reporte').addEventListener('click', async (e) => {
  const ticket = e.target.closest('[data-ticket]');
  const anular = e.target.closest('[data-anular]');
  if (ticket) bd.verTicket(Number(ticket.dataset.ticket));
  if (anular) {
    const v = st.ventas.find((x) => x.id === Number(anular.dataset.anular));
    if (v && confirm(`¿Anular la venta #${v.id} por ${plata(v.total)}? La mercadería vuelve al stock.`)) {
      if (await mutar(bd.anular(v.id, 'Anulación manual'))) avisar(`Venta #${v.id} anulada`);
    }
  }
});

$('#ajustes').addEventListener('click', async (e) => {
  const exp = e.target.closest('[data-exportar]');
  if (exp) {
    const hoy = new Date();
    const desde = isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const r = await bd.exportarCSV(exp.dataset.exportar, desde, isoLocal(hoy));
    if (r.ok) avisar(`Guardado en ${r.data}`);
    else if (!r.cancelado) avisar(r.error, true);
    return;
  }
  if (e.target.closest('[data-respaldar]')) {
    const r = await bd.respaldarArchivo();
    if (r.ok) avisar(`Respaldo guardado en ${r.data}`);
    else if (!r.cancelado) avisar(r.error, true);
    return;
  }
  if (e.target.closest('[data-restaurar]')) {
    if (!confirm('Restaurar un respaldo reemplaza TODOS los datos actuales. ¿Seguir?')) return;
    const r = await bd.restaurarArchivo();
    if (r.ok) { st = r.data; pintar(); avisar('Respaldo restaurado'); }
    else if (!r.cancelado) avisar(r.error, true);
    return;
  }
  if (e.target.closest('#guardar-negocio')) {
    localStorage.setItem('imprimirAuto', $('#n-imprimir').checked ? '1' : '0');
    await mutar(bd.negocio({
      nombre: $('#n-nombre').value,
      rut: $('#n-rut').value,
      telefono: $('#n-telefono').value,
      direccion: $('#n-direccion').value,
      pie: $('#n-pie').value,
    }));
    avisar('Datos guardados');
  }
});

/* ---------------- arranque ---------------- */
(async () => {
  const r = await bd.estado();
  if (!r.ok) return avisar(r.error, true);
  st = r.data;
  pintar();
})();

'use strict';
// Datos de ejemplo: 60 productos de almacén chileno + 7 días de ventas, para que la app arranque llena.
// [nombre, categoría, costo, precio, stock, stock mínimo] — precios en centavos.
const CATALOGO = [
  ['Coca-Cola 500ml', 'Bebidas', 100000, 150000, 48, 12],
  ['Coca-Cola 1.5L', 'Bebidas', 180000, 260000, 24, 6],
  ['Pepsi 500ml', 'Bebidas', 95000, 140000, 30, 12],
  ['Sprite 500ml', 'Bebidas', 95000, 140000, 30, 12],
  ['Agua mineral 500ml', 'Bebidas', 50000, 90000, 60, 18],
  ['Agua saborizada 1.5L', 'Bebidas', 100000, 160000, 18, 6],
  ['Cerveza Cristal 470ml', 'Bebidas', 110000, 160000, 36, 12],
  ['Cerveza Escudo 470ml', 'Bebidas', 115000, 170000, 24, 12],
  ['Jugo Andina 200ml', 'Bebidas', 60000, 90000, 40, 12],
  ['Bebida Bilz 350ml', 'Bebidas', 80000, 120000, 30, 10],
  ['Chocman', 'Golosinas', 35000, 50000, 50, 15],
  ['Costa', 'Golosinas', 40000, 60000, 40, 15],
  ['Super 8', 'Golosinas', 25000, 40000, 60, 20],
  ['Confites Ambrosoli', 'Golosinas', 30000, 50000, 45, 15],
  ['Papas fritas Marco Polo 180g', 'Golosinas', 120000, 180000, 24, 8],
  ['Ramitas', 'Golosinas', 45000, 70000, 40, 15],
  ['Cabritas', 'Golosinas', 50000, 80000, 30, 10],
  ['Chicle Dos en Uno', 'Golosinas', 15000, 30000, 80, 25],
  ['Galletón', 'Golosinas', 30000, 50000, 40, 15],
  ['Barra de cereal', 'Golosinas', 45000, 70000, 30, 10],
  ['Marlboro Box', 'Cigarrillos', 450000, 580000, 20, 10],
  ['Lucky Strike', 'Cigarrillos', 420000, 550000, 20, 10],
  ['Pall Mall', 'Cigarrillos', 380000, 500000, 20, 10],
  ['Kent', 'Cigarrillos', 430000, 560000, 15, 8],
  ['Chesterfield', 'Cigarrillos', 390000, 520000, 15, 8],
  ['Hilton', 'Cigarrillos', 370000, 490000, 15, 8],
  ['Té Supremo 20u', 'Almacén', 90000, 150000, 14, 5],
  ['Café Nescafé 100g', 'Almacén', 320000, 450000, 10, 4],
  ['Arroz 1kg', 'Almacén', 110000, 160000, 20, 6],
  ['Fideos Carozzi 400g', 'Almacén', 85000, 120000, 24, 8],
  ['Aceite 900ml', 'Almacén', 210000, 280000, 15, 5],
  ['Azúcar 1kg', 'Almacén', 100000, 150000, 18, 6],
  ['Harina 1kg', 'Almacén', 85000, 120000, 15, 5],
  ['Sal 1kg', 'Almacén', 40000, 60000, 12, 4],
  ['Atún en lata 160g', 'Almacén', 110000, 150000, 15, 5],
  ['Salsa de tomate 200g', 'Almacén', 60000, 90000, 15, 5],
  ['Papel higiénico 4u', 'Limpieza', 180000, 250000, 16, 6],
  ['Detergente 500ml', 'Limpieza', 130000, 180000, 14, 5],
  ['Cloro 1L', 'Limpieza', 80000, 120000, 16, 6],
  ['Lavaloza 500ml', 'Limpieza', 100000, 150000, 14, 5],
  ['Rollo de cocina 2u', 'Limpieza', 160000, 220000, 12, 5],
  ['Jabón de tocador', 'Limpieza', 60000, 90000, 20, 6],
  ['Ambientador', 'Limpieza', 130000, 190000, 10, 4],
  ['Alcohol gel 500ml', 'Limpieza', 70000, 110000, 12, 4],
  ['Leche Soprole 1L', 'Lácteos', 95000, 130000, 24, 8],
  ['Yogur 200g', 'Lácteos', 55000, 80000, 18, 6],
  ['Queso gauda 100g', 'Lácteos', 130000, 180000, 10, 4],
  ['Mantequilla 100g', 'Lácteos', 110000, 150000, 10, 4],
  ['Manjar 250g', 'Lácteos', 120000, 170000, 8, 3],
  ['Crema 200ml', 'Lácteos', 85000, 120000, 8, 3],
  ['Leche chocolatada 200ml', 'Lácteos', 50000, 70000, 24, 8],
  ['Queso rallado 40g', 'Lácteos', 70000, 100000, 10, 4],
  ['Pan de molde 500g', 'Panadería', 160000, 220000, 12, 4],
  ['Marraqueta 1kg', 'Panadería', 130000, 180000, 10, 4],
  ['Hallulla 1kg', 'Panadería', 120000, 170000, 10, 4],
  ['Galletas de agua', 'Panadería', 60000, 90000, 14, 5],
  ['Queque 300g', 'Panadería', 110000, 160000, 6, 3],
  ['Tostadas 200g', 'Panadería', 90000, 130000, 10, 4],
  ['Pan amasado 6u', 'Panadería', 100000, 150000, 6, 3],
  ['Dobladitas 6u', 'Panadería', 90000, 140000, 6, 3],
];

// Ponderado: en un almacén el efectivo sigue siendo el medio más usado.
const MEDIOS = ['Efectivo', 'Efectivo', 'Efectivo', 'Débito', 'Débito', 'Crédito', 'Transferencia', 'QR'];

// PRNG determinista: el demo se ve igual en cada máquina.
function prng(semilla) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sembrar(store) {
  if (store.estado().productos.length) return false;
  CATALOGO.forEach(([nombre, categoria, costo, precio, stock, stockMinimo], i) => {
    store.producto({ nombre, categoria, codigo: `779000${String(i).padStart(7, '0')}`, costo, precio, stock, stockMinimo });
  });
  ['Distribuidora Los Andes', 'Mayorista Central', 'Comercial San Bernardo'].forEach((nombre, i) => store.proveedor({ nombre, telefono: `+56 9 4000 000${i + 1}` }));
  [['María Soto', '+56 9 8123 4567'], ['Pedro Ramírez', '+56 9 7654 3210'], ['Rosa Fuentes', '+56 9 6321 0987']]
    .forEach(([nombre, telefono]) => store.cliente({ nombre, telefono }));

  const azar = prng(20261114);
  const productos = store.estado().productos;

  // Compras de reposición para que el panel de proveedores no arranque vacío.
  const proveedores = store.estado().proveedores;
  proveedores.forEach((prov, i) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - (i + 2));
    fecha.setHours(10, 30, 0, 0);
    const items = [0, 1, 2].map((k) => {
      const p = productos[Math.floor(azar() * productos.length)];
      return { productoId: p.id, cantidad: 6 + Math.floor(azar() * 12), costo: p.costo };
    });
    store.compra(prov.id, items, fecha.toISOString());
  });

  for (let dias = 6; dias >= 0; dias--) {
    const ventasDelDia = 6 + Math.floor(azar() * 7);
    for (let v = 0; v < ventasDelDia; v++) {
      const fecha = new Date();
      if (dias === 0) {
        // Hoy: últimas ~3 horas, para que el demo nunca muestre ventas del futuro.
        fecha.setTime(Date.now() - (5 + Math.floor(azar() * 170)) * 60000);
      } else {
        fecha.setDate(fecha.getDate() - dias);
        fecha.setHours(8 + Math.floor(azar() * 13), Math.floor(azar() * 60), 0, 0);
      }
      const items = [];
      const lineas = 1 + Math.floor(azar() * 4);
      for (let l = 0; l < lineas; l++) {
        const p = productos[Math.floor(azar() * productos.length)];
        if (p.stock < 1) continue;
        const cantidad = Math.min(1 + Math.floor(azar() * 3), p.stock);
        const ya = items.find((x) => x.productoId === p.id);
        if (ya) ya.cantidad += cantidad;
        else items.push({ productoId: p.id, cantidad });
      }
      if (items.length) store.vender(items, MEDIOS[Math.floor(azar() * MEDIOS.length)], { fecha: fecha.toISOString() });
    }
  }
  return true;
}

module.exports = { sembrar, CATALOGO };
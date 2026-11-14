'use strict';
// Datos de ejemplo: 60 productos de kiosco + 7 días de ventas, para que la app arranque llena.
// [nombre, categoría, costo, precio, stock, stock mínimo] — precios en centavos.
const CATALOGO = [
  ['Coca-Cola 500ml', 'Bebidas', 120000, 180000, 48, 12],
  ['Coca-Cola 1.5L', 'Bebidas', 200000, 290000, 24, 6],
  ['Pepsi 500ml', 'Bebidas', 110000, 170000, 30, 12],
  ['Sprite 500ml', 'Bebidas', 110000, 170000, 30, 12],
  ['Agua mineral 500ml', 'Bebidas', 50000, 90000, 60, 18],
  ['Agua saborizada 1.5L', 'Bebidas', 90000, 150000, 18, 6],
  ['Cerveza Quilmes 473ml', 'Bebidas', 130000, 200000, 36, 12],
  ['Cerveza Brahma 473ml', 'Bebidas', 120000, 190000, 24, 12],
  ['Jugo Cepita 200ml', 'Bebidas', 60000, 100000, 40, 12],
  ['Energizante Speed 250ml', 'Bebidas', 150000, 230000, 24, 6],
  ['Alfajor Triple', 'Golosinas', 60000, 100000, 50, 15],
  ['Chocolate Milka 100g', 'Golosinas', 120000, 190000, 24, 8],
  ['Chicles Beldent', 'Golosinas', 30000, 60000, 60, 20],
  ['Caramelos Sugus', 'Golosinas', 20000, 40000, 80, 20],
  ['Mogul', 'Golosinas', 40000, 70000, 45, 15],
  ['Chupetín', 'Golosinas', 15000, 30000, 100, 25],
  ['Turrón', 'Golosinas', 25000, 50000, 40, 15],
  ['Oblea', 'Golosinas', 30000, 60000, 40, 15],
  ['Gomitas', 'Golosinas', 45000, 80000, 35, 12],
  ['Barrita de cereal', 'Golosinas', 55000, 95000, 30, 10],
  ['Marlboro Box', 'Cigarrillos', 200000, 280000, 20, 10],
  ['Philip Morris', 'Cigarrillos', 190000, 270000, 20, 10],
  ['Camel', 'Cigarrillos', 195000, 275000, 15, 8],
  ['Lucky Strike', 'Cigarrillos', 185000, 265000, 15, 8],
  ['Red Point', 'Cigarrillos', 150000, 220000, 25, 10],
  ['Chesterfield', 'Cigarrillos', 170000, 250000, 15, 8],
  ['Yerba Taragüí 1kg', 'Almacén', 250000, 380000, 12, 4],
  ['Azúcar 1kg', 'Almacén', 90000, 140000, 20, 6],
  ['Arroz 1kg', 'Almacén', 85000, 130000, 18, 6],
  ['Fideos 500g', 'Almacén', 70000, 110000, 24, 8],
  ['Aceite 900ml', 'Almacén', 150000, 230000, 15, 5],
  ['Harina 1kg', 'Almacén', 60000, 95000, 15, 5],
  ['Café La Virginia 250g', 'Almacén', 200000, 300000, 10, 4],
  ['Té 25 saquitos', 'Almacén', 45000, 75000, 14, 5],
  ['Galletitas surtidas', 'Almacén', 60000, 100000, 22, 8],
  ['Sal gruesa 500g', 'Almacén', 25000, 45000, 12, 4],
  ['Papel higiénico 4u', 'Limpieza', 150000, 230000, 16, 6],
  ['Detergente 500ml', 'Limpieza', 80000, 130000, 14, 5],
  ['Jabón en polvo 800g', 'Limpieza', 180000, 270000, 10, 4],
  ['Lavandina 1L', 'Limpieza', 50000, 85000, 16, 6],
  ['Rollo de cocina 2u', 'Limpieza', 90000, 150000, 12, 5],
  ['Jabón de tocador', 'Limpieza', 40000, 70000, 20, 6],
  ['Desodorante de ambiente', 'Limpieza', 70000, 120000, 10, 4],
  ['Alcohol en gel 500ml', 'Limpieza', 50000, 85000, 12, 4],
  ['Leche entera 1L', 'Lácteos', 90000, 140000, 24, 8],
  ['Yogur 200g', 'Lácteos', 55000, 90000, 18, 6],
  ['Queso cremoso 100g', 'Lácteos', 120000, 190000, 10, 4],
  ['Manteca 100g', 'Lácteos', 90000, 140000, 10, 4],
  ['Dulce de leche 250g', 'Lácteos', 100000, 160000, 8, 3],
  ['Crema 200ml', 'Lácteos', 70000, 110000, 8, 3],
  ['Leche chocolatada 200ml', 'Lácteos', 50000, 85000, 24, 8],
  ['Queso rallado 40g', 'Lácteos', 60000, 100000, 10, 4],
  ['Pan lactal 500g', 'Panadería', 90000, 145000, 12, 4],
  ['Pan de mesa 400g', 'Panadería', 80000, 130000, 10, 4],
  ['Bizcochos 300g', 'Panadería', 70000, 115000, 8, 3],
  ['Facturas 6u', 'Panadería', 60000, 100000, 6, 3],
  ['Medialunas 6u', 'Panadería', 65000, 105000, 6, 3],
  ['Galletas de agua', 'Panadería', 50000, 85000, 14, 5],
  ['Budín 300g', 'Panadería', 85000, 135000, 6, 3],
  ['Tostadas 200g', 'Panadería', 55000, 90000, 10, 4],
];

const MEDIOS = ['Efectivo', 'Débito', 'Crédito', 'Transferencia', 'QR'];

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
  ['Distribuidora Norte', 'Mayorista del Sur', 'Kiosco Central'].forEach((nombre, i) => store.proveedor({ nombre, telefono: `11 4000-000${i + 1}` }));

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
      const hora = 8 + Math.floor(azar() * 13);
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - dias);
      fecha.setHours(hora, Math.floor(azar() * 60), 0, 0);
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
      if (items.length) store.vender(items, MEDIOS[Math.floor(azar() * MEDIOS.length)], fecha.toISOString());
    }
  }
  return true;
}

module.exports = { sembrar, CATALOGO };

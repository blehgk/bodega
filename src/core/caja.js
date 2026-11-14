'use strict';
// Cierre de caja: lo que debería haber en efectivo según las ventas del día
// contra lo que el dueño cuenta. La diferencia se guarda, no se corrige sola.

const { entero } = require('./validar');
const { reportes } = require('./reportes');

function caja(db) {
  const reporte = reportes(db);

  const calcular = (fecha) => {
    const r = reporte.resumen(fecha, fecha);
    return {
      fecha,
      esperado: r.porMedio.Efectivo || 0,
      porMedio: r.porMedio,
      total: r.total,
      tickets: r.tickets,
      anuladas: r.anuladas,
      guardado: db.estado().cierres.find((c) => c.fecha === fecha) || null,
    };
  };

  return {
    cierre: calcular,

    guardarCierre(fecha, contado) {
      const c = calcular(fecha);
      const monto = entero(contado, 'Efectivo contado');
      const anterior = db.estado().cierres.find((x) => x.fecha === fecha);

      const registro = {
        id: anterior ? anterior.id : db.nuevoId(),
        fecha,
        esperado: c.esperado,
        contado: monto,
        diferencia: monto - c.esperado,
        total: c.total,
        tickets: c.tickets,
        porMedio: c.porMedio,
      };

      const lista = db.estado().cierres;
      const i = lista.findIndex((x) => x.fecha === fecha);
      if (i >= 0) lista[i] = registro;
      else lista.push(registro);

      db.guardar();
      return registro;
    },
  };
}

module.exports = { caja };

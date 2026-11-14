/* Carga la piel guardada antes del primer pintado, para que no haya
   un parpadeo del tema por defecto al abrir. Script clásico a propósito:
   los módulos se ejecutan después de pintar. */
(function () {
  var id = 'almanaque';
  try {
    id = localStorage.getItem('tema') || 'almanaque';
  } catch (e) {
    id = 'almanaque';
  }
  if (id !== 'almanaque') {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = 'tema-css';
    link.href = 'temas/' + id + '.css';
    document.head.appendChild(link);
  }
  document.documentElement.dataset.tema = id;
})();

// «Cómo funciona»: dibuja las líneas del diagrama (entradas → validación → salidas) y recorre una operación:
// la entrada elegida se enciende, un punto viaja hasta la tarjeta, se marcan las comprobaciones y se encienden las salidas.
// Mientras nadie toque, va pasando por las entradas; en cuanto alguien pulsa una, se queda en la suya.
(function(){
  var fig = document.getElementById('ruta'); if (!fig) return;
  var svg = fig.querySelector('.ruta-lineas'), nucleo = fig.querySelector('.ruta-nucleo');
  var ins = [].slice.call(fig.querySelectorAll('.ruta-in button'));
  var outs = [].slice.call(fig.querySelectorAll('.ruta-out li'));
  var checks = [].slice.call(fig.querySelectorAll('.ruta-checks li'));
  var llega = document.getElementById('ruta-llega');
  var LLEGA = ['audio de 14 s', 'foto · 3 líneas', 'CSV · 214 operaciones', 'nota de voz de 9 s'];
  var NS = 'http://www.w3.org/2000/svg', quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pIn = [], pOut = [], punto = null, k = 0, tocado = false, visible = false, timers = [], raf = 0;

  function curva(x1, y1, x2, y2){ var m = (x1 + x2) / 2; return 'M' + x1 + ' ' + y1 + ' C' + m + ' ' + y1 + ' ' + m + ' ' + y2 + ' ' + x2 + ' ' + y2; }
  function dibujar(){
    var f = fig.getBoundingClientRect(), n = nucleo.getBoundingClientRect();
    if (f.width < 2 || getComputedStyle(svg).display === 'none') return;
    svg.setAttribute('viewBox', '0 0 ' + f.width + ' ' + f.height);
    svg.textContent = ''; pIn = []; pOut = [];
    var cy = n.top + n.height / 2 - f.top, xl = n.left - f.left, xr = n.right - f.left;
    function linea(d){ var p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); svg.appendChild(p); return p; }
    ins.forEach(function(b){ var r = b.getBoundingClientRect(); pIn.push(linea(curva(r.right - f.left, r.top + r.height / 2 - f.top, xl, cy))); });
    outs.forEach(function(o){ var r = o.getBoundingClientRect(); pOut.push(linea(curva(xr, cy, r.left - f.left, r.top + r.height / 2 - f.top))); });
    punto = document.createElementNS(NS, 'circle'); punto.setAttribute('r', 3.5); punto.style.opacity = 0; svg.appendChild(punto);
    pintar(true);
  }
  // estado estático de la entrada actual (sin animar): para redibujar tras un cambio de tamaño
  function pintar(todo){
    pIn.forEach(function(p, i){ p.classList.toggle('on', i === k); });
    pOut.forEach(function(p, i){ p.classList.toggle('on', todo && outs[i].classList.contains('on')); });
  }
  function limpiar(){ timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); if (punto) punto.style.opacity = 0; }
  function luego(ms, fn){ timers.push(setTimeout(fn, ms)); }
  function viajar(p, ms, fin){
    if (!p || !punto || quieto) { fin(); return; }
    var L = p.getTotalLength(), t0 = performance.now();
    punto.style.opacity = 1;
    (function paso(t){
      var u = Math.min(1, (t - t0) / ms), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, q = p.getPointAtLength(L * e);
      punto.setAttribute('cx', q.x); punto.setAttribute('cy', q.y);
      if (u < 1) raf = requestAnimationFrame(paso); else { punto.style.opacity = 0; fin(); }
    })(t0);
  }
  function recorrer(i){
    limpiar(); k = i;
    ins.forEach(function(b, j){ b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
    checks.forEach(function(c){ c.classList.remove('ok'); });
    outs.forEach(function(o){ o.classList.remove('on'); });
    pintar(false);
    llega.textContent = LLEGA[i] || '';
    var paso = quieto ? 0 : 220;
    viajar(pIn[i], 700, function(){
      checks.forEach(function(c, j){ luego(paso * (j + 1), function(){ c.classList.add('ok'); }); });
      var t = paso * (checks.length + 1);
      outs.forEach(function(o, j){ luego(t + (quieto ? 0 : 140 * j), function(){ o.classList.add('on'); if (pOut[j]) pOut[j].classList.add('on'); }); });
      if (!quieto) luego(t + 140 * outs.length + 3200, function(){ if (!tocado && visible) recorrer((k + 1) % ins.length); });
    });
  }

  ins.forEach(function(b, i){ b.addEventListener('click', function(){
    if (!tocado && window.umami) umami.track('ruta-toca');
    tocado = true; recorrer(i);
  }); });

  dibujar();
  if ('ResizeObserver' in window) new ResizeObserver(dibujar).observe(fig); else addEventListener('resize', dibujar);
  // empieza cuando se ve; si sale de pantalla, la vuelta automática se detiene al acabar el recorrido en curso
  if ('IntersectionObserver' in window) new IntersectionObserver(function(es){
    var antes = visible; visible = es[0].isIntersecting;
    if (visible && !antes && !tocado) recorrer(k);
  }, { threshold: .35 }).observe(fig);
  else { visible = true; recorrer(0); }
})();

// Sección "Analítica" de la landing: mapa SIG (NDVI por parcela) y BI de margen por parcela.
// Geometría: recintos SIGPAC reales. Nombres, NDVI y márgenes: datos de ejemplo.
(function(){
  var PARCELAS = [
    {id:0,  n:'La Vega', ha:2.9, v:0.54, dv:0.02, mg:3350},
    {id:1,  n:'Los Regadíos', ha:3.5, v:0.50, dv:0.01, mg:3050},
    {id:2,  n:'El Canal', ha:2.3, v:0.52, dv:0.03, mg:3180},
    {id:3,  n:'Las Suertes', ha:2.4, v:0.47, dv:-0.03, mg:2720},
    {id:4,  n:'El Molino', ha:1.4, v:0.45, dv:-0.04, mg:2540},
    {id:5,  n:'El Cercado', ha:1.4, v:0.38, dv:-0.18, mg:1400, alerta:true}
  ];
  var MESES = ['oct','nov','dic','ene','feb','mar','abr','may','jun','jul','ago','sep'];
  var MES_LARGO = ['octubre','noviembre','diciembre','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre'];
  // La campaña de un frutal de hueso en regadío, mes a mes (ejemplo): la fase y la labor típica.
  var FASES = [
    ['Postcosecha', 'Riego de mantenimiento y abonado de otoño'], ['Caída de hoja', 'Tratamiento de otoño con cobre'],
    ['Reposo', 'Poda de invierno'], ['Reposo', 'Poda y tratamiento de invierno'],
    ['Floración', 'Vigilar heladas; tratamientos en floración'], ['Floración y cuajado', 'Fungicida contra la monilia'],
    ['Cuajado', 'Aclareo de frutos y primeros riegos'], ['Engorde del fruto', 'Riego y fertirrigación'],
    ['Cosecha temprana', 'Recolección de las variedades tempranas'], ['Cosecha', 'Recolección: cuenta el plazo de seguridad'],
    ['Cosecha tardía', 'Recolección y riego'], ['Postcosecha', 'Riego de mantenimiento. Hoy']
  ];
  var mes = 11;   // el mes que se ve en el mapa y el panel; 11 = septiembre, «hoy»
  var num = function(x, d){ return x.toFixed(d).replace('.', ','); };
  var miles = function(x){ return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var pct = function(x){ var r = Math.round(x*100); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + '%'; };
  var tramo = function(v){ return v < .38 ? 1 : v < .42 ? 2 : v < .46 ? 3 : v < .50 ? 4 : 5; };

  // Serie mensual: media de 3 años con la estacionalidad de un frutal de hoja caduca (máximo en julio,
  // mínimo en invierno sin hoja) y la campaña actual desviándose hasta el valor de hoy.
  function serie(p){
    var ola = function(t){ return .10*Math.cos(2*Math.PI*(t-9)/12); };
    var b = p.v/(1+p.dv) - ola(11), out = [];
    for (var t = 0; t < 12; t++){
      var media = b + ola(t), ruido = .012*Math.sin(p.id*1.7 + t*2.3);
      var dev = p.alerta ? (t < 8 ? ruido : -.18*(t-7)/4) : p.dv*t/11 + (t < 11 ? ruido : 0);
      out.push({m:MESES[t], media:media, v:media*(1+dev)});
    }
    return out;
  }

  var sig = document.getElementById('sig'); if (!sig) return;
  var svgNS = 'http://www.w3.org/2000/svg';
  var paths = sig.querySelectorAll('.parcela');
  var byId = {}; PARCELAS.forEach(function(p){ byId[p.id] = p; p.s = serie(p); });
  var alertaG = sig.querySelector('.alerta'), elegida = 5;
  var desvio = function(p, t){ var d = p.s[t]; return d.v/d.media - 1; };
  // el mapa del mes: color por tramo de NDVI y la alerta solo cuando la caída ya se ve
  function pintarMapa(){
    paths.forEach(function(el){
      var p = byId[el.getAttribute('data-p')], v = p.s[mes].v;
      for (var b = 1; b <= 5; b++) el.classList.toggle('b' + b, b === tramo(v));
      el.classList.toggle('alerta-p', !!p.alerta && desvio(p, mes) <= -.08);
      el.setAttribute('aria-label', p.n + ', ' + num(p.ha,1) + ' ha, NDVI ' + num(v,2) + ' en ' + MES_LARGO[mes]);
    });
    var a = byId[5]; alertaG.style.visibility = desvio(a, mes) <= -.08 ? 'visible' : 'hidden';
    alertaG.querySelector('text').textContent = '▼ ' + pct(desvio(a, mes));
  }
  paths.forEach(function(el){
    var p = byId[el.getAttribute('data-p')];
    el.addEventListener('click', function(){ elegir(p.id); });
    el.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); elegir(p.id); } });
  });

  var chart = document.getElementById('ndvi-chart'), svg = chart.querySelector('svg'), tip = chart.querySelector('.tip');
  var W = 360, H = 170, L = 34, R = 8, T = 8, B = 22, y0 = .25, y1 = .65;
  var X = function(i){ return L + i*(W-L-R)/11; }, Y = function(v){ return T + (y1-v)/(y1-y0)*(H-T-B); };
  function el(tag, attrs, parent){ var e = document.createElementNS(svgNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); (parent||svg).appendChild(e); return e; }

  function dibujar(p){
    var s = p.s, neg = desvio(p, mes) <= -.08;
    svg.innerHTML = '';
    [.30,.40,.50,.60].forEach(function(v){
      el('line', {class:'grid', x1:L, x2:W-R, y1:Y(v), y2:Y(v)});
      el('text', {class:'axis', x:L-6, y:Y(v)+3, 'text-anchor':'end'}).textContent = num(v,2);
    });
    s.forEach(function(d,i){ if (i % 2 === 0 || i === 11) el('text', {class:'axis', x:X(i), y:H-6, 'text-anchor':'middle'}).textContent = d.m; });
    var sup = s.map(function(d,i){ return X(i)+','+Y(d.media+.035); }), inf = s.map(function(d,i){ return X(i)+','+Y(d.media-.035); }).reverse();
    el('polygon', {class:'band', points:sup.concat(inf).join(' ')});
    el('polyline', {class:'media', points:s.map(function(d,i){ return X(i)+','+Y(d.media); }).join(' ')});
    el('polyline', {class:'serie' + (neg ? ' neg' : ''), points:s.map(function(d,i){ return X(i)+','+Y(d.v); }).join(' ')});
    if (mes < 11) el('line', {class:'mes', x1:X(mes), x2:X(mes), y1:T, y2:H-B});
    var cross = el('line', {class:'cross', y1:T, y2:H-B, visibility:'hidden'});
    var pt = el('circle', {class:'pt', r:4.5, stroke: neg ? 'var(--warn)' : 'var(--brand-deep)', cx:X(mes), cy:Y(s[mes].v)});
    var hit = el('rect', {class:'hit', x:L, y:T, width:W-L-R, height:H-T-B});
    function mover(ev){
      var r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) * W / r.width;
      var i = Math.max(0, Math.min(11, Math.round((x - L) / ((W-L-R)/11)))), d = s[i];
      cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('visibility', 'visible');
      pt.setAttribute('cx', X(i)); pt.setAttribute('cy', Y(d.v));
      tip.innerHTML = '<b>' + d.m + '</b> · esta campaña ' + num(d.v,2) + '<br>media 3 años ' + num(d.media,2) + ' (' + pct(d.v/d.media-1) + ')';
      tip.style.left = (X(i) / W * r.width) + 'px'; tip.style.top = (Y(d.v) / H * r.height - 10) + 'px';
      tip.hidden = false;
    }
    hit.addEventListener('pointermove', mover);
    hit.addEventListener('pointerdown', mover);
    hit.addEventListener('pointerleave', function(){
      tip.hidden = true; cross.setAttribute('visibility', 'hidden');
      pt.setAttribute('cx', X(mes)); pt.setAttribute('cy', Y(s[mes].v));
    });
  }

  function elegir(id){
    var p = byId[id], v = p.s[mes].v, dvm = desvio(p, mes); elegida = id;
    paths.forEach(function(e){ e.classList.toggle('sel', +e.getAttribute('data-p') === id); });
    for (var k in filas) filas[k].classList.toggle('sel', +k === id);
    document.getElementById('p-nom').textContent = p.n;
    document.getElementById('p-ha').textContent = num(p.ha,1) + ' ha';
    document.getElementById('p-v-l').textContent = mes === 11 ? 'NDVI hoy' : 'NDVI en ' + MESES[mes];
    document.getElementById('p-v').textContent = num(v,2);
    var dv = document.getElementById('p-dv');
    dv.textContent = pct(dvm); dv.className = 'data ' + (dvm <= -.03 ? 'neg' : dvm > .005 ? 'pos' : '');
    var s = document.getElementById('p-senal');
    if (p.alerta && dvm <= -.08) s.innerHTML = '<span class="ic warn">▼ SEÑAL ABIERTA</span> · El vigor cae un <b>' + Math.round(-dvm*100) + '%</b> frente a su media de 3 años desde julio. Revisa riego y estado sanitario antes de la próxima aplicación.';
    else if (dvm <= -.03) s.innerHTML = '<span class="ic warn">▼ VIGILAR</span> · Algo por debajo de su media (' + pct(dvm) + '). Sin señal abierta: seguimiento normal.';
    else s.innerHTML = '<span class="ic ok">✓ NORMAL</span> · Dentro de lo esperable para ' + MES_LARGO[mes] + ' (' + pct(dvm) + ' frente a su media).';
    dibujar(p);
  }

  // Margen por parcela (€/ha), ordenado. Comparte selección con el mapa.
  var cont = document.getElementById('bars'), filas = {};
  var MEDIA = 2865, max = Math.max.apply(null, PARCELAS.map(function(p){ return p.mg; }));
  var btip = document.createElement('div'); btip.className = 'tip'; btip.hidden = true;
  PARCELAS.slice().sort(function(a,b){ return b.mg - a.mg; }).forEach(function(p){
    var row = document.createElement('div'), d = p.mg/MEDIA - 1;
    row.className = 'bar' + (p.alerta ? ' alerta-b' : ''); row.tabIndex = 0; row.setAttribute('role', 'listitem');
    row.setAttribute('aria-label', p.n + ': ' + p.mg + ' €/ha, ' + pct(d) + ' frente a la media');
    row.innerHTML = '<span class="nm">' + (p.alerta ? '▼ ' : '') + p.n + '</span><span class="tr"><span class="fl" style="--w:' + (p.mg/max*100) + '%"></span></span>' +
      '<span class="vl">' + miles(p.mg) + ' €/ha<span>' + pct(d) + '</span></span>';
    var ver = function(){
      btip.innerHTML = '<b>' + p.n + '</b> · ' + num(p.ha,1) + ' ha<br>margen ' + miles(p.mg*p.ha) + ' € · ' + pct(d) + ' vs media';
      btip.style.left = '50%'; btip.style.top = (row.offsetTop - 4) + 'px'; btip.hidden = false;
    };
    row.addEventListener('pointerenter', ver); row.addEventListener('focus', ver);
    row.addEventListener('pointerleave', function(){ btip.hidden = true; }); row.addEventListener('blur', function(){ btip.hidden = true; });
    row.addEventListener('click', function(){ elegir(p.id); });
    row.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); elegir(p.id); } });
    filas[p.id] = row; cont.appendChild(row);
  });
  cont.appendChild(btip);
  var foot = document.createElement('p'); foot.className = 'bi-foot';
  foot.innerHTML = 'MEDIA DE LA EXPLOTACIÓN = <b>2.865 €/ha</b> · pulsa una barra o una parcela del mapa para verla en los dos sitios.';
  cont.appendChild(foot);
  // La campaña como hilo: un deslizador recorre los 12 meses; el mapa, el panel y la curva siguen al mes.
  // Al verse por primera vez, la campaña se recorre sola una vez (de octubre a hoy); tocar algo la para.
  var rango = document.getElementById('campana-mes'), play = document.getElementById('campana-play');
  var fase = document.getElementById('campana-fase'), labor = document.getElementById('campana-labor');
  var tic = 0, tocado = false, quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ponerMes(m){
    mes = m; rango.value = m; rango.setAttribute('aria-valuetext', MES_LARGO[m]);
    fase.textContent = FASES[m][0]; labor.textContent = FASES[m][1];
    pintarMapa(); elegir(elegida);
  }
  function parar(){ clearInterval(tic); tic = 0; play.textContent = '▶'; play.setAttribute('aria-label', 'Recorrer la campaña'); }
  function recorrer(){
    if (tic) { parar(); return; }
    var m = mes === 11 ? 0 : mes; ponerMes(m);
    play.textContent = '❚❚'; play.setAttribute('aria-label', 'Parar');
    tic = setInterval(function(){ if (mes >= 11) parar(); else ponerMes(mes + 1); }, 650);
  }
  rango.addEventListener('input', function(){
    parar(); ponerMes(+rango.value);
    if (!tocado && window.umami) umami.track('sig-campana');
    tocado = true;
  });
  play.addEventListener('click', function(){ tocado = true; recorrer(); });
  sig.addEventListener('pointerdown', function(e){ if (!play.contains(e.target)) { tocado = true; parar(); } });
  if (!quieto && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(es){
      if (es[0].isIntersecting && !tocado) { io.disconnect(); recorrer(); }
    }, { threshold: .45 });
    io.observe(sig);
  }
  ponerMes(11);
})();


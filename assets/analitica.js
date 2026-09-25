// Sección "Analítica" de la landing: mapa SIG (NDVI por parcela) y BI de costes.
// NDVI: valores de ejemplo sobre recintos SIGPAC reales. Costes: campaña 2024 real de una viña de la v1.
(function(){
  var PARCELAS = [
    {id:0,  n:'Haza Grande',  ha:1.5, v:.52, dv:.02},
    {id:8,  n:'La Vereda',    ha:0.8, v:.36, dv:-.18, alerta:true},
    {id:9,  n:'Cañada Honda', ha:0.7, v:.49, dv:.01},
    {id:10, n:'El Cerro',     ha:0.7, v:.47, dv:-.02},
    {id:11, n:'La Noria',     ha:0.7, v:.55, dv:.04},
    {id:12, n:'Los Llanos',   ha:0.6, v:.44, dv:-.03},
    {id:13, n:'El Majuelo',   ha:0.6, v:.41, dv:-.04},
    {id:20, n:'La Umbría',    ha:0.5, v:.50, dv:.03},
    {id:22, n:'Las Suertes',  ha:0.5, v:.46, dv:0},
    {id:40, n:'El Pozuelo',   ha:0.3, v:.43, dv:-.01}
  ];
  var MESES = ['oct','nov','dic','ene','feb','mar','abr','may','jun','jul','ago','sep'];
  var num = function(x, d){ return x.toFixed(d).replace('.', ','); };
  var pct = function(x){ var r = Math.round(x*100); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + '%'; };
  var tramo = function(v){ return v < .38 ? 1 : v < .42 ? 2 : v < .46 ? 3 : v < .50 ? 4 : 5; };

  // Serie mensual: media de 3 años con estacionalidad del olivar (máximo en invierno)
  // y la campaña actual desviándose hasta el valor de hoy.
  function serie(p){
    var ola = function(t){ return .05*Math.cos(2*Math.PI*(t-4)/12); };
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
  var byId = {}; PARCELAS.forEach(function(p){ byId[p.id] = p; });
  paths.forEach(function(el){
    var p = byId[el.getAttribute('data-p')];
    el.classList.add('b' + tramo(p.v));
    if (p.alerta) el.classList.add('alerta-p');
    el.addEventListener('click', function(){ elegir(p.id); });
    el.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); elegir(p.id); } });
  });

  var chart = document.getElementById('ndvi-chart'), svg = chart.querySelector('svg'), tip = chart.querySelector('.tip');
  var W = 360, H = 170, L = 34, R = 8, T = 8, B = 22, y0 = .30, y1 = .65;
  var X = function(i){ return L + i*(W-L-R)/11; }, Y = function(v){ return T + (y1-v)/(y1-y0)*(H-T-B); };
  function el(tag, attrs, parent){ var e = document.createElementNS(svgNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); (parent||svg).appendChild(e); return e; }

  function dibujar(p){
    var s = serie(p), neg = p.dv <= -.1;
    svg.innerHTML = '';
    [.35,.45,.55,.65].forEach(function(v){
      el('line', {class:'grid', x1:L, x2:W-R, y1:Y(v), y2:Y(v)});
      el('text', {class:'axis', x:L-6, y:Y(v)+3, 'text-anchor':'end'}).textContent = num(v,2);
    });
    s.forEach(function(d,i){ if (i % 2 === 0 || i === 11) el('text', {class:'axis', x:X(i), y:H-6, 'text-anchor':'middle'}).textContent = d.m; });
    var sup = s.map(function(d,i){ return X(i)+','+Y(d.media+.035); }), inf = s.map(function(d,i){ return X(i)+','+Y(d.media-.035); }).reverse();
    el('polygon', {class:'band', points:sup.concat(inf).join(' ')});
    el('polyline', {class:'media', points:s.map(function(d,i){ return X(i)+','+Y(d.media); }).join(' ')});
    el('polyline', {class:'serie' + (neg ? ' neg' : ''), points:s.map(function(d,i){ return X(i)+','+Y(d.v); }).join(' ')});
    var cross = el('line', {class:'cross', y1:T, y2:H-B, visibility:'hidden'});
    var pt = el('circle', {class:'pt', r:4.5, stroke: neg ? 'var(--warn)' : 'var(--brand-deep)', cx:X(11), cy:Y(s[11].v)});
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
      pt.setAttribute('cx', X(11)); pt.setAttribute('cy', Y(s[11].v));
    });
  }

  function elegir(id){
    var p = byId[id];
    paths.forEach(function(e){ e.classList.toggle('sel', +e.getAttribute('data-p') === id); });
    document.getElementById('p-nom').textContent = p.n;
    document.getElementById('p-ha').textContent = num(p.ha,1) + ' ha';
    document.getElementById('p-v').textContent = num(p.v,2);
    var dv = document.getElementById('p-dv');
    dv.textContent = pct(p.dv); dv.className = 'data ' + (p.dv <= -.03 ? 'neg' : p.dv > 0 ? 'pos' : '');
    var s = document.getElementById('p-senal');
    if (p.alerta) s.innerHTML = '<span class="ic warn">▼ SEÑAL ABIERTA</span> · El vigor cae un <b>18%</b> frente a su media de 3 años desde julio. Revisa riego y estado sanitario antes de la próxima aplicación.';
    else if (p.dv <= -.03) s.innerHTML = '<span class="ic warn">▼ VIGILAR</span> · Algo por debajo de su media (' + pct(p.dv) + '). Sin señal abierta: seguimiento normal.';
    else s.innerHTML = '<span class="ic ok">✓ NORMAL</span> · Dentro de lo esperable para esta época (' + pct(p.dv) + ' frente a su media).';
    dibujar(p);
  }
  elegir(8);
})();

(function(){
  // Coste por actividad, €/ha. Viña de 4,5 ha, campaña 2024 (datos reales de la v1).
  var HA = 4.5, COSTES = [['Poda',350],['Riego',165],['Fumigar',152],['Arar',78],['Preparar alambres',55],['Roar',35],
    ['Despuntar',28],['Herbicidas',20],['Subir alambres',13],['Costes fijos',12],['Zachar',8]];
  var cont = document.getElementById('bars'); if (!cont) return;
  var total = 4152 / HA, max = COSTES[0][1];  // total de la campaña: las partidas vienen redondeadas
  var tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true;
  cont.style.position = 'relative';
  COSTES.forEach(function(c, i){
    var p = Math.round(c[1]/total*100), eur = Math.round(c[1]*HA).toLocaleString('es-ES');
    var row = document.createElement('div');
    row.className = 'bar' + (i < 3 ? ' top' : ''); row.tabIndex = 0; row.setAttribute('role', 'listitem');
    row.setAttribute('aria-label', c[0] + ': ' + c[1] + ' €/ha, ' + p + '% del gasto, ' + eur + ' € en total');
    row.innerHTML = '<span class="nm">' + c[0] + '</span><span class="tr"><span class="fl" style="--w:' + (c[1]/max*100) + '%"></span></span>' +
      '<span class="vl">' + c[1] + ' €/ha<span>' + p + '%</span></span>';
    var ver = function(){
      tip.innerHTML = '<b>' + c[0] + '</b> · ' + eur + ' € en la campaña<br>' + c[1] + ' €/ha · ' + p + '% del gasto';
      tip.style.left = '50%'; tip.style.top = (row.offsetTop - 4) + 'px'; tip.hidden = false;
    };
    row.addEventListener('pointerenter', ver); row.addEventListener('focus', ver);
    row.addEventListener('pointerleave', function(){ tip.hidden = true; }); row.addEventListener('blur', function(){ tip.hidden = true; });
    cont.appendChild(row);
  });
  cont.appendChild(tip);
  var foot = document.createElement('p'); foot.className = 'bi-foot';
  foot.innerHTML = 'PODA + RIEGO + FUMIGAR = <b>667 €/ha (72%)</b> · el resto de actividades pesa 256 €/ha.';
  cont.appendChild(foot);
})();

// Dirección de trabajo: el recinto SIGPAC (OGC API de sigpac-hubcloud.es) y el ancho del apero →
// la dirección de las pasadas con menos vueltas en cabecera, y lo que se ahorra frente a la peor.
(() => {
  'use strict';
  const API = 'https://sigpac-hubcloud.es/ogcapi/collections/recintos/items';
  const EJEMPLO = '47:87:0:0:7:450:1';
  // Valores de partida por labor: ancho (m), velocidad (km/h), segundos por vuelta, consumo (L/h).
  const LABORES = [
    ['grada', 'Grada de discos', 4, 8, 30, 18],
    ['subsolador', 'Subsolador', 3, 5, 40, 22],
    ['cultivador', 'Cultivador', 5, 9, 30, 16],
    ['sembradora', 'Sembradora', 6, 9, 35, 12],
    ['abonadora', 'Abonadora', 24, 10, 30, 7],
    ['barra', 'Pulverizador de barra', 18, 8, 40, 8],
    ['cosechadora', 'Cosechadora', 7.5, 5, 45, 30]
  ];
  const RUMBOS = ['N-S', 'NNE-SSO', 'NE-SO', 'ENE-OSO', 'E-O', 'ESE-ONO', 'SE-NO', 'SSE-NNO'];

  const $ = id => document.getElementById(id);
  const nf = (v, d = 0) => Number.isFinite(v) ? v.toLocaleString('es-ES', {minimumFractionDigits:d, maximumFractionDigits:d}) : '—';
  const val = (id, d) => { const x = parseFloat($(id).value); return x > 0 ? x : d; };
  const track = (e, d) => { try { window.umami && window.umami.track(e, d); } catch (_) {} };
  const params = new URLSearchParams(location.search);

  // ---- mapa: ortofoto PNOA + recintos SIGPAC ----
  const mapa = L.map('mapa', {zoomControl:true, attributionControl:true}).setView([40.2, -3.7], 6);
  mapa.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  L.tileLayer('https://www.ign.es/wmts/pnoa-ma?service=WMTS&request=GetTile&version=1.0.0&Format=image/jpeg&layer=OI.OrthoimageCoverage&style=default&tilematrixset=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}',
    {maxZoom:20, maxNativeZoom:19, attribution:'PNOA © <a href="https://www.ign.es" target="_blank" rel="noopener">IGN</a>'}).addTo(mapa);
  L.tileLayer.wms('https://sigpac-hubcloud.es/wms', {layers:'recinto', format:'image/png', transparent:true, version:'1.3.0', minZoom:14, maxZoom:20,
    attribution:'SIGPAC © <a href="https://www.fega.gob.es" target="_blank" rel="noopener">FEGA</a>'}).addTo(mapa);
  const capa = L.layerGroup().addTo(mapa);
  const capaPeor = L.layerGroup();

  const S = {recinto:null, props:null};

  // ---- geometría: coordenadas locales en metros alrededor del recinto ----
  function anillos(geom) {
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    return polys.flat(); // exteriores y huecos: para cortar líneas basta con todos los bordes
  }
  function proyector(rings) {
    const pts = rings.flat();
    const lon0 = pts.reduce((s, p) => s + p[0], 0) / pts.length, lat0 = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const kx = Math.cos(lat0 * Math.PI / 180) * 111320, ky = 110540;
    return {a:([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * ky], b:([x, y]) => [lat0 + y / ky, lon0 + x / kx]};
  }
  function area(ring) { let s = 0; for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]; return s / 2; }

  // Para un ángulo θ (grados desde el norte, en sentido horario): pasadas paralelas a θ, separadas el ancho.
  // Cada pasada se corta con los bordes; cada tramo que queda es una pasada real, y entre dos tramos hay una vuelta.
  function pasadas(rings, theta, ancho) {
    const t = theta * Math.PI / 180, d = [Math.sin(t), Math.cos(t)], n = [Math.cos(t), -Math.sin(t)];
    let smin = Infinity, smax = -Infinity;
    rings.forEach(r => r.forEach(p => { const s = p[0] * n[0] + p[1] * n[1]; smin = Math.min(smin, s); smax = Math.max(smax, s); }));
    const tramos = [];
    for (let c = smin + ancho / 2; c < smax; c += ancho) {
      const cortes = [];
      rings.forEach(r => {
        for (let i = 0; i < r.length - 1; i++) {
          const p = r[i], q = r[i + 1];
          const sp = p[0] * n[0] + p[1] * n[1] - c, sq = q[0] * n[0] + q[1] * n[1] - c;
          if ((sp < 0) !== (sq < 0)) {
            const k = sp / (sp - sq), x = p[0] + (q[0] - p[0]) * k, y = p[1] + (q[1] - p[1]) * k;
            cortes.push(x * d[0] + y * d[1]);
          }
        }
      });
      cortes.sort((a, b) => a - b);
      for (let i = 0; i + 1 < cortes.length; i += 2) {
        const u0 = cortes[i], u1 = cortes[i + 1];
        tramos.push({c, u0, u1, L:u1 - u0});
      }
    }
    const L = tramos.reduce((s, x) => s + x.L, 0);
    return {theta, tramos, vueltas:Math.max(0, tramos.length - 1), L, d, n, ancho:smax - smin};
  }
  function linea(r, tr, proj) {
    const a = [tr.c * r.n[0] + tr.u0 * r.d[0], tr.c * r.n[1] + tr.u0 * r.d[1]];
    const b = [tr.c * r.n[0] + tr.u1 * r.d[0], tr.c * r.n[1] + tr.u1 * r.d[1]];
    return [proj.b(a), proj.b(b)];
  }

  // ---- cálculo y pintado ----
  function calcular() {
    if (!S.recinto) return;
    const rings = anillos(S.recinto.geometry), proj = proyector(rings), loc = rings.map(r => r.map(proj.a));
    const ancho = val('ancho', 4), vel = val('vel', 8), giro = val('giro', 30), cons = val('cons', 15), veces = val('veces', 1);
    const tiempo = r => r.L / (vel * 1000 / 60) + r.vueltas * giro / 60; // minutos
    const todas = [];
    for (let th = 0; th < 180; th++) todas.push(pasadas(loc, th, ancho));
    // mejor: menos vueltas; a igualdad, menos metros. Peor: más vueltas.
    const mejor = todas.reduce((m, r) => (r.vueltas < m.vueltas || (r.vueltas === m.vueltas && r.L < m.L)) ? r : m);
    const peor = todas.reduce((m, r) => (r.vueltas > m.vueltas || (r.vueltas === m.vueltas && r.L > m.L)) ? r : m);
    const tm = tiempo(mejor), tp = tiempo(peor);
    const ha = Math.abs(loc.reduce((s, r) => s + area(r), 0)) / 10000;

    $('rumbo').innerHTML = `${mejor.theta}°<small>${RUMBOS[Math.round(mejor.theta / 22.5) % 8]}</small>`;
    $('rumboTxt').innerHTML = `Pasadas a <b>${mejor.theta}°</b> del norte (y su contraria, ${mejor.theta + 180}°), con ${nf(ancho, 1)} m de ancho en ${nf(ha, 2)} ha.`;
    $('kPas').textContent = nf(mejor.tramos.length);
    $('kVue').textContent = nf(mejor.vueltas);
    $('kTie').textContent = `${nf(tm / 60, 1)} h`;
    const dv = peor.vueltas - mejor.vueltas, dmin = tp - tm, dl = dmin / 60 * cons;
    $('ahorro').innerHTML = dv > 0
      ? `<b>${nf(dv)} vueltas menos</b> que trabajando a ${peor.theta}°: unos <b>${nf(dmin)} minutos</b> y <b>${nf(dl, 1)} L de gasóleo</b> por labor.`
      : 'En este recinto la dirección casi no cambia el número de vueltas: trabaja como te venga mejor.';
    $('ahorroAnio').textContent = dv > 0 ? `Con ${nf(veces)} labores al año: ${nf(dmin * veces / 60, 1)} horas y ${nf(dl * veces)} L de gasóleo.` : '';

    capa.clearLayers(); capaPeor.clearLayers();
    L.geoJSON(S.recinto.geometry, {style:{color:'#ffffff', weight:2, fill:false}}).addTo(capa);
    // con aperos estrechos las pasadas se juntan en el mapa: se dibuja una de cada N (como mucho unas 30 líneas)
    const dibujar = (r, cap, estilo) => {
      const cs = [...new Set(r.tramos.map(t => t.c))], cada = Math.max(1, Math.ceil(cs.length / 30)), ver = new Set(cs.filter((_, i) => i % cada === 0));
      r.tramos.filter(t => ver.has(t.c)).forEach(tr => L.polyline(linea(r, tr, proj), estilo).addTo(cap));
      return cada;
    };
    const cada = dibujar(mejor, capa, {color:'#00c896', weight:2.5, opacity:.95});
    dibujar(peor, capaPeor, {color:'#e0a33e', weight:2, opacity:.95, dashArray:'5 5'});
    $('cadaN').textContent = cada > 1 ? `(se dibuja 1 de cada ${cada} pasadas)` : '';
    if ($('verPeor').checked) capaPeor.addTo(mapa); else capaPeor.remove();

    const p = S.props;
    $('pendNota').hidden = !(p && p.pendiente_media >= 10);
    $('pendNota').innerHTML = p && p.pendiente_media >= 10
      ? `<b>Ojo: este recinto tiene una pendiente media del ${nf(p.pendiente_media, 1)} %.</b> En pendiente fuerte mandan la seguridad del tractor y la erosión: trabaja a nivel, siguiendo las curvas, aunque des más vueltas.` : '';
  }

  // ---- buscar el recinto ----
  const refTxt = p => [p.provincia, p.municipio, p.agregado, p.zona, p.poligono, p.parcela, p.recinto].join(':');
  function mostrar(f, centrar) {
    S.recinto = f; S.props = f.properties;
    const p = f.properties;
    $('ref').value = refTxt(p);
    $('recInfo').hidden = false;
    $('recInfo').innerHTML = `<b>Recinto ${refTxt(p)}</b><span class="cc-sub">Pendiente media ${nf(p.pendiente_media, 1)} % · altitud ${nf(p.altitud)} m</span>`;
    if (centrar) mapa.fitBounds(L.geoJSON(f.geometry).getBounds(), {padding:[24, 24], maxZoom:18});
    history.replaceState(null, '', `?ref=${refTxt(p).replace(/:/g, '-')}&labor=${$('labor').value}`);
    calcular();
  }
  async function buscarRef(txt) {
    const n = (txt.match(/\d+/g) || []).map(Number);
    if (n.length < 6) { $('refMsg').textContent = 'Escribe al menos provincia, municipio, agregado, zona, polígono y parcela.'; return; }
    const [provincia, municipio, agregado, zona, poligono, parcela, recinto] = n;
    const q = new URLSearchParams({f:'json', limit:'50', provincia, municipio, agregado, zona, poligono, parcela});
    if (recinto != null) q.set('recinto', recinto);
    $('refMsg').textContent = 'Buscando…';
    try {
      const d = await (await fetch(`${API}?${q}`)).json();
      const fs = (d.features || []).filter(f => f.geometry);
      if (!fs.length) { $('refMsg').textContent = 'No encontramos ese recinto en el SIGPAC. Revisa la referencia o púlsalo en el mapa.'; return; }
      // sin recinto, el más grande de la parcela
      const sup = g => { const r = anillos(g), pr = proyector(r); return Math.abs(r.reduce((t, x) => t + area(x.map(pr.a)), 0)); };
      const f = fs.reduce((m, x) => sup(x.geometry) > sup(m.geometry) ? x : m);
      $('refMsg').textContent = fs.length > 1 && recinto == null ? `La parcela tiene ${fs.length} recintos: te enseñamos el mayor. Pulsa otro en el mapa si quieres.` : '';
      mostrar(f, true); track('dir-recinto');
    } catch (_) { $('refMsg').textContent = 'El SIGPAC no responde ahora. Inténtalo en un momento.'; }
  }
  function dentro(pt, geom) {
    const [x, y] = pt; let inn = false;
    anillos(geom).forEach(r => { for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inn = !inn; } });
    return inn;
  }
  mapa.on('click', async e => {
    if (mapa.getZoom() < 14) { $('refMsg').textContent = 'Acerca más el mapa para elegir un recinto.'; return; }
    const {lat, lng} = e.latlng, k = 0.00002;
    $('refMsg').textContent = 'Buscando el recinto…';
    try {
      const d = await (await fetch(`${API}?f=json&limit=20&bbox=${lng - k},${lat - k},${lng + k},${lat + k}`)).json();
      const fs = (d.features || []).filter(f => f.geometry);
      const f = fs.find(x => dentro([lng, lat], x.geometry)) || fs[0];
      if (!f) { $('refMsg').textContent = 'Ahí no hay ningún recinto SIGPAC.'; return; }
      $('refMsg').textContent = '';
      mostrar(f, false); track('dir-recinto');
    } catch (_) { $('refMsg').textContent = 'El SIGPAC no responde ahora. Inténtalo en un momento.'; }
  });
  $('refForm').addEventListener('submit', e => { e.preventDefault(); buscarRef($('ref').value); });
  $('geo').addEventListener('click', () => {
    if (!navigator.geolocation) { $('refMsg').textContent = 'Tu navegador no da la ubicación.'; return; }
    $('refMsg').textContent = 'Buscando tu ubicación…';
    navigator.geolocation.getCurrentPosition(p => { mapa.setView([p.coords.latitude, p.coords.longitude], 17); $('refMsg').textContent = 'Pulsa tu recinto en el mapa.'; },
      () => { $('refMsg').textContent = 'No hemos podido saber tu ubicación. Escribe la referencia o busca en el mapa.'; });
  });

  // ---- labor ----
  $('labor').innerHTML = LABORES.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
  function ponerLabor(k) {
    const l = LABORES.find(x => x[0] === k) || LABORES[0];
    $('labor').value = l[0]; [$('ancho').value, $('vel').value, $('giro').value, $('cons').value] = l.slice(2);
  }
  $('labor').addEventListener('change', () => { ponerLabor($('labor').value); calcular(); track('dir-labor', {labor:$('labor').value});
    if (S.props) history.replaceState(null, '', `?ref=${refTxt(S.props).replace(/:/g, '-')}&labor=${$('labor').value}`); });
  ['ancho', 'vel', 'giro', 'cons', 'veces'].forEach(id => $(id).addEventListener('input', calcular));
  $('verPeor').addEventListener('change', calcular);

  ponerLabor(params.get('labor') || 'grada');
  buscarRef((params.get('ref') || EJEMPLO).replace(/-/g, ':'));
})();

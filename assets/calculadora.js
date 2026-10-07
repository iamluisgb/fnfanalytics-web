// Calculadora de caldo: usos autorizados del MAPA (herramientas/datos, generados con
// scripts/exportar_usos.py) → cubas, producto por cuba, boquillas y orden de tratamiento.
// Las comprobaciones avisan y no bloquean, como en la app.
(() => {
  'use strict';
  const DATOS = '/herramientas/datos/';
  const PRESET = {
    olivo: {caldo:800, cuba:2000, calle:7, alto:3.5, ancho:3.2, fac:.05, vel:5, anchoT:7, nb:14},
    vid:   {caldo:500, cuba:1500, calle:2.6, alto:1.4, ancho:.6, fac:.1, vel:5, anchoT:2.6, nb:10},
    arbol: {caldo:1000, cuba:2000, calle:5, alto:3.5, ancho:3, fac:.06, vel:5, anchoT:5, nb:16},
    barra: {caldo:200, cuba:3000, vel:8, anchoT:18, nb:36}
  };
  // Boquillas de abanico, código de color ISO 10625: caudal nominal a 3 bar (L/min).
  const NOZ = [['01','naranja',.40],['015','verde',.60],['02','amarillo',.80],['025','lila',1.00],['03','azul',1.20],
               ['04','rojo',1.60],['05','marrón',2.00],['06','gris',2.40],['08','blanco',3.20]];

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const nf = (v, d = 0) => Number.isFinite(v) ? v.toLocaleString('es-ES', {minimumFractionDigits:d, maximumFractionDigits:d}) : '—';
  const nx = v => !Number.isFinite(v) ? '—' : v.toLocaleString('es-ES', {maximumFractionDigits: v < 10 ? 2 : v < 100 ? 1 : 0});
  const val = id => parseFloat($(id).value);
  const pos = (id, d) => { const x = val(id); return x > 0 ? x : d; };
  const slug = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const track = (e, d) => { try { window.umami && window.umami.track(e, d); } catch (_) {} };

  const S = {indice:null, cultivo:null, datos:null, tipo:null, plaga:null, uso:null, dose:null, pasoBoton:1, hayResultado:false, usosPorReg:new Map(), cache:new Map()};
  const params = new URLSearchParams(location.search);

  // ---- datos ----
  async function cargarIndice() {
    const r = await fetch(DATOS + 'cultivos.json');
    S.indice = await r.json();
    const [a, m, d] = S.indice.fecha.split('-');
    $('fecha').textContent = `${+d}-${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][m - 1]}-${a}`;
    const por = Object.fromEntries(S.indice.cultivos.map(c => [c.s, c]));
    const opt = c => `<option value="${c.s}">${esc(c.n)}</option>`;
    $('cult').innerHTML =
      `<optgroup label="Más consultados">${S.indice.destacados.map(s => opt(por[s])).join('')}</optgroup>` +
      `<optgroup label="Todos los cultivos">${S.indice.cultivos.map(opt).join('')}</optgroup>`;
    const pedido = params.get('cultivo');
    $('cult').value = por[pedido] ? pedido : (por.olivo ? 'olivo' : S.indice.cultivos[0].s);
  }
  async function cargarCultivo(s) {
    if (!S.cache.has(s)) S.cache.set(s, fetch(DATOS + 'c/' + s + '.json').then(r => r.json()));
    return S.cache.get(s);
  }

  // ---- unidades ----
  const prod = u => S.datos.productos[u[0]];
  const liquido = u => prod(u)[2] === 'l';
  const unidadDosis = u => u[3] === 'hl' ? (liquido(u) ? 'ml/hL' : 'g/hL') : (liquido(u) ? 'L/ha' : 'kg/ha');
  const unidadProd = u => liquido(u) ? 'L' : 'kg';
  const rango = u => u[4] === u[5] ? `${nx(u[5])} ${unidadDosis(u)}` : `${nx(u[4])}–${nx(u[5])} ${unidadDosis(u)}`;

  // ---- cultivo y plaga ----
  async function alCambiarCultivo(inicial) {
    const s = $('cult').value;
    const info = S.indice.cultivos.find(c => c.s === s);
    S.datos = await cargarCultivo(s);
    if ($('cult').value !== s) return; // llegó otra selección mientras cargaba
    S.cultivo = info;
    S.usosPorReg = new Map();
    S.datos.usos.forEach(u => S.usosPorReg.set(u[0], (S.usosPorReg.get(u[0]) || 0) + 1));
    if (info.t !== S.tipo) { S.tipo = info.t; aplicarPreset(!inicial); }
    const grupos = new Map();
    S.datos.usos.forEach(u => { if (!grupos.has(u[1])) grupos.set(u[1], new Set()); grupos.get(u[1]).add(u[0]); });
    const plagas = [...grupos].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0], 'es'));
    S.plagas = plagas.map(([p, regs]) => ({n:p, k:regs.size, c:(S.datos.usos.find(u => u[1] === p && u[2]) || [])[2] || ''}));
    const pedida = inicial && params.get('plaga');
    const hit = pedida && S.plagas.find(p => slug(p.n) === pedida);
    S.plaga = (hit || S.plagas[0]).n;
    $('crumbC').textContent = info.n;
    if (!inicial) track('calc-cultivo', {cultivo:info.n});
    alCambiarPlaga(inicial);
  }
  function alCambiarPlaga(inicial) {
    S.dose = null;
    $('crumbP').textContent = S.plaga;
    $('plagaName').textContent = S.plaga;
    const usos = usosDePlaga();
    const pedido = inicial && params.get('producto');
    // por defecto, el producto con más usos en el cultivo: el más corriente
    S.uso = (pedido && usos.find(u => u[0] === pedido)) ||
      usos.reduce((m, u) => (S.usosPorReg.get(u[0]) > S.usosPorReg.get(m[0]) ? u : m), usos[0]);
    const nprod = new Set(usos.map(u => u[0])).size;
    $('usesHint').textContent = `${nprod} producto${nprod === 1 ? '' : 's'} autorizado${nprod === 1 ? '' : 's'} contra ${S.plaga.toLowerCase()} en ${S.cultivo.n.toLowerCase()}` +
      (usos.length > nprod ? `. Algunos tienen varias dosis según el momento o el modo de aplicación (${usos.length} usos).` : '.');
    $('allSum').textContent = `Todos los productos autorizados contra ${S.plaga.toLowerCase()} (${nprod})`;
    if ($('allBox').open) pintarTabla();
    pintarFicha();
  }
  const usosDePlaga = () => S.datos.usos.filter(u => u[1] === S.plaga);

  // ---- producto elegido: ficha con la dosis ----
  function elegir(u) {
    S.uso = u; S.dose = null;
    pintarFicha();
    if ($('allBox').open) pintarTabla();
    track('calc-producto');
  }
  function pintarFicha() {
    const u = S.uso;
    $('ficha').hidden = !u;
    if (!u) { $('pickName').textContent = 'Elige un producto'; $('pickSub').textContent = ''; calcular(); return; }
    const p = prod(u);
    $('pickName').textContent = p[0];
    $('pickSub').textContent = `Nº ${u[0]} · ${p[3] || p[1]}`;
    $('fDose').textContent = rango(u);
    $('fCaldo').textContent = u[6] ? `${nf(u[6])}–${nf(u[7] || u[6])} L/ha` : 'sin indicar';
    $('fAp').textContent = u[8] ? `máx. ${u[8]}${u[9] ? ` · cada ${u[9]} d` : ''}` : 'sin indicar';
    $('fPs').textContent = u[10] != null ? `${u[10]} días` : 'sin indicar';
    prepararDosis();
    calcular();
  }

  // ---- dosis: deslizador con la zona autorizada, botones y valor escrito ----
  const redondo = x => Math.pow(10, Math.floor(Math.log10(x)));
  function prepararDosis() {
    const u = S.uso, r = $('dose');
    const top = u[5] * 1.3, paso = redondo(top / 100);
    const rmin = Math.max(0, Math.floor(u[4] * .5 / paso) * paso), rmax = Math.ceil(top / paso) * paso;
    r.min = rmin; r.max = rmax; r.step = paso;
    S.pasoBoton = redondo(u[5] / 10) * (u[5] / redondo(u[5] / 10) >= 50 ? 5 : 1);
    r.style.setProperty('--a', `${(u[4] - rmin) / (rmax - rmin) * 100}%`);
    r.style.setProperty('--b', `${(u[5] - rmin) / (rmax - rmin) * 100}%`);
    $('doseUnit').textContent = unidadDosis(u);
    $('doseIn').step = paso;
    const fija = u[4] === u[5];
    $('dZona').hidden = fija;
    $('dMin').textContent = fija ? '' : `mín. ${nx(u[4])}`;
    $('dMax').textContent = fija ? `dosis fija ${nx(u[5])}` : `máx. ${nx(u[5])}`;
    if (S.dose == null) S.dose = u[4] === u[5] ? u[5] : Math.round((u[4] + u[5]) / 2 / paso) * paso;
    ponerDosis(S.dose, null);
  }
  function ponerDosis(v, desde) {
    if (!Number.isFinite(v) || v < 0) return;
    S.dose = +v.toPrecision(6);
    if (desde !== 'rango') $('dose').value = S.dose;
    if (desde !== 'texto') $('doseIn').value = S.dose;
  }

  function aplicarPreset(compensar) {
    const p = PRESET[S.tipo];
    for (const k in p) if (!tocado.has(k)) $(k).value = p[k];
    const leñoso = S.tipo !== 'barra';
    // ocultar o mostrar la escena no debe mover lo que el usuario tiene bajo el dedo
    const antes = $('cult').getBoundingClientRect().top;
    $('trvBox').hidden = !leñoso;
    $('scene').hidden = false;
    const salto = $('cult').getBoundingClientRect().top - antes;
    if (compensar && Math.abs(salto) > 1) window.scrollBy(0, salto);
    $('nozHint').textContent = leñoso
      ? 'Caudal por boquilla = caldo × velocidad × ancho ÷ (600 × boquillas). La tabla es de boquillas de abanico; en atomizador con boquillas de cono, usa el caudal por boquilla con la tabla del fabricante.'
      : 'Caudal por boquilla = caldo × velocidad × ancho ÷ (600 × boquillas). Presión estimada con la ley del cuadrado: el caudal sube con la raíz de la presión. Lo habitual en abanico es trabajar entre 2 y 5 bar.';
    escena.preparar();
  }

  // ---- buscador de productos (ventana) y tabla completa (plegada) ----
  const lineaUso = u => [rango(u), u[6] ? `caldo ${nf(u[6])}–${nf(u[7] || u[6])} L/ha` : null,
    u[8] ? `${u[8]} aplic.` : null, u[10] != null ? `P. S. ${u[10]} d` : null].filter(Boolean).join(' · ');
  let modo = 'producto';
  function pintarLista() {
    const q = slug($('buscar').value);
    if (modo === 'plaga') {
      const lista = S.plagas.filter(p => !q || slug(p.n + ' ' + p.c).includes(q));
      $('dlgHint').textContent = q ? `${lista.length} de ${S.plagas.length}` : `${S.plagas.length} plagas, enfermedades y malas hierbas con productos autorizados en ${S.cultivo.n.toLowerCase()}`;
      $('list').innerHTML = lista.length ? lista.map((p, i) => `<li><button type="button" data-i="${i}" aria-current="${p.n === S.plaga}"><b>${esc(p.n)}</b>
        <span class="cc-li-d">${p.c ? esc(p.c) + ' · ' : ''}${p.k} producto${p.k === 1 ? '' : 's'}</span></button></li>`).join('')
        : `<li class="cc-empty">Nada coincide con «${esc($('buscar').value)}».</li>`;
      $('list').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        $('dlg').close(); S.plaga = lista[+b.dataset.i].n; alCambiarPlaga(false); $('pick').focus({preventScroll:true});
      }));
      return;
    }
    // productos: sin búsqueda, agrupados por materia activa; con búsqueda, en lista plana
    const ma = u => (prod(u)[3] || 'Materia activa sin indicar en la ficha');
    let lista = usosDePlaga().filter(u => !q || slug(prod(u)[0] + ' ' + prod(u)[3] + ' ' + u[0]).includes(q));
    if (!q) lista = lista.slice().sort((a, b) => ma(a).localeCompare(ma(b), 'es') || prod(a)[0].localeCompare(prod(b)[0], 'es'));
    $('dlgHint').textContent = q ? `${lista.length} de ${usosDePlaga().length} usos` : `${S.plaga} en ${S.cultivo.n.toLowerCase()} · por materia activa`;
    let grupo = null;
    $('list').innerHTML = lista.length ? lista.map((u, i) => {
      const p = prod(u), cab = !q && ma(u) !== grupo ? `<li class="cc-grp">${esc(grupo = ma(u))}</li>` : '';
      return `${cab}<li><button type="button" data-i="${i}" aria-current="${u === S.uso}"><b>${esc(p[0])}</b>
        <span class="cc-sub">${q ? esc(p[3] || p[1]) + ' · ' : ''}nº ${esc(u[0])} · ${esc(p[1])}</span><span class="cc-li-d">${lineaUso(u)}</span></button></li>`;
    }).join('') : `<li class="cc-empty">Ningún producto autorizado contra esta plaga coincide con «${esc($('buscar').value)}».</li>`;
    $('list').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      $('dlg').close(); elegir(lista[+b.dataset.i]); $('doseIn').focus({preventScroll:true});
    }));
  }
  function abrirLista(que) {
    modo = que;
    $('dlgT').textContent = que === 'plaga' ? 'Plaga, enfermedad o mala hierba' : 'Productos autorizados';
    $('buscar').placeholder = que === 'plaga' ? 'Buscar por nombre común o científico' : 'Buscar por producto o materia activa';
    $('buscar').setAttribute('aria-label', $('buscar').placeholder);
    $('buscar').value = '';
    pintarLista();
    if ($('dlg').showModal) $('dlg').showModal(); else $('dlg').setAttribute('open', '');
    $('list').scrollTop = 0;
    $('buscar').focus();
  }
  function pintarTabla() {
    const lista = usosDePlaga();
    $('usesBody').innerHTML = lista.map((u, i) => {
      const p = prod(u);
      return `<tr data-i="${i}" tabindex="0" aria-selected="${u === S.uso}">
        <td><span class="cc-pn">${esc(p[0])}</span><span class="cc-sub">Nº ${esc(u[0])} · ${esc(p[3] || p[1])}</span></td>
        <td class="cc-m">${rango(u)}</td>
        <td class="cc-m">${u[6] ? `${nf(u[6])}–${nf(u[7] || u[6])} L/ha` : '—'}</td>
        <td class="cc-m">${u[8] ?? '—'}${u[9] ? ` · ${u[9]} d` : ''}</td>
        <td class="cc-m">${u[10] != null ? u[10] + ' d' : '—'}</td></tr>`;
    }).join('');
    [...$('usesBody').rows].forEach(tr => {
      const ir = () => { elegir(lista[+tr.dataset.i]); $('pick').scrollIntoView({block:'center', behavior:'smooth'}); };
      tr.addEventListener('click', ir);
      tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } });
    });
  }

  // ---- cálculo ----
  function calcular() {
    const u = S.uso;
    if (!u) {
      $('perTank').innerHTML = '—'; $('prodLine').textContent = 'Elige un producto de la lista.';
      ['tanks', 'checks'].forEach(id => $(id).innerHTML = ''); $('tanksLine').textContent = '';
      return;
    }
    const p = prod(u), unidad = unidadProd(u);
    const ha = Math.max(0, val('ha') || 0), caldo = pos('caldo', PRESET[S.tipo].caldo), cuba = pos('cuba', PRESET[S.tipo].cuba);

    const porHa = u[3] === 'ha' ? S.dose : S.dose * caldo / 100 / 1000;
    const caldoTot = ha * caldo, total = porHa * ha, porCuba = porHa * cuba / caldo;
    const llenas = Math.floor(caldoTot / cuba), resto = caldoTot - llenas * cuba;
    const nCubas = Math.max(1, llenas + (resto > 1 ? 1 : 0));
    const dec = v => v < 10 ? 2 : 1;

    // sin ninguna cuba llena, lo que importa es lo que va en la única que se prepara
    const unaSola = ha > 0 && llenas === 0;
    const enCuba = unaSola ? total : porCuba;
    $('perTankK').textContent = unaSola ? 'Producto en la cuba' : 'Producto en cada cuba llena';
    $('perTank').innerHTML = `${nf(enCuba, dec(enCuba))}<small>${unidad}</small>`;
    $('prodLine').innerHTML = `de <b>${esc(p[0])}</b> en ${nf(unaSola ? resto : cuba)} L de agua`;
    $('tanks').innerHTML = Array.from({length:Math.min(nCubas, 30)}, (_, i) => {
      const h = i < llenas ? 100 : Math.max(6, resto / cuba * 100);
      return `<div class="cc-tk"><span style="height:${h}%"></span></div>`;
    }).join('');
    const ultima = resto > 1 ? ` y una última de <b>${nf(resto)} L</b> con <b>${nf(porHa * resto / caldo, 2)} ${unidad}</b>` : '';
    $('tanksLine').innerHTML = ha > 0
      ? (llenas ? `<b>${nf(llenas)} cuba${llenas === 1 ? '' : 's'} llena${llenas === 1 ? '' : 's'}</b>${ultima}` : `Una cuba de <b>${nf(resto)} L</b> con <b>${nf(total, 2)} ${unidad}</b>`)
      : 'Pon la superficie para saber cuántas cubas salen.';
    $('kTot').textContent = `${nf(total, 1)} ${unidad}`;
    $('kHa').textContent = `${nf(porHa, 2)} ${unidad}/ha`;
    $('kCaldo').textContent = `${nf(caldoTot)} L`;

    // comprobaciones: avisan, no bloquean
    const ck = [], cult = S.cultivo.n.toLowerCase();
    if (S.dose > u[5]) ck.push(['bad', `Dosis de ${nx(S.dose)} ${unidadDosis(u)}: el máximo autorizado en ${cult} es ${nx(u[5])} ${unidadDosis(u)}.`]);
    else if (S.dose < u[4]) ck.push(['warn', `Dosis por debajo del mínimo de la etiqueta (${nx(u[4])} ${unidadDosis(u)}). Puede perder eficacia.`]);
    else ck.push(['ok', `Dosis dentro de lo autorizado (${rango(u)}).`]);
    if (u[6]) {
      const cmax = u[7] || u[6];
      if (caldo < u[6] || caldo > cmax) ck.push(['warn', `Caldo de ${nf(caldo)} L/ha fuera del rango de la etiqueta (${nf(u[6])}–${nf(cmax)} L/ha).`]);
      else ck.push(['ok', 'Caldo dentro del rango de la etiqueta.']);
    }
    if (u[3] === 'hl') ck.push(['ok', `La etiqueta da la dosis por hectolitro: con ${nf(caldo)} L/ha salen ${nf(porHa, 2)} ${unidad}/ha.`]);
    if (u[8]) ck.push(['warn', `Máximo ${u[8]} aplicaci${u[8] === 1 ? 'ón' : 'ones'} por campaña${u[9] ? `, separadas ${u[9]} días` : ''}. Con el cuaderno, te avisamos de cuántas llevas.`]);
    const nombre = {ok:'Bien', warn:'Ojo', bad:'Fuera'};
    $('checks').innerHTML = ck.map(([s, t]) => `<div class="cc-chk"><span class="cc-pill is-${s}">${nombre[s]}</span><span>${t}</span></div>`).join('');
    const peor = ck.some(c => c[0] === 'bad') ? 'bad' : ck.some(c => c[0] === 'warn' && (c[1].startsWith('Dosis') || c[1].startsWith('Caldo de'))) ? 'warn' : 'ok';
    $('barKg').textContent = `${nf(enCuba, dec(enCuba))} ${unidad}${unaSola ? ' en la cuba' : ' por cuba'}`;
    $('barN').textContent = ha > 0 ? `${nCubas} cuba${nCubas === 1 ? '' : 's'} · ${nf(total, 1)} ${unidad} en total` : 'Pon la superficie';
    $('barSt').className = `cc-pill is-${peor}`; $('barSt').textContent = nombre[peor];
    S.hayResultado = true; barra();

    // volumen de copa
    const trv = pos('alto', 3) * pos('ancho', 3) * 10000 / pos('calle', 5);
    const rec = Math.round(trv * pos('fac', .05) / 10) * 10;
    $('trvV').textContent = `${nf(trv)} m³/ha`; $('trvC').textContent = `${nf(rec)} L/ha`; $('trvUse').dataset.v = rec;

    // pulverizador
    const vel = pos('vel', 5), anchoT = pos('anchoT', 5), nb = Math.max(1, Math.round(pos('nb', 1)));
    const qt = caldo * vel * anchoT / 600, qb = qt / nb;
    $('qb').textContent = `${nf(qb, 2)} L/min`; $('qt').textContent = `${nf(qt, 1)} L/min`;
    let mejor = null;
    $('nozBody').innerHTML = NOZ.map(([c, col, q3]) => {
      const bar = 3 * (qb / q3) ** 2, ok = bar >= 2 && bar <= 5;
      if (ok && !mejor) mejor = {c, col, bar};
      const s = ok ? '<span class="cc-pill is-ok">Encaja</span>' : `<span class="cc-pill is-warn">${bar < 2 ? 'Poca presión' : 'Demasiada'}</span>`;
      return `<tr><td class="cc-m">${c} · ${col}</td><td class="cc-m">${nf(q3, 2)} L/min</td><td class="cc-m">${nf(bar, 1)} bar</td><td>${s}</td></tr>`;
    }).join('');

    // orden
    const hoy = new Date(), cosecha = new Date(hoy);
    cosecha.setDate(cosecha.getDate() + (u[10] || 0));
    const fd = x => x.toLocaleDateString('es-ES', {day:'numeric', month:'short', year:'numeric'});
    const orden = {
      Parcela: $('parcela').value.trim() || '—',
      Cultivo: `${S.cultivo.n} · ${nf(ha, 2)} ha`,
      Motivo: S.plaga + (u[2] ? ` (${u[2]})` : ''),
      Producto: `${p[0]} (nº ${u[0]})`,
      Dosis: `${nx(S.dose)} ${unidadDosis(u)} = ${nf(porHa, 2)} ${unidad}/ha`,
      Caldo: `${nf(caldo)} L/ha · ${nf(caldoTot)} L en total`,
      'Por cuba': `${nf(porCuba, 2)} ${unidad} en ${nf(cuba)} L · ${nCubas} cuba${nCubas === 1 ? '' : 's'}` + (resto > 1 && llenas ? ` (la última de ${nf(resto)} L con ${nf(porHa * resto / caldo, 2)} ${unidad})` : ''),
      Boquillas: mejor ? `${nb} × ISO ${mejor.c} (${mejor.col}) a ${nf(mejor.bar, 1)} bar · ${nf(vel, 1)} km/h` : `${nf(qb, 2)} L/min por boquilla: revisa la tabla del fabricante`,
      'No cosechar antes': u[10] ? `${fd(cosecha)} (${u[10]} días)` : 'sin plazo en la etiqueta'
    };
    $('oDate').textContent = fd(hoy);
    const ids = {Parcela:'oParc', Cultivo:'oCult', Motivo:'oPlaga', Producto:'oProd', Dosis:'oDose', Caldo:'oCaldo', 'Por cuba':'oTank', Boquillas:'oNoz', 'No cosechar antes':'oPS'};
    for (const k in ids) $(ids[k]).textContent = orden[k];
    const texto = `*Orden de tratamiento* · ${fd(hoy)}\n` + Object.entries(orden).map(([k, v]) => `${k}: ${v}`).join('\n') +
      `\n\nLa etiqueta del producto manda. Calculado con fnfanalytics.com/herramientas/calculadora-caldo`;
    $('wa').href = 'https://wa.me/?text=' + encodeURIComponent(texto);

    history.replaceState(null, '', `?cultivo=${S.cultivo.s}&plaga=${slug(S.plaga)}&producto=${encodeURIComponent(u[0])}`);

    escena.actualizar({
      cult:S.tipo, alto:pos('alto', 3), ancho:pos('ancho', 3), calle:pos('calle', 5), caldo, cuba,
      ha, nT:nCubas, rest:resto, perTank:porCuba, unitP:unidad, qt, vel, trv, anchoT, nb,
      bad:ck.some(c => c[0] === 'bad')
    });
  }

  // ---- escena 3D: three.js y la escena se cargan solo cuando la sección se acerca a la pantalla ----
  const escena = (() => {
    let api = null, ultimo = null, pedido = false;
    const cargar = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
    function arrancar() {
      if (pedido) return; pedido = true;
      cargar('/assets/vendor/three-r128.min.js').then(() => cargar('/assets/calculadora-3d.js')).then(() => {
        api = window.FnfEscena && window.FnfEscena.montar();
        if (!api) { $('scene').hidden = true; return; }
        $('sceneLoading').remove();
        if (ultimo) api.update(ultimo);
      }).catch(() => { $('scene').hidden = true; });
    }
    return {
      preparar() {
        if (pedido) return;
        if (!('IntersectionObserver' in window)) return arrancar();
        const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); arrancar(); } }, {rootMargin:'300px'});
        io.observe($('scene'));
      },
      actualizar(st) { ultimo = st; if (api) api.update(st); }
    };
  })();

  // ---- barra inferior (móvil): visible mientras el resultado no está a la vista ----
  const enVista = new Set();
  function barra() { $('bar').hidden = !S.hayResultado || enVista.size > 0; }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? enVista.add(e.target) : enVista.delete(e.target)); barra(); });
    io.observe($('tankCard')); io.observe($('orden'));
  }

  // ---- eventos ----
  const tocado = new Set();
  $('cult').addEventListener('change', () => alCambiarCultivo(false));
  $('plagaBtn').addEventListener('click', () => abrirLista('plaga'));
  $('pick').addEventListener('click', () => abrirLista('producto'));
  $('buscar').addEventListener('input', pintarLista);
  $('dlgX').addEventListener('click', () => $('dlg').close());
  $('dlg').addEventListener('click', e => { if (e.target === $('dlg')) $('dlg').close(); });
  $('allBox').addEventListener('toggle', () => { if ($('allBox').open) pintarTabla(); });
  $('dose').addEventListener('input', () => { ponerDosis(parseFloat($('dose').value), 'rango'); calcular(); });
  $('doseIn').addEventListener('input', () => { ponerDosis(parseFloat($('doseIn').value), 'texto'); calcular(); });
  $('doseMinus').addEventListener('click', () => { ponerDosis(Math.max(0, S.dose - S.pasoBoton), null); calcular(); });
  $('dosePlus').addEventListener('click', () => { ponerDosis(S.dose + S.pasoBoton, null); calcular(); });
  ['ha', 'caldo', 'cuba', 'parcela', 'calle', 'alto', 'ancho', 'fac', 'vel', 'anchoT', 'nb'].forEach(id =>
    $(id).addEventListener('input', () => { tocado.add(id); calcular(); }));
  $('trvUse').addEventListener('click', () => { $('caldo').value = $('trvUse').dataset.v; tocado.add('caldo'); calcular(); });
  $('print').addEventListener('click', () => window.print());
  $('bar').addEventListener('click', () => $('tankCard').scrollIntoView({block:'center', behavior:'smooth'}));

  cargarIndice().then(() => alCambiarCultivo(true)).catch(() => {
    $('pickName').textContent = 'No se han podido cargar los productos autorizados. Recarga la página.';
  });
})();

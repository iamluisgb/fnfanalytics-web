// Filtros de la guía de fuentes (fuentes-datos-publicos): busca, «para qué» y acceso.
// Sin JS la página enseña todas las tablas; el estado viaja en la URL (?para=clima&f=libre,api&q=ndvi).
(() => {
  const caja = document.getElementById('fdFiltros');
  if (!caja) return;
  const q = document.getElementById('fdQ'), cuenta = document.getElementById('fdN');
  const limpiar = document.getElementById('fdLimpiar'), vacio = document.getElementById('fdVacio');
  const norm = t => t.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tablas = [...document.querySelectorAll('.fuentes:not(.cifras)')].map(t => {
    let h = t.previousElementSibling; while (h && h.tagName !== 'H2') h = h.previousElementSibling;
    const nota = t.nextElementSibling && t.nextElementSibling.matches('.fd-nota') ? t.nextElementSibling : null;
    return { t, h, nota, filas: [...t.querySelectorAll('tr[data-para]')].map(r => [r, norm(r.textContent)]) };
  });
  const total = tablas.reduce((n, x) => n + x.filas.length, 0);
  const paras = [...caja.querySelectorAll('[data-para]')], flags = [...caja.querySelectorAll('[data-f]')];
  const st = { para: '', f: new Set(), q: '' };

  const url = new URLSearchParams(location.search);
  if (paras.some(b => b.dataset.para === url.get('para'))) st.para = url.get('para');
  (url.get('f') || '').split(',').forEach(f => flags.some(b => b.dataset.f === f) && st.f.add(f));
  st.q = q.value = url.get('q') || '';

  let medido = false, espera;
  function pinta(tocado) {
    const t = norm(st.q.trim());
    let n = 0;
    tablas.forEach(x => {
      let m = 0;
      x.filas.forEach(([r, txt]) => {
        const ok = (!st.para || r.dataset.para.split(' ').includes(st.para))
          && (!st.f.has('libre') || r.dataset.libre === '1')
          && (!st.f.has('api') || r.dataset.acceso === 'api')
          && (!st.f.has('probado') || r.dataset.probado === '1')
          && (!t || txt.includes(t));
        r.hidden = !ok; if (ok) m++;
      });
      [x.t, x.h, x.nota].forEach(el => el && (el.hidden = m === 0));
      n += m;
    });
    paras.forEach(b => b.setAttribute('aria-pressed', b.dataset.para === st.para));
    flags.forEach(b => b.setAttribute('aria-pressed', st.f.has(b.dataset.f)));
    const filtrado = st.para || st.f.size || t;
    cuenta.textContent = filtrado ? `${n} de ${total} fuentes` : `${total} fuentes`;
    limpiar.hidden = !filtrado; vacio.hidden = n > 0;
    const u = new URLSearchParams();
    if (st.para) u.set('para', st.para);
    if (st.f.size) u.set('f', [...st.f].join(','));
    if (st.q.trim()) u.set('q', st.q.trim());
    const qs = u.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    // Umami: un evento por visita al primer filtro, y el detalle de cada cambio con pausa
    if (tocado && window.umami) {
      if (!medido) { medido = true; umami.track('fuentes-filtra'); }
      clearTimeout(espera);
      espera = setTimeout(() => umami.track('fuentes-filtro', { para: st.para || 'todo', f: [...st.f].join(',') || '-', q: st.q.trim().slice(0, 40) || '-', n }), 1500);
    }
  }

  paras.forEach(b => b.addEventListener('click', () => { st.para = b.dataset.para; pinta(true); }));
  flags.forEach(b => b.addEventListener('click', () => { st.f.has(b.dataset.f) ? st.f.delete(b.dataset.f) : st.f.add(b.dataset.f); pinta(true); }));
  q.addEventListener('input', () => { st.q = q.value; pinta(true); });
  limpiar.addEventListener('click', () => { st.para = ''; st.f.clear(); st.q = q.value = ''; pinta(true); q.focus(); });
  caja.hidden = false;
  pinta(false);
})();

// Buscador de las páginas de usos (usos/): filtra las filas de la tabla por cualquier texto.
(() => {
  const q = document.getElementById('filtro'), filas = document.getElementById('filas');
  if (!q || !filas) return;
  const norm = t => t.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const rows = [...filas.rows].map(r => [r, norm(r.textContent)]);
  const total = document.getElementById('filtroN').textContent;
  q.addEventListener('input', () => {
    const t = norm(q.value.trim());
    let n = 0;
    rows.forEach(([r, txt]) => { const ok = !t || txt.includes(t); r.hidden = !ok; if (ok) n++; });
    document.getElementById('filtroN').textContent = t ? `${n} de ${rows.length} usos` : total;
    document.getElementById('filtroVacio').hidden = n > 0;
  });
})();

// Uso: node medir.mjs <carpeta-salida> — axe, consola, peticiones fallidas y capturas a 375 y 1440.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
import fs from 'fs';
const out = process.argv[2]; fs.mkdirSync(out + '/capturas', { recursive: true });
const B = 'http://localhost:8765';
const PAGS = [['portada','/'],['calculadora','/herramientas/calculadora-caldo'],['direccion','/herramientas/direccion-de-trabajo'],
 ['usos-repilo','/usos/olivo/repilo-del-olivo'],['usos-indice','/usos/'],['usos-olivo','/usos/olivo/'],['metodo','/metodo'],['fuentes','/fuentes-datos-publicos'],
 ['asesores','/asesores'],['cuaderno','/cuaderno-digital'],['plantillas','/plantillas/'],['plantilla-trat','/plantillas/parte-de-tratamiento-fitosanitario'],['creador','/plantillas/creador'],
 ['privacidad','/privacidad'],['aviso-legal','/aviso-legal'],['404','/no-existe'],['demo','/demo/inteligencia.html']];
const solo = process.argv[3] ? process.argv[3].split(',') : null;
const b = await chromium.launch();
const res = {};
for (const [n, ruta] of PAGS) {
  if (solo && !solo.includes(n)) continue;
  res[n] = {};
  for (const [vp, w, h] of [['movil', 375, 812], ['escritorio', 1440, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: vp === 'movil', hasTouch: vp === 'movil' });
    const p = await ctx.newPage();
    const consola = [], fallos = [];
    p.on('console', m => { if (m.type() === 'error') consola.push(m.text().slice(0, 300)); });
    p.on('pageerror', e => consola.push('EXC ' + String(e).slice(0, 300)));
    p.on('requestfailed', r => fallos.push(r.url().slice(0, 120) + ' ' + (r.failure()?.errorText || '')));
    p.on('response', r => { if (r.status() >= 400) fallos.push(r.status() + ' ' + r.url().slice(0, 120)); });
    try { await p.goto(B + ruta, { waitUntil: 'load', timeout: 30000 }); } catch (e) { consola.push('GOTO ' + e.message.slice(0, 100)); }
    await p.waitForTimeout(1500);
    // baja por la página para disparar lo diferido
    await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); });
    await p.waitForTimeout(1200);
    let axe = [];
    try { const r = await new AxeBuilder({ page: p }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze();
      axe = r.violations.map(v => ({ id: v.id, impacto: v.impact, n: v.nodes.length, ej: v.nodes.slice(0, 3).map(x => x.target.join(' ') + ' | ' + (x.any[0]?.message || x.all[0]?.message || x.none[0]?.message || '').slice(0, 140)) })); } catch (e) { axe = [{ id: 'ERROR', ej: [e.message.slice(0, 200)] }]; }
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
    await p.screenshot({ path: `${out}/capturas/${n}-${w}.png`, fullPage: true }).catch(() => {});
    res[n][vp] = { axe, consola: [...new Set(consola)], fallos: [...new Set(fallos)], desborde: ancho > w ? ancho : 0 };
    await ctx.close();
  }
}
await b.close();
fs.writeFileSync(out + '/axe-consola.json', JSON.stringify(res, null, 1));
for (const [n, r] of Object.entries(res)) for (const [vp, d] of Object.entries(r))
  console.log(`${n} ${vp}: axe=${d.axe.map(a => a.id + '(' + a.n + ')').join(',') || '-'} consola=${d.consola.length} fallos=${d.fallos.length} desborde=${d.desborde}`);

import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); const b = await chromium.launch();
for (const [u, w] of [['/', 1440], ['/', 375], ['/herramientas/calculadora-caldo', 1440], ['/herramientas/calculadora-caldo', 375], ['/fuentes-datos-publicos', 1440], ['/herramientas/direccion-de-trabajo', 375]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 812 : 900 }, isMobile: w < 600 }); const p = await ctx.newPage();
  await p.addInitScript(() => { window.__cls = 0; window.__src = {}; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; for (const s of e.sources) { const k = s.node && (s.node.id || s.node.className || s.node.nodeName); if (e.value > .005) window.__src[k] = +(e.value).toFixed(3); } } }).observe({ type: 'layout-shift', buffered: true }); });
  await p.goto('http://localhost:8765' + u, { waitUntil: 'load' }); await p.waitForTimeout(9000);
  console.log(u, w, 'CLS', (await p.evaluate(() => window.__cls)).toFixed(3), JSON.stringify(await p.evaluate(() => window.__src)));
  await ctx.close(); }
await b.close();

import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); const { AxeBuilder } = require('@axe-core/playwright');
const b = await chromium.launch();
for (const u of ['/', '/metodo', '/asesores', '/cuaderno-digital', '/privacidad', '/404x']) {
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, colorScheme: 'dark' }); const p = await ctx.newPage();
  await p.goto('http://localhost:8765' + u); await p.waitForTimeout(800);
  await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } });
  await p.waitForTimeout(u === '/' ? 12000 : 500);
  const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).exclude('#ig-frame').analyze();
  console.log(u, r.violations.map(v => v.id + '(' + v.nodes.length + '): ' + v.nodes.slice(0, 4).map(n => n.target.join(' ') + ' ' + (n.any[0]?.message || '').replace(/Element has insufficient color contrast of /, '').slice(0, 75)).join(' || ')).join('\n   ') || 'sin fallos');
  if (u === '/') await p.screenshot({ path: process.argv[2] + '/portada-oscuro-375.png', fullPage: true });
  await ctx.close();
}
await b.close();

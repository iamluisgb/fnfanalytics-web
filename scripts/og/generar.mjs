// Genera herramientas/og-calculadora.jpg (1200×630) con la escena real de la calculadora.
// Necesita Playwright y un servidor local en la raíz del repo:
//   python3 -m http.server 8765   y   node scripts/og/generar.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
const base = 'http://localhost:8765';
const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport:{width:1500, height:1000}, deviceScaleFactor:1});
await p.goto(base + '/herramientas/calculadora-caldo.html?cultivo=olivo&plaga=repilo-del-olivo&producto=12612');
await p.waitForTimeout(6500);
await p.addStyleTag({content:'.cc-hud,.cc-ctrl,.cc-lbl,.cc-scene-bad{display:none!important}'});
await p.waitForTimeout(400);
await p.locator('#stage').screenshot({path:'scripts/og/escena.png'});
const kg = (await p.textContent('#perTank')).replace(/([0-9,]+)\s*(\w+)/, '$1 $2');
const prod = (await p.textContent('#pickName')).trim();
const o = await b.newPage({viewport:{width:1200, height:630}});
await o.goto(`${base}/scripts/og/plantilla.html?img=escena.png&kg=${encodeURIComponent(kg)}&prod=${encodeURIComponent(prod)}`);
await o.waitForTimeout(800);
await o.screenshot({path:'scripts/og/og.png'});
await b.close();
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', 'scripts/og/og.png', '--out', 'herramientas/og-calculadora.jpg']);
console.log('herramientas/og-calculadora.jpg', kg, prod);

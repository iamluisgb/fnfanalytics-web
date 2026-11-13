// Pruebas de los flujos tocados. Uso: node flujos.mjs
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const B = 'http://localhost:8765'; const b = await chromium.launch(); let fallos = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLO') + ' ' + m); if (!c) fallos++; };
for (const [vp, w, h] of [['móvil', 375, 812], ['escritorio', 1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await ctx.addInitScript(() => { const r = window.requestAnimationFrame; window.__raf = 0; window.requestAnimationFrame = f => { window.__raf++; return r(f); }; });
  let cuerpo = null, modo = 'ok';
  await p.route(/fnf-formulario/, async r => { if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } }); cuerpo = JSON.parse(r.request().postData() || '{}'); if (modo === 'ok') await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}', headers: { 'access-control-allow-origin': '*' } }); else await r.fulfill({ status: 500, body: 'x', headers: { 'access-control-allow-origin': '*' } }); });
  await p.route('**/cloud.umami.is/**', r => r.abort());
  // --- portada
  await p.goto(B + '/?origen=calculadora', { waitUntil: 'load' }); await p.waitForTimeout(800);
  ok(!(await p.getAttribute('#ig-frame', 'src')), `[${vp}] el marco 3D no se pide al cargar`);
  ok(!(await p.getAttribute('#sig image', 'href')), `[${vp}] la ortofoto del mapa no se pide al cargar`);
  await p.keyboard.press('Tab');
  ok(await p.evaluate(() => document.activeElement.className === 'saltar' && document.activeElement.getBoundingClientRect().top >= 0), `[${vp}] primer tabulador: «Saltar al contenido» visible`);
  // formulario: errores
  await p.locator('#acceso').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await p.click('#waitform button[type=submit]');
  ok((await p.textContent('#wait-err')) === 'Elige quién eres.' && await p.evaluate(() => document.activeElement.name === 'perfil' && document.activeElement.getAttribute('aria-invalid') === 'true'), `[${vp}] formulario vacío: aviso y foco en el perfil`);
  await p.selectOption('#waitform select', 'Agricultor/a'); await p.fill('#waitform input[name=email]', 'mal@'); await p.click('#waitform button[type=submit]');
  ok((await p.textContent('#wait-err')) === 'Ese correo no parece completo.' && await p.evaluate(() => document.activeElement.name === 'email'), `[${vp}] correo incompleto: aviso y foco en el correo`);
  await p.fill('#waitform input[name=email]', 'prueba@example.com'); await p.click('#waitform button[type=submit]');
  ok((await p.textContent('#wait-err')).includes('política de privacidad') && cuerpo === null, `[${vp}] sin consentimiento no se envía`);
  await p.check('#waitform input[name=consent]');
  modo = 'falla'; await p.click('#waitform button[type=submit]'); await p.waitForTimeout(500);
  ok(await p.isVisible('#err') && (await p.getAttribute('#wait-salida', 'href')).startsWith('mailto:') && await p.isEnabled('#waitform button[type=submit]'), `[${vp}] si el servidor falla: aviso, correo ya redactado y botón activo`);
  modo = 'ok'; cuerpo = null; await p.click('#waitform button[type=submit]'); await p.waitForTimeout(500);
  ok(await p.isVisible('#ok') && !(await p.isVisible('#waitform')) && cuerpo && cuerpo.origen === 'calculadora' && cuerpo.perfil === 'Agricultor/a' && cuerpo.email === 'prueba@example.com' && cuerpo.novedades === 'no', `[${vp}] envío correcto: mensaje de recibido y datos con origen=calculadora`);
  // demo de inteligencia
  await p.goto(B + '/', { waitUntil: 'load' });
  await p.locator('#inteligencia').scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  await p.locator('#ig-frame').scrollIntoViewIfNeeded(); await p.waitForTimeout(6000);
  const f = p.frameLocator('#ig-frame');
  ok((await p.getAttribute('#ig-frame', 'src') || '').includes('/demo/inteligencia.html?v='), `[${vp}] el marco 3D se carga al acercarse`);
  ok(await f.locator('#escena canvas').count() === 1 && (await f.locator('#pasos li').count()) > 0, `[${vp}] la demo arranca: escena 3D y pasos del razonamiento`);
  const fr = p.frames().find(x => x.url().includes('/demo/inteligencia'));
  const a1 = await fr.evaluate(() => window.__raf); await p.waitForTimeout(3000); const a2 = await fr.evaluate(() => window.__raf);
  ok(a2 - a1 >= 1, `[${vp}] a la vista, la escena se anima (${a2 - a1} cuadros/s en este equipo sin GPU)`);
  if (w > 600) {
  await f.locator('#saltar').click({ timeout: 8000, noWaitAfter: true }).catch(() => {}); await p.waitForTimeout(4000);
  await f.locator('#escs button[data-esc=otono]').click({ noWaitAfter: true }); await p.waitForTimeout(2500);
  ok(p.url().endsWith('#inteligencia-otono'), `[${vp}] cambiar de escenario reescribe el enlace (#inteligencia-otono)`);
  await f.locator('button.ir').first().click({ noWaitAfter: true }); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => document.getElementById('ig-frame').classList.contains('ig-grande')), `[${vp}] «Ver en grande» pone el marco a pantalla completa`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(2500);
  const sigue = await p.evaluate(() => document.getElementById('ig-frame').classList.contains('ig-grande'));
  if (sigue) { await fr.evaluate(() => window.postMessage({ ig: 'salir' }, location.origin)); await p.waitForTimeout(2500); }
  ok(!(await p.evaluate(() => document.getElementById('ig-frame').classList.contains('ig-grande'))), `[${vp}] se sale de «Ver en grande»${sigue ? ' (con el mensaje de la portada; Esc dentro del marco no llegó)' : ' con Esc'}`);
  }
  await p.locator('#acceso').scrollIntoViewIfNeeded(); await p.waitForTimeout(4000);
  const b1 = await fr.evaluate(() => window.__raf); await p.waitForTimeout(1500); const b2 = await fr.evaluate(() => window.__raf);
  ok(b2 - b1 <= 2, `[${vp}] con la demo fuera de pantalla deja de pintar (${b2 - b1} cuadros en 1,5 s)`);
  await p.locator('#ig-frame').scrollIntoViewIfNeeded(); await p.waitForTimeout(3000);
  const c1 = await fr.evaluate(() => window.__raf); await p.waitForTimeout(3000); const c2 = await fr.evaluate(() => window.__raf);
  ok(c2 - c1 >= 1, `[${vp}] al volver, la escena se reanuda`);
  // analítica
  await p.locator('#sig').scrollIntoViewIfNeeded(); await p.waitForTimeout(1000);
  ok((await p.getAttribute('#sig image', 'href')) === '/assets/mapa-frutales.webp', `[${vp}] la ortofoto se carga al acercarse`);
  await p.waitForTimeout(9000);
  await p.locator('#campana-mes').evaluate(el => { el.value = 3; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok((await p.textContent('#campana-fase')) === 'Reposo' && (await p.textContent('#p-v-l')).includes('ene'), `[${vp}] el deslizador de campaña mueve fase y panel`);
  await p.locator('.parcela[data-p="0"]').focus(); await p.keyboard.press('Enter');
  ok((await p.textContent('#p-nom')) === 'La Vega', `[${vp}] elegir parcela con el teclado`);
  // enlace directo a un escenario
  await p.goto('about:blank'); await p.goto(B + '/#inteligencia-otono', { waitUntil: 'load' }); await p.waitForTimeout(500);
  ok((await p.getAttribute('#ig-frame', 'src') || '').endsWith('&esc=otono'), `[${vp}] #inteligencia-otono carga el marco con su escenario`);
  // calculadora
  await p.goto(B + '/herramientas/calculadora-caldo?cultivo=olivo&plaga=repilo&producto=12612', { waitUntil: 'load' }); await p.waitForTimeout(3500);
  ok((await p.textContent('#perTank')).trim().length > 0 && !(await p.locator('#scene').isHidden()), `[${vp}] calculadora: resultado «${(await p.textContent('#perTank')).trim()}» y escena`);
  ok((await p.getAttribute('.nav .btn-primary', 'href')) === '/?origen=calculadora#acceso', `[${vp}] calculadora: el botón de acceso lleva su origen`);
  // fuentes
  await p.goto(B + '/fuentes-datos-publicos', { waitUntil: 'load' }); await p.waitForTimeout(500);
  const antes = await p.locator('tr[data-para]:visible').count();
  await p.locator('.fd-grupo button').filter({ hasText: /clima/i }).first().click(); await p.waitForTimeout(300);
  const despues = await p.locator('tr[data-para]:visible').count();
  ok(antes === 65 && despues < antes && despues > 0 && p.url().includes('para=clima'), `[${vp}] fuentes: filtro «clima» deja ${despues} de ${antes} filas y va en la URL`);
  // usos
  await p.goto(B + '/usos/olivo/repilo-del-olivo', { waitUntil: 'load' });
  const n0 = await p.locator('#filas tr:visible').count(); await p.fill('#filtro', 'curenox'); await p.waitForTimeout(300);
  ok((await p.locator('#filas tr:visible').count()) < n0 && (await p.locator('#filas tr:visible').count()) > 0, `[${vp}] usos: el buscador filtra la tabla`);
  // dirección
  await p.goto(B + '/herramientas/direccion-de-trabajo', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  ok(await p.locator('.leaflet-container').count() === 1, `[${vp}] dirección de trabajo: el mapa se monta (las teselas externas no se pueden pedir desde aquí)`);
  const propios = errs.filter(e => !/ERR_TUNNEL|ERR_FAILED|net::|Failed to load resource|umami/.test(e));
  ok(propios.length === 0, `[${vp}] sin errores propios en consola` + (propios.length ? ': ' + propios.slice(0, 3).join(' | ') : ''));
  await ctx.close();
}
// movimiento reducido
{ const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(B + '/', { waitUntil: 'load' }); await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } }); await p.waitForTimeout(2500);
  ok(await p.locator('.ruta-out li.on').count() === 5 && await p.locator('.ruta-checks li.ok').count() === 5, '[movimiento reducido] diagrama: todo encendido y quieto');
  ok((await p.textContent('#campana-fase')) === 'Postcosecha', '[movimiento reducido] la campaña no se recorre sola');
  const fr = p.frames().find(x => x.url().includes('/demo/inteligencia'));
  ok(fr && await fr.locator('#pasos li').count() > 0 && errs.length === 0, '[movimiento reducido] la demo enseña el razonamiento sin errores');
  await ctx.close(); }
// sin JavaScript
{ const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, javaScriptEnabled: false }); const p = await ctx.newPage();
  await p.goto(B + '/', { waitUntil: 'load' });
  ok(await p.locator('#acceso noscript').count() === 1 && (await p.content()).includes('El formulario necesita JavaScript'), '[sin JS] portada: aviso con el correo en el formulario');
  ok(await p.locator('.faq details[open] .a').isVisible(), '[sin JS] preguntas frecuentes: la primera, abierta');
  await p.goto(B + '/fuentes-datos-publicos'); ok(await p.locator('tr[data-para]:visible').count() === 65, '[sin JS] fuentes: se ven las 65 filas');
  await p.goto(B + '/plantillas/'); ok(await p.locator('.tarjeta a[href^="parte-de-"]').count() >= 5, '[sin JS] plantillas: las cinco tarjetas con enlace a su ficha');
  await p.goto(B + '/usos/olivo/repilo-del-olivo'); ok(await p.locator('#filas tr').count() > 10, '[sin JS] usos: la tabla está en el HTML');
  await ctx.close(); }
await b.close(); console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo correcto'); process.exit(fallos ? 1 : 0);

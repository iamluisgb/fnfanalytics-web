// POST / con JSON plano {campo: valor}. Manda un correo con los campos en tabla y
// Reply-To del correo que deja la persona, para contestarle con «Responder».
// Las claves que empiezan por _ son de control: _subject (asunto) y _honey (trampa).

const MAX_CAMPOS = 20;
const MAX_VALOR = 500;
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cabeceras(origen) {
  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(cuerpo, estado, origen) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json', ...cabeceras(origen) },
  });
}

const escapar = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export default {
  async fetch(request, env) {
    const origen = request.headers.get('Origin') || '';
    const permitidos = env.ALLOWED_ORIGINS.split(',');
    if (!permitidos.includes(origen)) return new Response('Origen no permitido', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabeceras(origen) });
    if (request.method !== 'POST') return json({ ok: false, error: 'método' }, 405, origen);

    const ip = request.headers.get('CF-Connecting-IP') || 'sin-ip';
    const { success } = await env.ENVIOS.limit({ key: ip });
    if (!success) return json({ ok: false, error: 'demasiados envíos' }, 429, origen);

    let datos;
    try {
      datos = await request.json();
    } catch {
      return json({ ok: false, error: 'json' }, 400, origen);
    }
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return json({ ok: false, error: 'json' }, 400, origen);
    // Un bot que rellena la trampa recibe un «ok» y no se manda nada.
    if (datos._honey) return json({ ok: true }, 200, origen);

    const filas = Object.entries(datos)
      .filter(([k, v]) => !k.startsWith('_') && (typeof v === 'string' || typeof v === 'number'))
      .slice(0, MAX_CAMPOS)
      .map(([k, v]) => [k.slice(0, 40), String(v).slice(0, MAX_VALOR)]);
    const email = String(datos.email || '').trim();
    if (!CORREO_RE.test(email)) return json({ ok: false, error: 'correo' }, 400, origen);

    // Sin saltos de línea en el asunto: es una cabecera.
    const asunto = String(datos._subject || 'FnF · formulario de la web').replace(/[\r\n]+/g, ' ').slice(0, 120);
    const text = filas.map(([k, v]) => `${k}: ${v}`).join('\n');
    const html = '<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif">'
      + filas.map(([k, v]) => `<tr><th align="left" style="border-bottom:1px solid #ddd">${escapar(k)}</th><td style="border-bottom:1px solid #ddd">${escapar(v)}</td></tr>`).join('')
      + '</table>';

    try {
      await env.CORREO.send({
        to: env.DESTINO,
        from: { email: env.REMITENTE, name: 'Web de FnF' },
        replyTo: email,
        subject: asunto,
        text,
        html,
      });
    } catch (e) {
      console.error('envío fallido', e && e.message);
      return json({ ok: false, error: 'envío' }, 502, origen);
    }
    return json({ ok: true }, 200, origen);
  },
};

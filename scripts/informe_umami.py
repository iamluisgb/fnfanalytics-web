"""Informe semanal de Umami para fnfanalytics.com: visitas, embudo de la portada, herramientas y usos.

La web comparte propiedad de Umami con luisgonzalezbernal.com y bookreader (el plan gratuito no
admite más webs), así que todo se filtra por hostname=fnfanalytics.com.

Sin clave de API (es de pago): entra como el usuario, con UMAMI_USER y UMAMI_PASSWORD de un
fichero KEY=valor fuera del repo (por defecto ~/workspace/.secrets; otro con UMAMI_SECRETS).
No imprime ni guarda las credenciales ni la sesión.

Uso:  python3 -I scripts/informe_umami.py [días=7] > informe.md
Lo lanza el LaunchAgent com.fnfanalytics.umami (lunes, 7:30) y deja el informe en ~/fnf-mapa-logs/.
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = 'https://cloud.umami.is'
WEB = '08c1619b-4bb8-471b-9dc9-9b6cda88e8ae'
HOST = 'fnfanalytics.com'
# lo que se cuenta de la portada, en el orden en que lo recorre un visitante
EMBUDO = [
    ('ve-inteligencia', 'llega a Inteligencia'),
    ('hero-ver-como-razona', 'pulsa «Ver cómo razona»'),
    ('ig-explora', 'pulsa «Explora la finca»'),
    ('ig-toca', 'toca un punto de la finca'),
    ('ve-analitica', 'llega a Analítica'),
    ('ve-precios', 'llega a Precios'),
    ('ig-solicita-acceso', 'pulsa acceso bajo la demo'),
    ('ve-acceso', 'llega al formulario'),
    ('acceso-enviado', 'envía la solicitud'),
]

op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
H = {'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', 'Origin': BASE, 'Referer': BASE + '/login'}


def pedir(path, data=None):
    req = urllib.request.Request(BASE + path, json.dumps(data).encode() if data is not None else None, H)
    with op.open(req, timeout=30) as r:
        return json.loads(r.read() or b'null')


def entrar():
    f = Path(os.environ.get('UMAMI_SECRETS', Path.home() / 'workspace/.secrets'))
    env = {}
    for linea in f.read_text().splitlines():
        if '=' in linea and not linea.lstrip().startswith('#'):
            k, v = linea.split('=', 1)
            env[k.strip()] = v.strip().strip('"\'')
    pedir('/api/auth/sign-in/email', {'email': env['UMAMI_USER'], 'password': env['UMAMI_PASSWORD']})


def rango(ini, fin):
    return f'startAt={ini}&endAt={fin}&hostname={HOST}'


def metricas(tipo, q, limite=200):
    return {m['x']: m['y'] for m in pedir(f'/api/websites/{WEB}/metrics?type={tipo}&limit={limite}&{q}')}


def delta(a, b):
    if not b:
        return 'nuevo' if a else '='
    p = round((a - b) * 100 / b)
    return f'{p:+d} %'


def tabla(filas, cab):
    out = ['| ' + ' | '.join(cab) + ' |', '|' + '---|' * len(cab)]
    out += ['| ' + ' | '.join(str(c) for c in f) + ' |' for f in filas]
    return '\n'.join(out)


def main():
    dias = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    entrar()
    fin = int(time.time() * 1000)
    ini = fin - dias * 86400000
    q, qa = rango(ini, fin), rango(ini - dias * 86400000, ini)
    s, sa = pedir(f'/api/websites/{WEB}/stats?{q}'), pedir(f'/api/websites/{WEB}/stats?{qa}')
    rebote = lambda x: round(x['bounces'] * 100 / x['visits']) if x['visits'] else 0
    tiempo = lambda x: round(x['totaltime'] / x['visits']) if x['visits'] else 0
    ev, eva = metricas('event', q), metricas('event', qa)
    pag, paga = metricas('path', q), metricas('path', qa)

    print(f'# fnfanalytics.com · últimos {dias} días ({time.strftime("%d-%m-%Y")})\n')
    print(f'Comparado con los {dias} días anteriores. Fuente: Umami, filtrado por {HOST}.\n')
    print(tabla([
        ('Visitantes', s['visitors'], sa['visitors'], delta(s['visitors'], sa['visitors'])),
        ('Visitas', s['visits'], sa['visits'], delta(s['visits'], sa['visits'])),
        ('Páginas vistas', s['pageviews'], sa['pageviews'], delta(s['pageviews'], sa['pageviews'])),
        ('Rebote', f'{rebote(s)} %', f'{rebote(sa)} %', ''),
        ('Tiempo por visita', f'{tiempo(s)} s', f'{tiempo(sa)} s', ''),
    ], ['', 'ahora', 'antes', 'cambio']))

    portada = pag.get('/', 0)
    print('\n## Embudo de la portada\n')
    print(f'Base: {portada} vistas de la portada. Cada evento cuenta una vez por visita.\n')
    print(tabla([(t, ev.get(k, 0), f'{round(ev.get(k, 0) * 100 / portada)} %' if portada else '–', eva.get(k, 0))
                 for k, t in EMBUDO], ['paso', 'ahora', '% de la portada', 'antes']))

    calc = {k: v for k, v in ev.items() if k.startswith('calc-')}
    print('\n## Calculadora de caldo\n')
    print(f'Vistas: {pag.get("/herramientas/calculadora-caldo", 0)} (antes {paga.get("/herramientas/calculadora-caldo", 0)}). '
          f'Dirección de trabajo: {pag.get("/herramientas/direccion-de-trabajo", 0)}.\n')
    if calc:
        print(tabla(sorted(((k, v, eva.get(k, 0)) for k, v in calc.items()), key=lambda f: -f[1]), ['evento', 'ahora', 'antes']))
    else:
        print('Sin eventos de la calculadora.')

    usos = sorted(((p, v) for p, v in pag.items() if p.startswith('/usos/')), key=lambda f: -f[1])
    print('\n## Páginas de usos\n')
    if usos:
        print(tabla([(p, v, paga.get(p, 0)) for p, v in usos[:15]], ['página', 'ahora', 'antes']))
    else:
        print('Ninguna visita a las páginas de usos.')
    nuevas = [p for p in pag if p.startswith('/usos/') and not paga.get(p)]
    if nuevas:
        print(f'\nCon visitas por primera vez: {", ".join(sorted(nuevas)[:20])}.')

    print('\n## De dónde llegan\n')
    ref = sorted(metricas('referrer', q).items(), key=lambda f: -f[1])[:10]
    print(tabla(ref, ['origen', 'visitas']) if ref else 'Solo tráfico directo.')
    ent = sorted(metricas('entry', q).items(), key=lambda f: -f[1])[:10]
    print('\n### Páginas de entrada\n')
    print(tabla(ent, ['página', 'entradas']) if ent else 'Sin datos.')

    otros = {k: v for k, v in ev.items() if not k.startswith('calc-') and k not in dict(EMBUDO)}
    if otros:
        print('\n## Otros eventos\n')
        print(tabla(sorted(otros.items(), key=lambda f: -f[1]), ['evento', 'veces']))


if __name__ == '__main__':
    try:
        main()
    except urllib.error.HTTPError as e:
        sys.exit(f'Umami respondió {e.code}: {e.read()[:200].decode(errors="replace")}')

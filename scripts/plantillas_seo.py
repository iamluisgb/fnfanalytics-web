"""Pone a las páginas de plantillas/ lo que les faltaba para buscadores y medición.

Las plantillas tienen diseño propio (hoja imprimible, sin la cabecera del sitio) y llegaron
sin canonical, sin Open Graph, sin icono, sin Umami y con las cinco fichas sin ningún enlace
entrante (el índice pintaba las tarjetas con JavaScript y solo enlazaba el PDF). Este script
lo añade sin tocar el contenido, y se puede ejecutar las veces que haga falta:

    python3 scripts/plantillas_seo.py

Si las páginas se vuelven a generar fuera de este repo, ejecútalo después.
"""
import html
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DIR = RAIZ / "plantillas"
WEB = "https://fnfanalytics.com"
ANCHO, ALTO = 1400, 989  # las vistas previas de plantillas/pdf/*.png

UMAMI = ('<script defer src="/u/s.js" data-website-id="08c1619b-4bb8-471b-9dc9-9b6cda88e8ae" '
         'data-host-url="https://cloud.umami.is" data-domains="fnfanalytics.com,www.fnfanalytics.com"></script>')

# código, título, texto de la tarjeta, archivo del PDF, página de la ficha
HOJAS = [
    ("R-001", "Parte diario de trabajo y cuadrilla", "La hoja de todos los días: el horario de la cuadrilla, la labor marcada y las excepciones.", "parte_diario_R001_v2", "parte-de-cuadrilla"),
    ("R-002", "Parte de recolección", "Envases y kilos por operario: es lo que se paga y lo que permite calcular el €/kg.", "parte_recoleccion_R002_v2", "parte-de-recoleccion"),
    ("R-003", "Parte de poda y aclareo a destajo", "Los árboles contados, que es el pago. El €/árbol acordado va impreso en la cabecera.", "parte_poda_aclareo_R003_v2", "parte-de-poda-y-aclareo"),
    ("R-004", "Parte de tractorista", "El número de la labor y el horómetro al empezar y al acabar. El gasoil, una vez, al repostar.", "parte_tractorista_R004_v2", "parte-de-tractorista"),
    ("R-005", "Ficha de orden de tratamiento fitosanitario", "El registro legal: una orden por familia, con los productos impresos desde la orden y el equipo de aplicación.", "parte_tratamiento_R005_v2", "parte-de-tratamiento-fitosanitario"),
]

PIE = ('<nav class="pie-sitio" aria-label="Food &amp; Farm Analytics" style="margin-bottom:8px;line-height:2">'
       '<a href="/">Food &amp; Farm Analytics</a> · <a href="/plantillas/">Plantillas</a> · '
       '<a href="/herramientas/calculadora-caldo">Calculadora de caldo</a> · '
       '<a href="/herramientas/direccion-de-trabajo">Dirección de trabajo</a> · <a href="/usos/">Usos autorizados</a> · '
       '<a href="/?origen=plantillas#acceso">Solicita acceso</a></nav>')


def cabeza(ruta, titulo, descripcion, imagen):
    url = WEB + ruta
    e = lambda t: html.escape(html.unescape(t), quote=True)
    return f"""<!-- seo -->
<link rel="canonical" href="{url}">
<meta property="og:title" content="{e(titulo)}">
<meta property="og:description" content="{e(descripcion)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="Food &amp; Farm Analytics">
<meta property="og:image" content="{WEB}{imagen}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
{UMAMI}
<!-- /seo -->
"""


def tarjetas():
    return "\n".join(
        f'    <div class="tarjeta"><div class="prev"><a href="{pag}"><img src="pdf/{pdf}.png" alt="{html.escape(tit)}" '
        f'width="{ANCHO}" height="{ALTO}" loading="lazy" style="height:auto"></a></div>'
        f'<div class="cuerpo"><div class="cod">{cod}</div><h3><a href="{pag}" style="color:inherit">{html.escape(tit)}</a></h3><p>{html.escape(txt)}</p>'
        f'<div class="botones"><a class="b" href="pdf/{pdf}.pdf" download>Descargar PDF</a>'
        f'<a class="b sec" href="{pag}">Ver la hoja</a></div></div></div>'
        for cod, tit, txt, pdf, pag in HOJAS)


def procesar(f):
    t = f.read_text(encoding="utf-8")
    original = t
    nombre = f.stem
    ruta = "/plantillas/" if nombre == "index" else f"/plantillas/{nombre}"
    titulo = re.search(r"<title>(.*?)</title>", t, re.S).group(1).strip()
    m = re.search(r'<meta name="description" content="(.*?)">', t, re.S)
    if m:
        descripcion = m.group(1)
    else:  # el creador no traía descripción
        descripcion = ("Crea tu propio parte de campo para imprimir: elige una de las cinco plantillas, cambia el título, "
                       "las líneas y las columnas. Gratis y sin registro.")
        t = t.replace("</title>", f'</title>\n<meta name="description" content="{descripcion}">', 1)
    hoja = next((h for h in HOJAS if h[4] == nombre), None)
    imagen = f"/plantillas/pdf/{hoja[3]}.png" if hoja else "/og.jpg"
    bloque = cabeza(ruta, titulo, descripcion, imagen)
    if "<!-- seo -->" in t:
        t = re.sub(r"<!-- seo -->.*?<!-- /seo -->\n", lambda _: bloque, t, flags=re.S)
    else:
        t = t.replace("<style>", bloque + "<style>", 1)
    # direcciones limpias, las mismas del sitemap (index.html y creador.html duplicaban la URL)
    t = re.sub(r'href="index\.html"', 'href="/plantillas/"', t)
    t = re.sub(r'href="creador\.html"', 'href="/plantillas/creador"', t)
    # las vistas previas, con medidas: sin ellas la página salta al cargarlas
    t = re.sub(r'<img class="prev" src="(pdf/[^"]+\.png)" alt="([^"]*)">',
               rf'<img class="prev" src="\1" alt="\2" width="{ANCHO}" height="{ALTO}" style="height:auto">', t)
    if nombre == "index":
        # las cinco tarjetas, en el HTML (antes las pintaba un script y las fichas no tenían ningún enlace entrante)
        t = re.sub(r'<div class="rejilla" id="rejilla">.*?</div><!-- /rejilla -->|<div class="rejilla" id="rejilla"></div>',
                   lambda _: '<div class="rejilla" id="rejilla">\n' + tarjetas() + '\n  </div><!-- /rejilla -->', t, count=1, flags=re.S)
        t = re.sub(r"// Las hojas en datos:.*?\.join\(\"\"\);\n", "", t, flags=re.S)
    # pie: vuelta al sitio y al formulario de acceso
    if nombre != "creador" and 'class="pie-sitio"' not in t:
        t = re.sub(r'(<footer><div class="env">)', lambda m: m.group(1) + PIE, t, count=1)
    if t != original:
        f.write_text(t, encoding="utf-8")
        print("actualizada", f.relative_to(RAIZ))


if __name__ == "__main__":
    for f in sorted(DIR.glob("*.html")):
        procesar(f)

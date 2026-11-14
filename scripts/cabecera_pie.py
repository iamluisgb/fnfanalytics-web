"""Cabecera y pie de las subpáginas, en un solo sitio.

Antes estaban copiados a mano en cada HTML y se desincronizaban. Ahora la fuente es este
archivo: cámbialo aquí y ejecuta

    python3 scripts/cabecera_pie.py            # reescribe las páginas escritas a mano
    python3 scripts/generar_paginas_usos.py    # las de usos/ lo importan de aquí

La portada (`index.html`) lleva su propia cabecera, con anclas a sus secciones, y aquí solo
se le sincroniza la lista de enlaces del pie. Las plantillas (`plantillas/`) tienen diseño
propio de hoja imprimible y no se tocan.

Cada página lleva su `origen`: los botones «Solicita acceso» llegan al formulario de la
portada como `/?origen=<página>#acceso`, y el formulario lo manda con la solicitud y con el
evento `acceso-enviado` de Umami. Así se sabe qué página trae cada solicitud.
"""
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# página → origen que viaja al formulario ("" = sin origen)
PAGINAS = {
    "asesores.html": "asesores",
    "metodo.html": "metodo",
    "fnf-o-agroptima.html": "agroptima",
    "cuaderno-digital.html": "cuaderno-digital",
    "fuentes-datos-publicos.html": "fuentes",
    "privacidad.html": "",
    "aviso-legal.html": "",
    "404.html": "",
    "herramientas/calculadora-caldo.html": "calculadora",
    "herramientas/direccion-de-trabajo.html": "direccion",
}

SALTO = '<a class="saltar" href="#contenido">Saltar al contenido</a>'

ENLACES_PIE = """    <nav aria-label="Pie">
      <a href="/cuaderno-digital">Cuaderno digital 2027</a>
      <a href="/plantillas/">Plantillas gratis</a>
      <a href="/herramientas/calculadora-caldo">Calculadora de caldo</a>
      <a href="/herramientas/direccion-de-trabajo">Dirección de trabajo</a>
      <a href="/fuentes-datos-publicos">Fuentes de datos públicos</a>
      <a href="/usos/">Usos autorizados</a>
      <a href="/metodo">Cómo comprobamos</a>
      <a href="/asesores">Asesores</a>
      <a href="/ayuda/">Ayuda</a>
      <a href="https://app.fnfanalytics.com/users/login/">Entrar</a>
      <a href="/privacidad">Privacidad</a>
      <a href="/aviso-legal">Aviso legal</a>
    </nav>"""


def acceso(origen=""):
    """Dirección del formulario de la portada, con el origen de la visita."""
    return f"/?origen={origen}#acceso" if origen else "/#acceso"


def cabecera(origen=""):
    return f"""{SALTO}
<nav class="nav" aria-label="Principal">
  <div class="in">
    <a class="logo" href="/"><img src="/assets/logo-mark.png" alt="" width="19" height="34"><span class="lt"><b>food&amp;farm</b><i>analytics</i></span></a>
    <div class="nav-links">
      <div class="nav-secciones">
        <a href="/#inteligencia">Inteligencia</a>
        <a href="/asesores">Asesores</a>
        <a href="/#precios">Precios</a>
        <a href="/cuaderno-digital">Cuaderno digital</a>
        <a href="/ayuda/">Ayuda</a>
      </div>
      <details class="nav-movil">
        <summary>Menú</summary>
        <div class="nav-movil__panel">
          <a class="nav-movil__entrar" href="https://app.fnfanalytics.com/users/login/" data-umami-event="nav-entrar">Entrar</a>
          <a href="/#inteligencia">Inteligencia</a>
          <a href="/#analitica">Analítica</a>
          <a href="/asesores">Asesores</a>
          <a href="/#precios">Precios</a>
          <a href="/#faq">FAQ</a>
          <a href="/cuaderno-digital">Cuaderno digital 2027</a>
          <a href="/plantillas/">Herramientas gratis</a>
          <a href="/ayuda/">Ayuda</a>
        </div>
      </details>
      <a class="btn btn-ghost nav-entrar" href="https://app.fnfanalytics.com/users/login/" data-umami-event="nav-entrar">Entrar</a>
      <a class="btn btn-primary" href="{acceso(origen)}">Solicita acceso</a>
    </div>
  </div>
</nav>"""


def pie():
    return f"""<footer>
  <div class="in">
    <div class="fl"><img src="/assets/logo-mark.png" alt="" width="13" height="24"><b>food&amp;farm analytics</b></div>
{ENLACES_PIE}
    <p>© 2026 · <a href="mailto:hola@fnfanalytics.com">hola@fnfanalytics.com</a></p>
  </div>
</footer>"""


RX_NAV = re.compile(r'(?:<a class="saltar"[^\n]*\n)?<nav class="nav".*?\n</nav>', re.S)
RX_PIE = re.compile(r"<footer>.*?</footer>", re.S)
RX_ENLACES_PIE = re.compile(r' *<nav aria-label="Pie">.*?</nav>', re.S)
RX_ACCESO = re.compile(r'href="/(?:\?origen=[a-z-]+)?#acceso"')


def sincronizar():
    for nombre, origen in PAGINAS.items():
        f = RAIZ / nombre
        html = f.read_text(encoding="utf-8")
        nuevo, n1 = RX_NAV.subn(lambda _: cabecera(origen), html, count=1)
        nuevo, n2 = RX_PIE.subn(lambda _: pie(), nuevo, count=1)
        if n1 != 1 or n2 != 1:
            raise SystemExit(f"{nombre}: no encuentro la cabecera o el pie")
        # el resto de botones de la página que llevan al formulario, con el mismo origen
        nuevo = RX_ACCESO.sub(f'href="{acceso(origen)}"', nuevo)
        # destino del enlace «Saltar al contenido»: la cabecera de la página (donde va el h1) o, si no la hay, el <main>
        if 'id="contenido"' not in nuevo:
            nuevo, n3 = re.subn(r'<header class="page-head"', '<header class="page-head" id="contenido"', nuevo, count=1)
            if not n3:
                nuevo, n3 = re.subn(r"<main\b", '<main id="contenido"', nuevo, count=1)
            if n3 != 1:
                raise SystemExit(f"{nombre}: no tiene cabecera de página ni <main>")
        if nuevo != html:
            f.write_text(nuevo, encoding="utf-8")
            print("actualizada", nombre)
    # portada: solo la lista de enlaces del pie
    f = RAIZ / "index.html"
    html = f.read_text(encoding="utf-8")
    nuevo, n = RX_ENLACES_PIE.subn(lambda _: ENLACES_PIE, html, count=1)
    if n != 1:
        raise SystemExit("index.html: no encuentro los enlaces del pie")
    if nuevo != html:
        f.write_text(nuevo, encoding="utf-8")
        print("actualizada index.html (pie)")


if __name__ == "__main__":
    sincronizar()

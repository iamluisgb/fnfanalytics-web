"""Páginas estáticas de usos autorizados por cultivo y plaga, para que lleguen desde Google.

Lee herramientas/datos/ (lo que genera exportar_usos.py) y escribe usos/: una página por
combinación cultivo × plaga del lote elegido, un índice por cultivo y uno general. Cada producto
lleva un enlace a la calculadora con el cálculo ya rellenado. Actualiza el bloque de usos del
sitemap.xml.

Lote: los cultivos «más consultados» y, en cada uno, las plagas con más productos, hasta LOTE
páginas. Vuelve a ejecutarlo tras cada exportación del registro.
Uso:  python3 scripts/generar_paginas_usos.py [tamaño del lote]
"""
import collections
import html
import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "herramientas" / "datos"
SALIDA = RAIZ / "usos"
WEB = "https://fnfanalytics.com"
VERSION = ""  # la misma ?v= que la calculadora (scripts/versionar.py)
LOTE = int(sys.argv[1]) if len(sys.argv) > 1 else 50
POR_CULTIVO = 4
MESES = "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split()

e = html.escape


def slug(texto):
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def num(v):
    if v is None:
        return "—"
    s = f"{v:,.4f}".rstrip("0").rstrip(".")
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def unidad(uso, prod):
    liquido = prod[2] == "l"
    if uso[3] == "hl":
        return "ml/hL" if liquido else "g/hL"
    return "L/ha" if liquido else "kg/ha"


def rango(uso, prod):
    a, b = uso[4], uso[5]
    return f"{num(b)} {unidad(uso, prod)}" if a == b else f"{num(a)}–{num(b)} {unidad(uso, prod)}"


def pagina(titulo, descripcion, ruta, migas, cuerpo):
    url = f"{WEB}{ruta}"
    lista = [{"@type": "ListItem", "position": i + 1, "name": n, "item": f"{WEB}{r}"} for i, (n, r) in enumerate(migas)]
    ld = json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": lista}, ensure_ascii=False)
    nav_migas = ' <span aria-hidden="true">›</span> '.join(
        f'<a href="{r}">{e(n)}</a>' if i < len(migas) - 1 else f"<span>{e(n)}</span>" for i, (n, r) in enumerate(migas))
    return f"""<!doctype html>
<html lang="es" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(titulo)} · Food & Farm Analytics</title>
<meta name="description" content="{e(descripcion)}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{e(titulo)}">
<meta property="og:description" content="{e(descripcion)}">
<meta property="og:type" content="article">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="es_ES">
<meta property="og:image" content="{WEB}/herramientas/og-calculadora.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0c1210">
<link rel="preload" href="/assets/fonts/Poppins-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/calculadora.css{VERSION}">
<script defer src="/u/s.js" data-website-id="08c1619b-4bb8-471b-9dc9-9b6cda88e8ae" data-host-url="https://cloud.umami.is" data-domains="fnfanalytics.com,www.fnfanalytics.com"></script>
<script type="application/ld+json">{ld}</script>
</head>
<body>

<nav class="nav">
  <div class="in">
    <a class="logo" href="/" aria-label="Food & Farm Analytics"><img src="/assets/logo-mark.png" alt="" width="19" height="34"><span class="lt"><b>food&amp;farm</b><i>analytics</i></span></a>
    <div class="nav-links">
      <a href="/#sistema">Sistema</a>
      <a href="/asesores">Asesores</a>
      <a href="/#precios">Precios</a>
      <a href="/cuaderno-digital">Cuaderno digital</a>
      <a class="btn btn-primary" href="/#acceso">Solicita acceso</a>
    </div>
  </div>
</nav>

<main class="cc cc-usos">
  <div class="cc-head">
    <div class="cc-crumb">{nav_migas}</div>
{cuerpo}
</main>

<footer>
  <div class="in">
    <div class="fl"><img src="/assets/logo-mark.png" alt="" width="13" height="24"><b>food&amp;farm analytics</b></div>
    <nav aria-label="Pie">
      <a href="/cuaderno-digital">Cuaderno digital 2027</a>
      <a href="/plantillas/">Plantillas gratis</a>
      <a href="/herramientas/calculadora-caldo">Calculadora de caldo</a>
      <a href="/usos/">Usos autorizados</a>
      <a href="/asesores">Asesores</a>
      <a href="/privacidad">Privacidad</a>
      <a href="/aviso-legal">Aviso legal</a>
    </nav>
    <p>© 2026 · <a href="mailto:hola@fnfanalytics.com">hola@fnfanalytics.com</a></p>
  </div>
</footer>
</body>
</html>
"""


def main():
    global VERSION
    pag = (RAIZ / "herramientas" / "calculadora-caldo.html").read_text(encoding="utf-8")
    m = re.search(r"calculadora\.css(\?v=[0-9a-f]+)", pag)
    VERSION = m.group(1) if m else ""
    indice = json.loads((DATOS / "cultivos.json").read_text(encoding="utf-8"))
    a, m, d = indice["fecha"].split("-")
    fecha = f"{int(d)} de {MESES[int(m) - 1]} de {a}"
    por = {c["s"]: c for c in indice["cultivos"]}

    # el lote: plagas con más productos de los cultivos principales
    candidatos = []
    for s in indice["destacados"]:
        datos = json.loads((DATOS / "c" / f"{s}.json").read_text(encoding="utf-8"))
        grupos = collections.defaultdict(set)
        for u in datos["usos"]:
            grupos[u[1]].add(u[0])
        top = sorted(grupos.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:POR_CULTIVO]
        candidatos += [(len(regs), s, plaga, datos) for plaga, regs in top]
    elegidos = sorted(candidatos, key=lambda c: -c[0])[:LOTE]
    por_cultivo = collections.defaultdict(list)
    for n, s, plaga, datos in elegidos:
        por_cultivo[s].append((plaga, n, datos))

    if SALIDA.exists():
        shutil.rmtree(SALIDA)
    urls = []
    for s, plagas in por_cultivo.items():
        cultivo = por[s]["n"]
        plagas.sort(key=lambda p: -p[1])
        for plaga, n, datos in plagas:
            usos = [u for u in datos["usos"] if u[1] == plaga]
            prods = datos["productos"]
            usos.sort(key=lambda u: prods[u[0]][0])
            cientifico = next((u[2] for u in usos if u[2]), "")
            ma = collections.Counter()
            for reg in {u[0] for u in usos}:
                for sust in filter(None, (prods[reg][3] or "").split(";")):
                    ma[sust.strip().capitalize()] += 1
            filas = []
            for u in usos:
                p = prods[u[0]]
                calc = f"/herramientas/calculadora-caldo?cultivo={s}&amp;plaga={slug(plaga)}&amp;producto={e(u[0])}"
                origen = f' · autorizado en {e(u[11])}' if len(u) > 11 else ""
                filas.append(
                    f'<tr><td><span class="cc-pn">{e(p[0])}</span><span class="cc-sub">Nº {e(u[0])} · {e(p[1])}{origen}</span></td>'
                    f'<td data-l="Materia activa">{e(p[3] or "—")}</td><td class="cc-m" data-l="Dosis">{rango(u, p)}</td>'
                    f'<td class="cc-m" data-l="Caldo">{(num(u[6]) + "–" + num(u[7] or u[6]) + " L/ha") if u[6] else "—"}</td>'
                    f'<td class="cc-m" data-l="Aplicaciones">{u[8] if u[8] else "—"}{(" · " + str(u[9]) + " d") if u[9] else ""}</td>'
                    f'<td class="cc-m" data-l="Plazo de seguridad">{(str(u[10]) + " d") if u[10] is not None else "—"}</td>'
                    f'<td><a class="cc-ghost cc-calc" href="{calc}">Calcular la cuba</a></td></tr>')
            otras = [f'<li><a href="/usos/{s}/{slug(o)}">{e(o)}</a> <span class="cc-sub">{k} productos</span></li>'
                     for o, k, _ in plagas if o != plaga]
            ruta = f"/usos/{s}/{slug(plaga)}"
            titulo = f"Productos autorizados contra {plaga.lower()} en {cultivo.lower()}"
            desc = (f"{n} productos autorizados por el MAPA contra {plaga.lower()} en {cultivo.lower()}: dosis, caldo, "
                    f"número de aplicaciones y plazo de seguridad. Calcula cuánto va en tu cuba, gratis.")
            resumen = ", ".join(f"{x} ({k})" for x, k in ma.most_common(8)) or "sin datos en las fichas"
            cuerpo = f"""    <h1>{e(titulo[0].upper() + titulo[1:])}</h1>
    <p class="cc-lede">{n} productos del Registro de Productos Fitosanitarios del MAPA{f' contra <i>{e(cientifico)}</i>' if cientifico else ''}. Elige uno y la calculadora te dice cuántas cubas salen y cuánto producto va en cada una.</p>
    <div class="cc-source"><span class="cc-dot"></span><span>Registro del MAPA consultado el {fecha} · la etiqueta del producto manda</span></div>
  </div>
  <section class="cc-usos-body">
    <p><b>Materias activas más presentes:</b> {e(resumen)}.</p>
    <div class="cc-table" role="region" aria-label="Productos autorizados" tabindex="0">
      <table>
        <thead><tr><th>Producto</th><th>Materia activa</th><th>Dosis</th><th>Caldo</th><th>Aplic.</th><th>P.&nbsp;S.</th><th></th></tr></thead>
        <tbody>
        {"".join(filas)}
        </tbody>
      </table>
    </div>
    <p class="cc-hint">P. S. = plazo de seguridad: días entre el último tratamiento y la cosecha. «Autorizado en» indica que el uso está registrado para un grupo que incluye {e(cultivo.lower())}. Datos del registro oficial; comprueba siempre la etiqueta antes de tratar.</p>
    <div class="cc-card cc-usos-cta">
      <h2>¿Cuánto va en tu cuba?</h2>
      <p>Pon tus hectáreas, el caldo y la cuba. La calculadora comprueba la dosis contra el registro, ajusta las boquillas y te da la orden de tratamiento para imprimir o mandar por WhatsApp.</p>
      <a class="cc-btn is-primary" href="/herramientas/calculadora-caldo?cultivo={s}&amp;plaga={slug(plaga)}">Abrir la calculadora</a>
    </div>
    {f'<h2>Otras plagas en {e(cultivo.lower())}</h2><ul class="cc-usos-list">{"".join(otras)}</ul>' if otras else ''}
  </section>"""
            destino = SALIDA / s / f"{slug(plaga)}.html"
            destino.parent.mkdir(parents=True, exist_ok=True)
            migas = [("Usos autorizados", "/usos/"), (cultivo, f"/usos/{s}/"), (plaga, ruta)]
            destino.write_text(pagina(titulo[0].upper() + titulo[1:], desc, ruta, migas, cuerpo), encoding="utf-8")
            urls.append(ruta)

        # índice del cultivo
        items = "".join(f'<li><a href="/usos/{s}/{slug(p)}">{e(p)}</a> <span class="cc-sub">{k} productos</span></li>' for p, k, _ in plagas)
        cuerpo = f"""    <h1>Productos autorizados en {e(cultivo.lower())}</h1>
    <p class="cc-lede">Las plagas, enfermedades y malas hierbas de {e(cultivo.lower())} con más productos autorizados por el MAPA. Para el resto, usa la calculadora: tiene el registro completo.</p>
  </div>
  <section class="cc-usos-body"><ul class="cc-usos-list">{items}</ul>
    <p><a class="cc-btn is-primary cc-inline" href="/herramientas/calculadora-caldo?cultivo={s}">Abrir la calculadora con {e(cultivo.lower())}</a></p></section>"""
        (SALIDA / s / "index.html").write_text(pagina(f"Productos autorizados en {cultivo.lower()}", f"Productos fitosanitarios autorizados por el MAPA en {cultivo.lower()}, por plaga, con dosis y plazo de seguridad.", f"/usos/{s}/", [("Usos autorizados", "/usos/"), (cultivo, f"/usos/{s}/")], cuerpo), encoding="utf-8")
        urls.append(f"/usos/{s}/")

    # índice general
    items = "".join(f'<li><a href="/usos/{s}/">{e(por[s]["n"])}</a> <span class="cc-sub">{len(p)} plagas</span></li>' for s, p in por_cultivo.items())
    cuerpo = f"""    <h1>Productos fitosanitarios autorizados, por cultivo y plaga</h1>
    <p class="cc-lede">Qué productos tiene autorizados el MAPA para cada plaga, con su dosis, caldo, número de aplicaciones y plazo de seguridad. Registro consultado el {fecha}.</p>
  </div>
  <section class="cc-usos-body"><ul class="cc-usos-list">{items}</ul>
    <p>¿No está tu cultivo? La <a href="/herramientas/calculadora-caldo">calculadora de caldo</a> tiene los {len(indice["cultivos"])} cultivos del registro.</p></section>"""
    (SALIDA / "index.html").write_text(pagina("Productos fitosanitarios autorizados, por cultivo y plaga", "Productos fitosanitarios autorizados por el MAPA para cada cultivo y plaga, con dosis y plazo de seguridad. Gratis.", "/usos/", [("Usos autorizados", "/usos/")], cuerpo), encoding="utf-8")
    urls.insert(0, "/usos/")

    # sitemap: el bloque de usos se rehace entero
    mapa = (RAIZ / "sitemap.xml").read_text(encoding="utf-8")
    mapa = re.sub(r"\s*<!-- usos -->.*?<!-- /usos -->", "", mapa, flags=re.S)
    bloque = "\n  <!-- usos -->\n" + "\n".join(f"  <url><loc>{WEB}{u}</loc><lastmod>{indice['fecha']}</lastmod></url>" for u in urls) + "\n  <!-- /usos -->"
    mapa = mapa.replace("</urlset>", bloque + "\n</urlset>")
    (RAIZ / "sitemap.xml").write_text(mapa, encoding="utf-8")
    print(f"{len(elegidos)} páginas de cultivo × plaga, {len(por_cultivo)} cultivos, {len(urls)} URL en el sitemap")


if __name__ == "__main__":
    main()

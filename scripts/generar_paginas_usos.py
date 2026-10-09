"""Páginas estáticas de usos autorizados por cultivo y plaga, para que lleguen desde Google.

Lee herramientas/datos/ (lo que genera exportar_usos.py) y scripts/plagas_clave.json (la lista
curada de plagas clave por cultivo, con los nombres del registro que agrupa cada una) y escribe
usos/: una página por plaga clave, un índice por cultivo y uno general. Cada producto lleva un
enlace a la calculadora con el cálculo rellenado, y la tabla un buscador. Las direcciones que ya
no existen redirigen a la página nueva. Actualiza el bloque de usos del sitemap.xml.

Vuelve a ejecutarlo tras cada exportación del registro (lo hace actualizar_registro.sh).
Uso:  python3 scripts/generar_paginas_usos.py
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
LISTA = Path(__file__).resolve().parent / "plagas_clave.json"
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
<script defer src="/assets/usos.js{VERSION}"></script>
<script defer src="/u/s.js" data-website-id="08c1619b-4bb8-471b-9dc9-9b6cda88e8ae" data-host-url="https://cloud.umami.is" data-domains="fnfanalytics.com,www.fnfanalytics.com"></script>
<script type="application/ld+json">{ld}</script>
</head>
<body>

<nav class="nav">
  <div class="in">
    <a class="logo" href="/" aria-label="Food & Farm Analytics"><img src="/assets/logo-mark.png" alt="" width="19" height="34"><span class="lt"><b>food&amp;farm</b><i>analytics</i></span></a>
    <div class="nav-links">
      <a href="/#inteligencia">Inteligencia</a>
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
      <a href="/herramientas/direccion-de-trabajo">Dirección de trabajo</a>
      <a href="/fuentes-datos-publicos">Fuentes de datos públicos</a>
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


def redireccion(destino):
    url = f"{WEB}{destino}"
    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Esta página se ha movido · Food & Farm Analytics</title>
<link rel="canonical" href="{url}">
<meta http-equiv="refresh" content="0; url={destino}">
<meta name="robots" content="noindex">
</head><body><p>Esta página se ha movido a <a href="{destino}">{url}</a>.</p></body></html>
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
    lista = {k: v for k, v in json.loads(LISTA.read_text(encoding="utf-8")).items() if not k.startswith("_")}

    # direcciones publicadas antes, para no dejar enlaces rotos
    antiguas = {str(f.relative_to(SALIDA))[:-5] for f in SALIDA.glob("*/*.html") if f.name != "index.html"} if SALIDA.exists() else set()
    if SALIDA.exists():
        shutil.rmtree(SALIDA)
    urls, nuevas, por_nombre, hechas = [], set(), {}, {}

    for s, entradas in lista.items():
        cultivo = por[s]["n"]
        datos = json.loads((DATOS / "c" / f"{s}.json").read_text(encoding="utf-8"))
        prods = datos["productos"]
        paginas = []
        for nombre, sl, nombres in entradas:
            usos = sorted((u for u in datos["usos"] if u[1] in nombres), key=lambda u: (prods[u[0]][0], u[1]))
            if not usos:
                print(f"  sin usos: {cultivo} · {nombre}")
                continue
            n = len({u[0] for u in usos})
            paginas.append((nombre, sl, nombres, usos, n))
            for x in nombres:
                por_nombre.setdefault((s, slug(x)), sl)
        hechas[s] = paginas

        for nombre, sl, nombres, usos, n in paginas:
            presentes = [x for x in nombres if any(u[1] == x for u in usos)]
            varias = len(presentes) > 1
            cientifico = next((u[2] for u in usos if u[2]), "") if not varias else ""
            ma = collections.Counter()
            for reg in sorted({u[0] for u in usos}):
                for sust in filter(None, (prods[reg][3] or "").split(";")):
                    ma[sust.strip().capitalize()] += 1
            filas = []
            for u in usos:
                p = prods[u[0]]
                calc = f"/herramientas/calculadora-caldo?cultivo={s}&amp;plaga={slug(u[1])}&amp;producto={e(u[0])}"
                origen = f' · autorizado en {e(u[11])}' if len(u) > 11 else ""
                contra = f'<td data-l="Contra">{e(u[1])}</td>' if varias else ""
                filas.append(
                    f'<tr><td><span class="cc-pn">{e(p[0])}</span><span class="cc-sub">Nº {e(u[0])} · {e(p[1])}{origen}</span></td>{contra}'
                    f'<td data-l="Materia activa">{e(p[3] or "—")}</td><td class="cc-m" data-l="Dosis">{rango(u, p)}</td>'
                    f'<td class="cc-m" data-l="Caldo">{(num(u[6]) + "–" + num(u[7] or u[6]) + " L/ha") if u[6] else "—"}</td>'
                    f'<td class="cc-m" data-l="Aplicaciones">{u[8] if u[8] else "—"}{(" · " + str(u[9]) + " d") if u[9] else ""}</td>'
                    f'<td class="cc-m" data-l="Plazo de seguridad">{(str(u[10]) + " d") if u[10] is not None else "—"}</td>'
                    f'<td><a class="cc-ghost cc-calc" href="{calc}">Calcular la cuba</a></td></tr>')
            otras = [f'<li><a href="/usos/{s}/{o[1]}">{e(o[0])}</a> <span class="cc-sub">{o[4]} productos</span></li>'
                     for o in paginas if o[1] != sl]
            ruta = f"/usos/{s}/{sl}"
            titulo = f"{nombre} en {cultivo.lower()}: productos autorizados"
            desc = (f"{n} productos autorizados por el MAPA contra {nombre.lower()} en {cultivo.lower()}: dosis, caldo, "
                    f"número de aplicaciones y plazo de seguridad. Calcula cuánto va en tu cuba, gratis.")
            resumen = ", ".join(f"{x} ({k})" for x, k in sorted(ma.items(), key=lambda t: (-t[1], t[0]))[:8]) or "sin datos en las fichas"
            incluye = f' Incluye lo que el registro llama {", ".join("«" + e(x) + "»" for x in presentes)}.' if varias else ""
            cuerpo = f"""    <h1>{e(titulo)}</h1>
    <p class="cc-lede">{n} productos del Registro de Productos Fitosanitarios del MAPA{f' contra <i>{e(cientifico)}</i>' if cientifico else ''}.{incluye} Elige uno y la calculadora te dice cuántas cubas salen y cuánto producto va en cada una.</p>
    <div class="cc-source"><span class="cc-dot"></span><span>Registro del MAPA consultado el {fecha} · la etiqueta del producto manda</span></div>
  </div>
  <section class="cc-usos-body">
    <p><b>Materias activas más presentes:</b> {e(resumen)}.</p>
    <div class="cc-usos-buscar">
      <label class="cc-f" for="filtro">Buscar en la tabla
        <input type="search" id="filtro" placeholder="Producto, materia activa, titular o nº de registro" autocomplete="off">
      </label>
      <p class="cc-hint" id="filtroN" role="status">{len(usos)} usos de {n} productos</p>
    </div>
    <div class="cc-table" role="region" aria-label="Productos autorizados" tabindex="0">
      <table>
        <thead><tr><th>Producto</th>{'<th>Contra</th>' if varias else ''}<th>Materia activa</th><th>Dosis</th><th>Caldo</th><th>Aplic.</th><th>P.&nbsp;S.</th><th></th></tr></thead>
        <tbody id="filas">
        {"".join(filas)}
        </tbody>
      </table>
    </div>
    <p class="cc-empty" id="filtroVacio" hidden>Ningún producto coincide con la búsqueda.</p>
    <p class="cc-hint">P. S. = plazo de seguridad: días entre el último tratamiento y la cosecha. «Autorizado en» indica que el uso está registrado para un grupo que incluye {e(cultivo.lower())}. Datos del registro oficial; comprueba siempre la etiqueta antes de tratar.</p>
    <div class="cc-card cc-usos-cta">
      <h2>¿Cuánto va en tu cuba?</h2>
      <p>Pon tus hectáreas, el caldo y la cuba. La calculadora comprueba la dosis contra el registro, ajusta las boquillas y te da la orden de tratamiento para imprimir o mandar por WhatsApp.</p>
      <a class="cc-btn is-primary" href="/herramientas/calculadora-caldo?cultivo={s}&amp;plaga={slug(presentes[0])}">Abrir la calculadora</a>
    </div>
    {f'<h2>Otras plagas en {e(cultivo.lower())}</h2><ul class="cc-usos-list">{"".join(otras)}</ul>' if otras else ''}
  </section>"""
            destino = SALIDA / s / f"{sl}.html"
            destino.parent.mkdir(parents=True, exist_ok=True)
            migas = [("Usos autorizados", "/usos/"), (cultivo, f"/usos/{s}/"), (nombre, ruta)]
            destino.write_text(pagina(titulo, desc, ruta, migas, cuerpo), encoding="utf-8")
            urls.append(ruta); nuevas.add(f"{s}/{sl}")

        # índice del cultivo
        items = "".join(f'<li><a href="/usos/{s}/{o[1]}">{e(o[0])}</a> <span class="cc-sub">{o[4]} productos</span></li>' for o in paginas)
        cuerpo = f"""    <h1>Productos autorizados en {e(cultivo.lower())}</h1>
    <p class="cc-lede">Las plagas, enfermedades y malas hierbas clave de {e(cultivo.lower())}, con los productos que tiene autorizados el MAPA. Para el resto, usa la calculadora: tiene el registro completo.</p>
  </div>
  <section class="cc-usos-body"><ul class="cc-usos-list">{items}</ul>
    <p><a class="cc-btn is-primary cc-inline" href="/herramientas/calculadora-caldo?cultivo={s}">Abrir la calculadora con {e(cultivo.lower())}</a></p></section>"""
        (SALIDA / s / "index.html").write_text(pagina(f"Productos autorizados en {cultivo.lower()}", f"Productos fitosanitarios autorizados por el MAPA en {cultivo.lower()}, por plaga, con dosis y plazo de seguridad.", f"/usos/{s}/", [("Usos autorizados", "/usos/"), (cultivo, f"/usos/{s}/")], cuerpo), encoding="utf-8")
        urls.append(f"/usos/{s}/")

    # las direcciones antiguas que ya no existen llevan a su página nueva (o al índice del cultivo)
    movidas = 0
    for vieja in sorted(antiguas - nuevas):
        s, sl = vieja.split("/", 1)
        nueva = f"/usos/{s}/{por_nombre[(s, sl)]}" if (s, sl) in por_nombre else f"/usos/{s}/"
        (SALIDA / s).mkdir(parents=True, exist_ok=True)
        (SALIDA / s / f"{sl}.html").write_text(redireccion(nueva), encoding="utf-8")
        movidas += 1

    # índice general
    items = "".join(f'<li><a href="/usos/{s}/">{e(por[s]["n"])}</a> <span class="cc-sub">{len(p)} plagas</span></li>' for s, p in hechas.items())
    cuerpo = f"""    <h1>Productos fitosanitarios autorizados, por cultivo y plaga</h1>
    <p class="cc-lede">Qué productos tiene autorizados el MAPA para cada plaga, con su dosis, caldo, número de aplicaciones y plazo de seguridad. Registro consultado el {fecha}.</p>
  </div>
  <section class="cc-usos-body"><ul class="cc-usos-list">{items}</ul>
    <p>¿No está tu cultivo o tu plaga? La <a href="/herramientas/calculadora-caldo">calculadora de caldo</a> tiene los {len(indice["cultivos"])} cultivos del registro y todas sus plagas.</p></section>"""
    (SALIDA / "index.html").write_text(pagina("Productos fitosanitarios autorizados, por cultivo y plaga", "Productos fitosanitarios autorizados por el MAPA para cada cultivo y plaga, con dosis y plazo de seguridad. Gratis.", "/usos/", [("Usos autorizados", "/usos/")], cuerpo), encoding="utf-8")
    urls.insert(0, "/usos/")

    # sitemap: el bloque de usos se rehace entero (sin las redirecciones)
    mapa = (RAIZ / "sitemap.xml").read_text(encoding="utf-8")
    mapa = re.sub(r"\s*<!-- usos -->.*?<!-- /usos -->", "", mapa, flags=re.S)
    bloque = "\n  <!-- usos -->\n" + "\n".join(f"  <url><loc>{WEB}{u}</loc><lastmod>{indice['fecha']}</lastmod></url>" for u in urls) + "\n  <!-- /usos -->"
    mapa = mapa.replace("</urlset>", bloque + "\n</urlset>")
    (RAIZ / "sitemap.xml").write_text(mapa, encoding="utf-8")
    total = sum(len(p) for p in hechas.values())
    print(f"{total} páginas de plagas en {len(hechas)} cultivos, {movidas} redirecciones, {len(urls)} URL en el sitemap")


if __name__ == "__main__":
    main()

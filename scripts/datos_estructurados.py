"""Datos estructurados (schema.org) de la portada, sacados de la propia página.

Buscadores y asistentes (ChatGPT, Perplexity, Claude…) leen el JSON-LD para saber qué es
FnF: una empresa (Organization), una aplicación con un plan gratis (SoftwareApplication) y
sus preguntas frecuentes (FAQPage). Las preguntas y respuestas se leen de la sección #faq de
index.html, así que no pueden decir algo distinto de lo que ve la persona: cambia la página y
ejecuta

    python3 scripts/datos_estructurados.py

Nada inventado: sin valoraciones (no hay reseñas públicas todavía) y sin precio del plan Pro
(la página no lo publica). El bloque va entre <!-- ld --> y <!-- /ld --> en el <head>.
"""
import html
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PORTADA = RAIZ / "index.html"
WEB = "https://fnfanalytics.com/"


def texto(fragmento):
    """El texto visible de un trozo de HTML, en una línea."""
    sin_etiquetas = re.sub(r"<[^>]+>", "", fragmento)
    return re.sub(r"\s+", " ", html.unescape(sin_etiquetas)).strip()


def preguntas(pagina):
    seccion = re.search(r'<section[^>]*id="faq".*?</section>', pagina, re.S).group(0)
    pares = re.findall(r"<summary>(.*?)</summary>\s*<div class=\"a\">(.*?)</div>", seccion, re.S)
    if not pares:
        raise SystemExit("index.html: no encuentro las preguntas de #faq")
    return [{
        "@type": "Question",
        "name": texto(p),
        "acceptedAnswer": {"@type": "Answer", "text": texto(r)},
    } for p, r in pares]


def grafo(pagina):
    organizacion = {
        "@type": "Organization",
        "@id": WEB + "#empresa",
        "name": "Food & Farm Analytics",
        "alternateName": "FnF Analytics",
        "url": WEB,
        "logo": WEB + "favicon-512.png",
        "email": "hola@fnfanalytics.com",
        "award": "Premio Emilio Botín 2020 (ceiA3 y Santander Universidades)",
    }
    aplicacion = {
        "@type": "SoftwareApplication",
        "@id": WEB + "#app",
        "name": "FnF Analytics",
        "description": (
            "Cuaderno de campo y gestión de explotaciones agrícolas en España. Dictas por voz "
            "lo que has hecho y FnF lo convierte en un parte validado contra el registro "
            "oficial de productos fitosanitarios del MAPA, con su coste imputado a la parcela. "
            "Cuaderno digital de explotación (CUE/SIEX) gratis y sin límite de hectáreas."),
        "url": WEB,
        "applicationCategory": "BusinessApplication",
        "applicationSubCategory": "Software agrícola: cuaderno de campo y costes por parcela",
        "operatingSystem": "Web, Android, iOS",
        "inLanguage": "es",
        "areaServed": {"@type": "Country", "name": "España"},
        "audience": {"@type": "Audience",
                     "audienceType": "Agricultores, asesores técnicos y cooperativas agrarias"},
        "featureList": [
            "Cuaderno digital de explotación (CUE/SIEX, RD 1054/2022)",
            "Partes de trabajo por voz, por foto del papel o por Telegram",
            "Validación de producto, dosis y plazo de seguridad contra el registro del MAPA",
            "Funciona sin cobertura en el campo",
            "Importación de parcelas desde SIGPAC",
            "Coste y margen por parcela y campaña",
            "Panel de cartera para asesores y cooperativas",
        ],
        "offers": {
            "@type": "Offer",
            "name": "Cuaderno",
            "description": "Tratamientos, fertilización y riego; sin límite de hectáreas.",
            "price": "0",
            "priceCurrency": "EUR",
        },
        "publisher": {"@id": WEB + "#empresa"},
    }
    faq = {"@type": "FAQPage", "@id": WEB + "#faq", "mainEntity": preguntas(pagina)}
    return {"@context": "https://schema.org", "@graph": [organizacion, aplicacion, faq]}


def main():
    pagina = PORTADA.read_text(encoding="utf-8")
    datos = json.dumps(grafo(pagina), ensure_ascii=False, separators=(",", ":"))
    bloque = f'<!-- ld -->\n<script type="application/ld+json">\n{datos}\n</script>\n<!-- /ld -->'
    if "<!-- ld -->" in pagina:
        nueva = re.sub(r"<!-- ld -->.*?<!-- /ld -->", lambda _: bloque, pagina, count=1, flags=re.S)
    else:  # la primera vez sustituye el bloque viejo, que solo traía la Organization
        viejo = re.search(r'<script type="application/ld\+json">\s*\{"@context":"https://schema.org",'
                          r'"@type":"Organization".*?</script>', pagina, re.S)
        if not viejo:
            raise SystemExit("index.html: no encuentro el JSON-LD de la Organization")
        nueva = pagina[:viejo.start()] + bloque + pagina[viejo.end():]
    if nueva != pagina:
        PORTADA.write_text(nueva, encoding="utf-8")
        print("index.html: datos estructurados actualizados")
    else:
        print("index.html: sin cambios")


if __name__ == "__main__":
    main()

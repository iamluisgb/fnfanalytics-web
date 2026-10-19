"""Avisa a IndexNow (Bing, y por tanto DuckDuckGo) de las URLs que han cambiado.

Google no tiene equivalente sin cuenta: para Google esto se hace con Search Console. IndexNow sí es
anónimo: se publica una clave en la raíz del sitio (`<clave>.txt` con la clave dentro) y se manda un
POST con la lista de URLs. Bing la usa para volver a rastrear sin esperar a que le toque.

Uso:  python3 scripts/indexnow.py [--solo-hoy]
      --solo-hoy  solo las URLs cuyo <lastmod> es hoy (lo que hace el job semanal tras publicar)
"""
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
HOST = "fnfanalytics.com"
WEB = f"https://{HOST}"
ENDPOINT = "https://api.indexnow.org/indexnow"


def clave():
    """La clave es el nombre del fichero <32 hex>.txt de la raíz, y su contenido."""
    for f in RAIZ.glob("*.txt"):
        if re.fullmatch(r"[0-9a-f]{32}", f.stem):
            contenido = f.read_text(encoding="utf-8").strip()
            if contenido == f.stem:
                return f.stem
    raise SystemExit("indexnow: no encuentro <clave>.txt en la raíz (o su contenido no es la clave)")


def main():
    k = clave()
    mapa = (RAIZ / "sitemap.xml").read_text(encoding="utf-8")
    pares = re.findall(r"<loc>(%s[^<]*)</loc>\s*<lastmod>([^<]*)</lastmod>" % re.escape(WEB), mapa)
    hoy = time.strftime("%Y-%m-%d")
    if "--solo-hoy" in sys.argv:
        urls = [u for u, f in pares if f == hoy]
    else:
        urls = [u for u, _ in pares]
    if not urls:
        print("indexnow: ninguna URL que anunciar")
        return
    cuerpo = json.dumps({"host": HOST, "key": k, "keyLocation": f"{WEB}/{k}.txt", "urlList": urls}).encode()
    req = urllib.request.Request(ENDPOINT, cuerpo, {"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"indexnow: {len(urls)} URL avisadas a Bing · HTTP {r.status}")
    except urllib.error.HTTPError as e:
        print(f"indexnow: {len(urls)} URL · HTTP {e.code} {e.reason} (200/202 = aceptado)", file=sys.stderr)
        raise SystemExit(1)
    except urllib.error.URLError as e:
        print(f"indexnow: sin red ({e.reason}) — se reintentará en la próxima carga", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()

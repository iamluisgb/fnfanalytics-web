"""Pone ?v=<huella> a los archivos de la calculadora en su HTML.

calculadora.js reenvía esa misma ?v= al módulo 3D y a los datos, así que basta con
ejecutarlo tras cambiar cualquiera de ellos para que nadie mezcle versiones de caché.
Uso:  python3 scripts/versionar.py
"""
import hashlib
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PAGINA = RAIZ / "herramientas" / "calculadora-caldo.html"
ARCHIVOS = ["assets/calculadora.css", "assets/calculadora.js", "assets/calculadora-3d.js", "assets/usos.js", "herramientas/datos/cultivos.json"]

h = hashlib.sha256()
for a in ARCHIVOS:
    h.update((RAIZ / a).read_bytes())
for f in sorted((RAIZ / "herramientas" / "datos" / "c").glob("*.json")):
    h.update(f.read_bytes())
v = h.hexdigest()[:10]

html = PAGINA.read_text(encoding="utf-8")
html = re.sub(r'(/assets/calculadora\.(?:css|js))(?:\?v=[0-9a-f]+)?"', rf'\1?v={v}"', html)
html = re.sub(r'(/herramientas/datos/cultivos\.json)(?:\?v=[0-9a-f]+)?"', rf'\1?v={v}"', html)
PAGINA.write_text(html, encoding="utf-8")

# dirección de trabajo: su propio JS y el CSS compartido
DIR = RAIZ / "herramientas" / "direccion-de-trabajo.html"
vd = hashlib.sha256((RAIZ / "assets" / "direccion.js").read_bytes() + (RAIZ / "assets" / "calculadora.css").read_bytes()).hexdigest()[:10]
d = DIR.read_text(encoding="utf-8")
d = re.sub(r'(/assets/(?:direccion\.js|calculadora\.css))(?:\?v=[0-9a-f]+)?"', rf'\1?v={vd}"', d)
DIR.write_text(d, encoding="utf-8")
print("versión", v, "· dirección", vd)

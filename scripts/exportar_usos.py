"""Exporta los usos autorizados del MAPA para la calculadora de caldo.

Lee los CSV de workspace/projects/fnf-mapa y escribe herramientas/datos/:
  - cultivos.json        lista de cultivos con su tipo de plantación y la fecha de la fuente
  - c/<slug>.json        productos y usos de un cultivo

Solo entran usos de productos vigentes con la dosis normalizada (por hL o por ha).
Familias: un uso autorizado en un grupo del registro («Frutales de hueso») vale para sus
cultivos («Melocotonero»). Las equivalencias salen del catálogo de la app
(agridashboard/fields/catalogo_familias.py), para que la web y la app digan lo mismo; esos usos
llevan el nombre del cultivo del registro para el que están autorizados.

Uso:  python3 scripts/exportar_usos.py ../fnf-mapa ../agridashboard
"""
import csv
import importlib.util
import json
import re
import sys
import unicodedata
from pathlib import Path

ORIGEN = Path(sys.argv[1] if len(sys.argv) > 1 else "../fnf-mapa")
APP = Path(sys.argv[2] if len(sys.argv) > 2 else "../agridashboard")
DESTINO = Path(__file__).resolve().parent.parent / "herramientas" / "datos"

# Tipo de cultivo: decide la escena 3D, el volumen de copa y los valores de partida.
# El orden importa: gana el primer patrón que casa. Lo que no casa con ninguno es hortícola.
TIPOS = [
    # nombres que confundirían a los patrones de abajo (hierba «limón», «lino» en cebollino…)
    ("horticola", r"hierba lim[oó]n|manzanilla|cebollino|solan[áa]ceas|ra[íi]ces y tub|mostaza china"),
    ("otro", r"acequia|canales|camino|carretera|cementerio|cortafuego|desag[üu]e|drenaje|erial|equipos|locales|lindero|"
             r"m[áa]rgenes|objetos|patios|recintos|redes de|solares|encharcad|v[íi]as f[ée]rreas|[áa]reas no cultivadas|"
             r"arc[ée]n|setas|champi|esquejes|especies vegetales|simientes$"),
    ("olivo", r"^olivo"),
    ("vid", r"^(vid|uva|parral|kiwi)|l[úu]pulo|frambueso|zarzamora|ar[áa]ndano|grosellero|bayas de goji"),
    ("arbol", r"almendro|avellano|nogal|pistach|casta[ñn]o|pacano|pacanas|frutales|frutos de (hueso|pepita|c[áa]scara)|"
              r"c[ií]tricos|naranj|lim[oó]n|mandarin|pomelo|toronja|^lima$|kumquat|manzan|peral|^peras|membrill|melocot|"
              r"nectarin|albaricoq|ciruel|cerez|granad|caqui|aguacate|mango|n[ií]spero|nispolero|higuera|algarrob[oe]|"
              r"moreras|chirimoy|guayabo|guan[áa]bano|lichi|longan|papaya|carambola|macadamia|anacardi|palmera|palm[áa]ceas|"
              r"platanera|pl[áa]tanos|tropicales|azufaifo|acerolo|endrino|sa[úu]co|espino|le[ñn]os|forestales|encina|"
              r"alcornoque|robles|quercus|pinos|con[ií]feras|cupres|cipreses|eucalipto|chopos|[áa]lamo|frondosas|sabinas|"
              r"laurel|arbustos|bojs|hibisco|hortensia|azalea|rosales|[áa]rbol|chumbera|pitaya"),
    ("extensivo", r"cereal|trigo|cebada|avena|centeno|triticale|tritordeum|arroz|ma[íi]z|sorgo|mijo|panizo|alpiste|teff|"
                  r"quinoa|alfor|girasol|colza|camelina|lino|c[áa]rtamo|soja|cacahuete|algod|remolacha (azucarera|forrajera)|"
                  r"alfalfa|veza|tr[ée]bol|esparceta|zulla|yeros|almorta|altramuz|leguminosas( de grano| forrajeras)?$|"
                  r"garbanzo$|lenteja$|para grano|proteaginoso|forrajer|pastos|praderas|pastizal|c[ée]sped|gram[ií]neas|"
                  r"patata|tabaco|c[áa][ñn]amo|ca[ñn]a de az|barbecho|rastrojera|extensivas|industriales|oleaginosas|textiles|"
                  r"semillas|simiente|chufa|adormidera|ricino|s[ée]samo|estevia|stevia|mostaza|fenogreco|alhova|comino|anís|alcaravea"),
]
DESTACADOS = ["Olivo", "Vid", "Almendro", "Cítricos", "Frutales de hueso", "Frutales de pepita",
              "Trigo", "Cebada", "Maíz", "Girasol", "Tomate", "Patata", "Pimiento", "Lechuga y similares"]


def slug(texto):
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def tipo(cultivo):
    for t, patron in TIPOS:
        if re.search(patron, cultivo, re.I):
            return t
    return "horticola"


def num(v):
    try:
        x = float(v)
        return int(x) if x.is_integer() else round(x, 4)
    except (TypeError, ValueError):
        return None


def familias():
    """{cultivo del registro: [grupos y equivalentes cuyos usos también le valen]}."""
    spec = importlib.util.spec_from_file_location("catalogo", APP / "fields" / "catalogo_familias.py")
    cat = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cat)
    extra = {}
    for f in cat.FAMILIAS:
        # las familias «sin especificar» y las de jardinería agrupan al revés (el grupo con todos
        # sus cultivos): sirven para no dar avisos falsos en la app, no para listar productos
        if not f["mapa"] or "sin especificar" in f["nombre"] or f["nombre"] in ("Parques y jardines", "Ornamentales", "Forestal"):
            continue
        propio, otros = f["mapa"][0], f["mapa"][1:]
        extra.setdefault(propio, [c for c in otros if c != propio])
    return extra


def leer(nombre):
    with open(ORIGEN / nombre, encoding="utf-8") as f:
        return list(csv.DictReader(f, delimiter=";"))


def main():
    fichas = {}
    for r in leer("existentes_completo.csv"):
        fichas[r["NumRegistro"]] = [r["NombreComercial"], r["Titular"], (r["Unidad"] or "").lower(), r["Sustancias"]]
    for r in leer("nuevos_enriquecido.csv"):
        fichas.setdefault(r["NumRegistro"], [r["Nombre"], r["Titular"], (r["Unidad"] or "").lower(), ""])

    por_cultivo, vistos, fecha = {}, set(), ""
    for r in leer("usos_normalizado.csv"):
        if r["estado_registro"] != "Vigente" or r["normalizable"] != "si" or not r["cultivo"]:
            continue
        reg = r["NumRegistro"]
        dmax = num(r["dosis_max_norm"])
        if reg not in fichas or not dmax:
            continue
        dmin = num(r["dosis_min_norm"]) or dmax
        plaga = (r["plaga_comun"] or r["plaga"]).strip()
        uso = [reg, plaga, r["plaga_cientifico"].strip(), "hl" if r["dosis_base"] == "por_hl" else "ha",
               dmin, dmax, num(r["caldo_min"]), num(r["caldo_max"]), num(r["max_aplicaciones"]),
               num(r["intervalo_dias"]), num(r["plazo_seguridad_dias"])]
        clave = (r["cultivo"], *uso)
        if clave in vistos:
            continue
        vistos.add(clave)
        por_cultivo.setdefault(r["cultivo"], []).append(uso)
        fecha = max(fecha, r["fecha_consulta"])

    # usos heredados de los grupos de la familia, marcados con el cultivo en que están registrados
    propios = {c: list(u) for c, u in por_cultivo.items()}
    for cultivo, grupos in familias().items():
        if cultivo not in propios:
            continue
        ya = {tuple(u) for u in propios[cultivo]}
        for g in grupos:
            for u in propios.get(g, []):
                if tuple(u) not in ya:
                    ya.add(tuple(u))
                    por_cultivo[cultivo].append(u + [g])

    (DESTINO / "c").mkdir(parents=True, exist_ok=True)
    for viejo in (DESTINO / "c").glob("*.json"):
        viejo.unlink()
    lista = []
    for cultivo, usos in por_cultivo.items():
        s = slug(cultivo)
        regs = sorted({u[0] for u in usos})
        productos = {g: fichas[g] for g in regs}
        usos.sort(key=lambda u: (u[1], fichas[u[0]][0]))
        datos = {"cultivo": cultivo, "productos": productos, "usos": usos}
        (DESTINO / "c" / f"{s}.json").write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        lista.append({"n": cultivo, "s": s, "t": tipo(cultivo), "u": len(usos), "p": len(regs)})
    lista.sort(key=lambda c: c["n"])
    indice = {"fecha": fecha, "destacados": [slug(d) for d in DESTACADOS if d in por_cultivo], "cultivos": lista}
    (DESTINO / "cultivos.json").write_text(json.dumps(indice, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(lista)} cultivos, {sum(c['u'] for c in lista)} usos, fuente {fecha}")


if __name__ == "__main__":
    main()

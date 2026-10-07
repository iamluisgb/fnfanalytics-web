"""Exporta los usos autorizados del MAPA para la calculadora de caldo.

Lee los CSV de workspace/projects/fnf-mapa y escribe herramientas/datos/:
  - cultivos.json        lista de cultivos con su tipo de plantación y la fecha de la fuente
  - c/<slug>.json        productos y usos de un cultivo

Solo entran usos de productos vigentes con la dosis normalizada (por hL o por ha).
Uso:  python3 scripts/exportar_usos.py ../fnf-mapa
"""
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

ORIGEN = Path(sys.argv[1] if len(sys.argv) > 1 else "../fnf-mapa")
DESTINO = Path(__file__).resolve().parent.parent / "herramientas" / "datos"

# Tipo de plantación: decide la escena 3D, el volumen de copa y los valores de partida.
TIPOS = [
    ("vid", r"^(vid|uva|parral|kiwi)"),
    ("olivo", r"^olivo"),
    ("arbol", r"almendro|avellano|nogal|pistach|casta[ñn]o|pacano|frutales|frutos c[ií]tricos|c[ií]tricos|naranjo|limonero|"
              r"mandarin|pomelo|lima$|manzano|peral|membrillero|melocot|nectarin|albaricoquero|ciruel|cerezo|granado|"
              r"caqui|aguacate|mango|n[ií]spero|higuera|algarrobo|moreras|chirimoyo|[áa]rboles y arbustos frutales"),
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
    return "barra"


def num(v):
    try:
        x = float(v)
        return int(x) if x.is_integer() else round(x, 4)
    except (TypeError, ValueError):
        return None


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

"""Cambios del registro entre dos exportaciones de la calculadora: la base de las alertas.

Compara los datos de herramientas/datos/c/ de una versión de git (por defecto, la del
último commit) con los del disco, recién exportados con exportar_usos.py. Solo mira los usos
propios de cada cultivo (no los heredados de su grupo, que ya salen en el grupo).

Para cada producto y cultivo dice si se ha retirado, si cambian dosis, caldo, aplicaciones o
plazo de seguridad, y si gana usos nuevos. Escribe un informe en Markdown: con él se buscan en
el correo las suscripciones («FnF · alerta del registro») de esos productos y se avisa.

Uso:  python3 scripts/cambios_registro.py [ref de git] > cambios.md
"""
import json
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CARPETA = "herramientas/datos/c"
REF = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
CAMPOS = {4: "dosis mínima", 5: "dosis máxima", 6: "caldo mínimo", 7: "caldo máximo",
          8: "aplicaciones", 9: "intervalo (días)", 10: "plazo de seguridad (días)"}


def git(*args):
    return subprocess.run(["git", *args], cwd=RAIZ, capture_output=True, text=True, check=True).stdout


def antiguos():
    datos = {}
    for ruta in git("ls-tree", "--name-only", f"{REF}:{CARPETA}").split():
        datos[ruta] = json.loads(git("show", f"{REF}:{CARPETA}/{ruta}"))
    return datos


def nuevos():
    return {f.name: json.loads(f.read_text(encoding="utf-8")) for f in (RAIZ / CARPETA).glob("*.json")}


def propios(datos):
    """{(registro, plaga): uso} con los usos registrados en el propio cultivo."""
    return {(u[0], u[1]): u for u in datos["usos"] if len(u) == 11}


def main():
    viejo, nuevo = antiguos(), nuevos()
    lineas, total = [], 0
    for archivo in sorted(set(viejo) | set(nuevo)):
        a = propios(viejo[archivo]) if archivo in viejo else {}
        b = propios(nuevo[archivo]) if archivo in nuevo else {}
        cultivo = (nuevo.get(archivo) or viejo.get(archivo))["cultivo"]
        nombres = {**(viejo.get(archivo) or {}).get("productos", {}), **(nuevo.get(archivo) or {}).get("productos", {})}
        por_producto = {}
        for clave in a.keys() - b.keys():
            por_producto.setdefault(clave[0], []).append(f"ya no está autorizado contra {clave[1]}")
        for clave in b.keys() - a.keys():
            por_producto.setdefault(clave[0], []).append(f"nuevo uso contra {clave[1]}")
        for clave in a.keys() & b.keys():
            cambios = [f"{CAMPOS[i]} {a[clave][i]} → {b[clave][i]}" for i in CAMPOS if a[clave][i] != b[clave][i]]
            if cambios:
                por_producto.setdefault(clave[0], []).append(f"contra {clave[1]}: " + ", ".join(cambios))
        regs_a, regs_b = {k[0] for k in a}, {k[0] for k in b}
        for reg in sorted(por_producto):
            nombre = nombres.get(reg, ["?"])[0]
            retirado = reg in regs_a and reg not in regs_b
            lineas.append(f"### {nombre} (nº {reg}) · {cultivo}" + (" · **RETIRADO DEL CULTIVO**" if retirado else ""))
            lineas += [f"- {c}" for c in sorted(por_producto[reg])]
            lineas.append("")
            total += 1
    print(f"# Cambios del registro: {REF} → disco\n")
    print(f"{total} productos con cambios en algún cultivo.\n" if total else "Sin cambios.\n")
    print("\n".join(lineas))


if __name__ == "__main__":
    main()

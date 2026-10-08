#!/bin/bash
# Carga semanal del registro del MAPA en la web (calculadora de caldo y páginas de usos).
#
#   1. Refresca el estado de los productos (vigente o cancelado) con fnf-mapa/scrape_mapa.py.
#   2. Exporta los usos (los cancelados salen), pone versión, regenera las páginas de usos.
#   3. Compara con el último commit (scripts/cambios_registro.py) y guarda el informe.
#   4. Si los datos han cambiado, hace commit y push (GitHub Pages publica solo).
#   5. Lista los productos vigentes que aún no tienen usos descargados: esos se bajan a mano con
#      fnf-mapa/scrape_usos.py, porque mezclar CSV de forma automática es arriesgado.
#
# Uso:  scripts/actualizar_registro.sh [--sin-scrape] [--sin-push]
# Informe y log en ~/fnf-mapa-logs/. Lo lanza el LaunchAgent com.fnfanalytics.registro (lunes, 7:00).
set -uo pipefail
WEB="$(cd "$(dirname "$0")/.." && pwd)"
MAPA="$WEB/../fnf-mapa"
APP="$WEB/../agridashboard"
LOGS="$HOME/fnf-mapa-logs"; mkdir -p "$LOGS"
FECHA=$(date +%Y%m%d-%H%M%S)
INFORME="$LOGS/cambios-web-$FECHA.md"
exec > >(tee -a "$LOGS/web-$FECHA.log") 2>&1
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
SCRAPE=1; PUSH=1
for a in "$@"; do case "$a" in --sin-scrape) SCRAPE=0;; --sin-push) PUSH=0;; esac; done
avisar() { osascript -e "display notification \"$1\" with title \"FnF · registro del MAPA\"" 2>/dev/null || true; }

echo "===== $(date) — carga del registro en la web ====="
if [ "$SCRAPE" = 1 ]; then
  echo "[1/5] estado de los productos en el registro..."
  ( cd "$MAPA" && python3 scrape_mapa.py registro_fitosanitarios.csv.nuevo ) || { echo "FALLO del scrape"; avisar "Falló la descarga del registro"; exit 1; }
  # solo se sustituye si la descarga parece completa (no menos del 95 % de las filas de antes)
  antes=$(wc -l < "$MAPA/registro_fitosanitarios.csv"); ahora=$(wc -l < "$MAPA/registro_fitosanitarios.csv.nuevo")
  if [ "$ahora" -lt $((antes * 95 / 100)) ]; then echo "Descarga incompleta ($ahora de $antes filas): no se usa"; avisar "Descarga del registro incompleta"; exit 1; fi
  mv "$MAPA/registro_fitosanitarios.csv.nuevo" "$MAPA/registro_fitosanitarios.csv"
fi

echo "[2/5] exportar, versionar y regenerar las páginas..."
cd "$WEB"
python3 -I scripts/exportar_usos.py "$MAPA" "$APP" || { avisar "Falló la exportación"; exit 1; }
python3 -I scripts/versionar.py
python3 -I scripts/generar_paginas_usos.py

echo "[3/5] cambios frente al último commit..."
python3 -I scripts/cambios_registro.py > "$INFORME"

echo "[4/5] productos vigentes sin usos descargados..."
python3 -I - "$MAPA" >> "$INFORME" <<'PY'
import csv, sys
from pathlib import Path
m = Path(sys.argv[1])
leer = lambda f: list(csv.DictReader(open(m / f, encoding="utf-8"), delimiter=";"))
con_usos = {r["NumRegistro"] for r in leer("usos_normalizado.csv")}
nuevos = [r for r in leer("registro_fitosanitarios.csv") if r["Situacion"].strip().lower() == "vigente" and r["NumRegistro"] not in con_usos]
print(f"\n## Vigentes sin usos descargados: {len(nuevos)}\n")
print("Se bajan con `python3 scrape_usos.py <IdProducto> …` en fnf-mapa, después `normalizar_dosis.py`.\n")
for r in nuevos[:40]:
    print(f"- {r['Nombre']} (nº {r['NumRegistro']}, IdProducto {r['IdProducto']})")
if len(nuevos) > 40:
    print(f"- … y {len(nuevos) - 40} más")
PY
echo "  informe: $INFORME"

echo "[5/5] publicar si hay cambios..."
if git diff --quiet -- herramientas usos sitemap.xml; then
  echo "  sin cambios en los datos"
  avisar "Registro revisado: sin cambios en la web"
else
  sed -i '' "s#<loc>https://fnfanalytics.com/herramientas/calculadora-caldo</loc><lastmod>[0-9-]*</lastmod>#<loc>https://fnfanalytics.com/herramientas/calculadora-caldo</loc><lastmod>$(date +%Y-%m-%d)</lastmod>#" sitemap.xml
  git add herramientas usos sitemap.xml
  git commit -q -m "datos: carga semanal del registro del MAPA ($(date +%d-%m-%Y))" -m "Informe: $INFORME"
  if [ "$PUSH" = 1 ]; then git -c http.postBuffer=524288000 push -q && echo "  publicado"; fi
  avisar "Registro actualizado en la web. Informe en fnf-mapa-logs"
fi
echo "===== $(date) — hecho ====="

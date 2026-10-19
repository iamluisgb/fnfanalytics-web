#!/bin/bash
# Informe semanal de Umami (scripts/informe_umami.py) en ~/fnf-mapa-logs/umami-AAAAMMDD.md.
# Lo lanza el LaunchAgent com.fnfanalytics.umami (lunes, 7:30).
set -uo pipefail
WEB="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$HOME/fnf-mapa-logs"; mkdir -p "$LOGS"
OUT="$LOGS/umami-$(date +%Y%m%d).md"
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
avisar() { osascript -e "display notification \"$1\" with title \"FnF · Umami\"" 2>/dev/null || true; }
# Why: la API de umami.is corta a veces a los 30 s. Se reintenta y se escribe a un temporal,
# para no dejar un umami-AAAAMMDD.md a medias que parezca un informe bueno (pasó el 19-oct).
TMP=$(mktemp "${TMPDIR:-/tmp}/umami-XXXXXX")
for intento in 1 2 3; do
  if python3 -I "$WEB/scripts/informe_umami.py" 7 > "$TMP" 2>> "$LOGS/umami.log" && [ -s "$TMP" ]; then
    chmod 644 "$TMP"; mv "$TMP" "$OUT"
    avisar "Informe semanal listo: $(basename "$OUT")"
    exit 0
  fi
  echo "===== $(date) informe de Umami: fallo el intento $intento =====" >> "$LOGS/umami.log"
  sleep 60
 done
rm -f "$TMP"
echo "===== $(date) informe de Umami: se rinde tras 3 intentos =====" >> "$LOGS/umami.log"
avisar "Falló el informe de Umami (mira umami.log)"; exit 1

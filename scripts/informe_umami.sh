#!/bin/bash
# Informe semanal de Umami (scripts/informe_umami.py) en ~/fnf-mapa-logs/umami-AAAAMMDD.md.
# Lo lanza el LaunchAgent com.fnfanalytics.umami (lunes, 7:30).
set -uo pipefail
WEB="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$HOME/fnf-mapa-logs"; mkdir -p "$LOGS"
OUT="$LOGS/umami-$(date +%Y%m%d).md"
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
avisar() { osascript -e "display notification \"$1\" with title \"FnF · Umami\"" 2>/dev/null || true; }
if python3 -I "$WEB/scripts/informe_umami.py" 7 > "$OUT" 2>> "$LOGS/umami.log"; then
  avisar "Informe semanal listo: $(basename "$OUT")"
else
  avisar "Falló el informe de Umami (mira umami.log)"; exit 1
fi

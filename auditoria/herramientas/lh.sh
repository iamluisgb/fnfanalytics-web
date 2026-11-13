#!/bin/bash
# Uso: lh.sh <carpeta-salida> — Lighthouse móvil (4G lenta simulada, CPU x4) y escritorio de las 6 páginas principales.
OUT=$1; mkdir -p $OUT/lh; cd "$(dirname "$0")"
export CHROME_PATH=/opt/pw-browsers/chromium
[ -x "$CHROME_PATH" ] || CHROME_PATH=$(ls -d /opt/pw-browsers/chromium*/chrome-linux*/chrome 2>/dev/null | head -1)
for par in portada:/ calculadora:/herramientas/calculadora-caldo direccion:/herramientas/direccion-de-trabajo usos:/usos/olivo/repilo-del-olivo metodo:/metodo fuentes:/fuentes-datos-publicos; do
  n=${par%%:*}; u=${par#*:}
  for modo in movil escritorio; do
    extra=""; [ $modo = escritorio ] && extra="--preset=desktop"
    npx lighthouse "http://localhost:8765$u" $extra --quiet --output=json --output-path=$OUT/lh/$n-$modo.json \
      --chrome-flags="--headless=new --no-sandbox --disable-gpu-sandbox --ignore-certificate-errors" --only-categories=performance,accessibility,best-practices,seo 2>/dev/null
  done
done
python3 - $OUT <<'PY'
import json,sys,glob,os
print(f"{'página':22}{'rend':>5}{'acc':>5}{'bp':>5}{'seo':>5}{'FCP':>7}{'LCP':>7}{'TBT':>7}{'CLS':>7}{'SI':>7}{'peso KB':>9}")
for f in sorted(glob.glob(sys.argv[1]+'/lh/*.json')):
    d=json.load(open(f)); c=d['categories']; a=d['audits']
    g=lambda k:a[k].get('numericValue') or 0
    print(f"{os.path.basename(f)[:-5]:22}{c['performance']['score']*100:5.0f}{c['accessibility']['score']*100:5.0f}{c['best-practices']['score']*100:5.0f}{c['seo']['score']*100:5.0f}{g('first-contentful-paint')/1000:7.1f}{g('largest-contentful-paint')/1000:7.1f}{g('total-blocking-time'):7.0f}{g('cumulative-layout-shift'):7.3f}{g('speed-index')/1000:7.1f}{g('total-byte-weight')/1024:9.0f}")
PY

# fnfanalytics-web

Landing pública de Food & Farm Analytics — https://fnfanalytics.com
Generada desde `workspace/fnfanalytics-relanzamiento/` (design system v2).

## Estructura
- `index.html` — landing. `privacidad.html`, `aviso-legal.html`, `cuaderno-digital.html` (guía SEO), `asesores.html`, `404.html`: GitHub Pages las sirve sin extensión (`/asesores`).
- `assets/site.css` — tokens v2.0 + estilos de todas las páginas. Fuentes en `assets/fonts/`, foto del hero en WebP.
- Sección Analítica (`index.html#analitica` + `assets/analitica.js`): mapa como el SIG de la app: ortofoto PNOA (IGN, CC BY 4.0) con la capa WMS `recinto` de sigpac-hubcloud.es incrustada (líneas magenta), en `assets/mapa-olivar.webp` (zoom 19, 1600 px). Encima, 6 recintos SIGPAC de olivar en Baeza resaltados con su geometría real (OGC API de sigpac-hubcloud); nombres, NDVI y márgenes son de ejemplo. El BI (margen por parcela) usa datos de ejemplo de esas mismas parcelas y comparte la selección con el mapa. **No publicar datos reales de la v1.** Los ejemplos de tratamiento usan productos reales del registro (CURENOX 50 BLUE WP, nº 12612: repilo en olivo, 150-330 g/hL, P.S. 14 días). La rampa NDVI está validada con el validador de dataviz (`--ordinal`).
- `og.jpg` — imagen para compartir (1200×630). `robots.txt` y `sitemap.xml`: actualiza `lastmod` al cambiar contenido.
- Las subpáginas comparten cabecera y pie copiados a mano: si cambias la navegación, cámbiala en todas.
- La guía del cuaderno digital lleva fecha de revisión: revísala cuando cambie la normativa.
- Pendiente legal: añadir NIF y domicilio del titular en `aviso-legal.html` (LSSI art. 10).

## Captura de leads
El formulario envía por AJAX a **FormSubmit** → llegan a tu correo con asunto "FnF · nueva solicitud de acceso" (perfil + email en tabla).
- **Activación (una sola vez)**: haz un envío de prueba y pulsa el enlace de activación que te llega por correo.
- **Anti-scraping**: tras activar, FormSubmit te da un alias aleatorio (`formsubmit.co/ajax/<alias>`) — sustitúyelo en `index.html` para no exponer el correo.
- **Upgrade** cuando arranque el Radar: MailerLite o Brevo (lista + newsletter + API) y el form apunta a su endpoint.

## Publicación
GitHub Pages (branch `main`, raíz) + dominio apex `fnfanalytics.com` (archivo CNAME).
DNS en Namecheap → ver instrucciones en el repo del workspace o en la conversación de lanzamiento.

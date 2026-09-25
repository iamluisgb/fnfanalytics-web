# fnfanalytics-web

Landing pública de Food & Farm Analytics — https://fnfanalytics.com
Generada desde `workspace/fnfanalytics-relanzamiento/` (design system v2).

## Estructura
- `index.html` — landing. `privacidad.html`, `aviso-legal.html`, `cuaderno-digital.html` (guía SEO), `asesores.html`, `404.html`: GitHub Pages las sirve sin extensión (`/asesores`).
- `assets/site.css` — tokens v2.0 + estilos de todas las páginas. Fuentes en `assets/fonts/`, foto del hero en WebP.
- Sección Analítica (`index.html#analitica` + `assets/analitica.js`): mapa sobre ortofoto PNOA (IGN, CC BY 4.0) con 10 recintos SIGPAC reales de olivar en Baeza (solo geometría; nombres y NDVI inventados, etiquetados como ejemplo). Imagen en `assets/mapa-olivar.webp`, zoom 19 reescalada a 1600 px; los recintos se dibujan con un margen interior de 3 px para que se separen. El BI (margen por parcela) usa datos de ejemplo de esas mismas parcelas y comparte la selección con el mapa. **No publicar datos reales de la v1.** La rampa NDVI está validada con el validador de dataviz (`--ordinal`).
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

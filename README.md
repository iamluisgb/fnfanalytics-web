# fnfanalytics-web

Landing pública de Food & Farm Analytics — https://fnfanalytics.com
Generada desde `workspace/fnfanalytics-relanzamiento/` (design system v2).

## Captura de leads
El formulario envía por AJAX a **FormSubmit** → llegan a tu correo con asunto "FnF · nueva solicitud de acceso" (perfil + email en tabla).
- **Activación (una sola vez)**: haz un envío de prueba y pulsa el enlace de activación que te llega por correo.
- **Anti-scraping**: tras activar, FormSubmit te da un alias aleatorio (`formsubmit.co/ajax/<alias>`) — sustitúyelo en `index.html` para no exponer el correo.
- **Upgrade** cuando arranque el Radar: MailerLite o Brevo (lista + newsletter + API) y el form apunta a su endpoint.

## Publicación
GitHub Pages (branch `main`, raíz) + dominio apex `fnfanalytics.com` (archivo CNAME).
DNS en Namecheap → ver instrucciones en el repo del workspace o en la conversación de lanzamiento.

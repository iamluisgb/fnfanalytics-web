# Auditoría de fnfanalytics.com — 13 de noviembre de 2026

Rama: `mejoras/auditoria-2026-11-13`. Nada de esto está publicado: publicar es hacer merge a `main`, y eso lo decide Luis.

## Resumen

La web estaba bien construida: sin errores propios en consola, sin enlaces internos rotos, HTML válido y SEO técnico correcto en las páginas principales. Los problemas serios eran cuatro, y ya están arreglados en la rama:

1. **La tipografía de marca no se veía.** Los tres archivos de Poppins eran el subconjunto devanagari: no traían letras latinas. Toda la web salía con la fuente del sistema y aun así precargaba 118 KB de fuentes inútiles.
2. **La portada cargaba 1,2 MB y bloqueaba el móvil.** La demo 3D (three.js y su ortofoto) se pedía con la página y se seguía pintando a 60 imágenes por segundo aunque estuviera fuera de pantalla, también mientras alguien rellenaba el formulario.
3. **Las 168 páginas de usos publicadas tenían la miga de pan rota** («Usos autorizados Cómo comprobamos › Olivo»): alguien las editó a mano y dejaron de coincidir con su generador.
4. **Las cinco fichas de plantillas no tenían ningún enlace entrante**, ni canonical, ni Open Graph, ni medición.

Quedan pendientes de decisión de Luis doce puntos de mensaje, contenido y texto legal (sección 4).

## 1. Cómo se midió

- Servidor local que imita GitHub Pages (rutas sin `.html`, `404.html`, gzip): `auditoria/herramientas/servidor.py`.
- Lighthouse 12 en móvil (4G lenta y CPU ×4 simuladas) y en escritorio, sobre portada, calculadora, dirección de trabajo, una página de usos, método y fuentes: `lh.sh`.
- axe-core (WCAG 2.0, 2.1 y 2.2 A y AA, más buenas prácticas) con Playwright a 375 y 1440 px en 17 páginas, con consola, peticiones fallidas, desbordamiento horizontal y captura de página entera: `medir.mjs`. También con el tema oscuro del sistema: `oscuro.mjs`.
- Enlaces internos, anclas, páginas huérfanas, sitemap y metadatos de las 230 páginas, leyendo los archivos: `enlaces.py`.
- Flujos a mano con Playwright (formulario, demo, mapa, calculadora, filtros, buscador de usos), en móvil y escritorio, con movimiento reducido y sin JavaScript: `flujos.mjs`. 57 comprobaciones, todas correctas al final.

Para repetirlo: `cd auditoria/herramientas && npm i lighthouse @axe-core/playwright playwright && python3 servidor.py ../.. 8765 &` y luego `node medir.mjs salida`, `./lh.sh salida`, `python3 enlaces.py ../.. salida/externos.json`, `node flujos.mjs`.

**Límites de esta medición, para leer bien las cifras:**

- El equipo de pruebas no tiene GPU: las escenas 3D se pintan por software, a 1 imagen por segundo en móvil. El «tiempo de bloqueo» (TBT) de la portada y de la calculadora en móvil está muy inflado y varía de una pasada a otra (la calculadora dio 8,2 s, 18,0 s y 5,5 s con el mismo código). Sirve para comparar el antes y el después de la portada, no como cifra real de un teléfono.
- No hay salida a internet desde el entorno: **no se pudieron comprobar los 75 enlaces externos** ni las teselas del mapa de dirección de trabajo (IGN y SIGPAC). La lista está en `externos.json` al ejecutar `enlaces.py`.
- No hay datos de Umami ni de Search Console: no sé cuánta gente llega al formulario ni qué página convierte. Por eso no propongo cambiar el orden de la portada.
- El formulario se probó interceptando la petición: no salió ninguna solicitud real hacia el Worker.

## 2. Antes y después

### Lighthouse

| Página | Modo | Rendimiento | Accesibilidad | LCP | CLS | TBT | Peso |
|---|---|---|---|---|---|---|---|
| Portada | móvil | 64 → **99** | 96 → **100** | 2,8 s → 1,9 s | 0,000 → 0,020 | 169.722 ms → 99 ms | 1.203 KB → **221 KB** |
| Portada | escritorio | no terminó (el navegador se cerraba) → **100** | — → 100 | — → 0,5 s | — → 0,000 | — → 0 ms | — → 221 KB |
| Calculadora | móvil | 52 → 68 | 96 → **100** | 0,9 s → 0,9 s | **0,242 → 0,021** | 8.202 ms → 5.502 ms (ver límites) | 384 KB → 292 KB |
| Calculadora | escritorio | 80 → 85 | 96 → 100 | 0,2 s → 0,3 s | 0,130 → 0,062 | 344 ms → 336 ms | 384 KB → 292 KB |
| Dirección de trabajo | móvil | 100 → 100 | 93 → **100** | 0,9 s → 0,9 s | 0,000 → 0,021 | 0 → 0 ms | 242 KB → 151 KB |
| Página de usos (repilo en olivo) | móvil | 100 → 100 | 96 → **100** | 0,9 s → 0,9 s | 0,000 → 0,021 | 71 → 30 ms | 177 KB → 85 KB |
| Método | móvil | 100 → 100 | 96 → **100** | 0,8 s → 0,8 s | 0,000 → 0,020 | 4 → 0 ms | 186 KB → 94 KB |
| Fuentes | móvil | 99 → 100 | 97 → **100** | 0,9 s → 0,9 s | 0,000 → 0,020 | 110 → 1 ms | 200 KB → 108 KB |

SEO: 100 en las seis páginas antes y después. Buenas prácticas: 100, salvo dirección de trabajo (96, por las teselas externas que aquí no cargan).

El CLS sube de 0,000 a 0,02 en varias páginas porque ahora sí se carga Poppins y el texto se reajusta un poco al llegar. Está muy por debajo del límite de 0,1. Con una fuente de reserva ajustada y la precarga del peso normal bajó de 0,15 a 0,02.

### axe (fallos por página, móvil / escritorio)

| Página | Antes | Después |
|---|---|---|
| Portada | contraste (3/5), nombre del logo, sin `<main>`, 46/30 bloques fuera de región | 0 / 0 propios; quedan 9 de contraste dentro de la demo, solo en móvil (decisión P10) |
| Calculadora | contraste (5/4), nombre del logo | 0 / 0 |
| Dirección de trabajo | contraste, nombre del logo, 3 enlaces que solo se distinguen por el color | 0 / 0 |
| Usos | contraste, nombre del logo, cabecera de tabla vacía | 0 / 0 |
| Método, fuentes, asesores, cuaderno, privacidad, aviso legal | contraste (1–2), nombre del logo | 0 / 0 |
| 404 | contraste, nombre del logo, sin `<main>` | 0 / 0 |
| Plantillas (índice y fichas) | 0 | 0 |
| Creador de plantillas | 7 reglas (etiquetas de formulario, sin `<h1>`, sin `<main>`) y desborda en móvil | igual (decisión P9) |

### Otros

| | Antes | Después |
|---|---|---|
| Fuentes Poppins | 118 KB, sin letras latinas | 24 KB, con ellas |
| Ortofoto del mapa de analítica | 360 KB, con la página | 153 KB, al acercarse |
| Peticiones al cargar la portada (móvil) | 23 | 14 |
| Demo 3D fuera de pantalla | se pinta siempre | 0 imágenes |
| Páginas sin enlaces entrantes | 5 (fichas de plantillas) | 0 |
| Páginas indexables sin canonical ni Open Graph | 7 (plantillas) | 0 |
| Páginas de usos con la miga de pan rota | 168 | 0 |
| Títulos de más de 65 caracteres en `usos/` | 134 | 0 |

Capturas de antes y después en `auditoria/capturas/`: `tipografia-hero-1440.jpg`, `portada-375-arriba.jpg`, `formulario-pie-375.jpg`, `usos-miga-de-pan-1440.jpg`, `plantillas-375.jpg`, `calculadora-375.jpg`.

## 3. Hallazgos arreglados en la rama

Impacto y esfuerzo: alto, medio o bajo. Las líneas son las del archivo antes del cambio.

### Conversión

| # | Hallazgo | Dónde | Evidencia | Impacto | Esfuerzo | Qué se hizo |
|---|---|---|---|---|---|---|
| A1 | La tipografía de marca no se pintaba | `assets/fonts/Poppins-*.woff2`, `assets/site.css:1-3` | El cmap de los tres archivos tenía 4 caracteres latinos y 94 devanagari; el navegador declaraba `Inter` (sistema) para el `h1`. Captura `tipografia-hero-1440.jpg` | Alto | Bajo | Subconjunto latino oficial (OFL). **Es el cambio que más se ve: revísalo en pantalla** |
| A2 | No se sabía qué página trae cada solicitud | cabeceras de 9 subpáginas, `scripts/generar_paginas_usos.py:117` | El formulario ya mandaba `origen`, pero solo la calculadora lo rellenaba; todo lo demás llegaba como «web» | Alto | Bajo | Cada botón «Solicita acceso» lleva `?origen=<página>`. Sin eventos nuevos |
| A3 | Con un error en el formulario, el foco no iba al campo | `index.html:498-520` | En móvil, con el teclado abierto, el aviso queda fuera de la vista | Medio | Bajo | Foco y `aria-invalid` en el campo que falla; el mensaje de recibido recibe el foco |
| A4 | Sin JavaScript el formulario no hacía nada | `index.html:389` | `novalidate` y sin `action` | Bajo | Bajo | Aviso con el correo dentro de `<noscript>` |
| A5 | Plantillas sin camino de vuelta al sitio ni al formulario, y sin medición | `plantillas/*.html` | Sin cabecera, pie ni Umami | Medio | Bajo | Pie con enlaces al sitio y a «Solicita acceso» (`origen=plantillas`) y Umami |
| A6 | La página 404 tenía la descripción y el Open Graph del aviso legal | `404.html:7-13` | Copiado de `aviso-legal.html` | Bajo | Bajo | Metadatos propios |

### Rendimiento

| # | Hallazgo | Dónde | Evidencia | Impacto | Esfuerzo | Qué se hizo |
|---|---|---|---|---|---|---|
| B1 | El marco 3D se pedía con la portada | `index.html:160` | Lighthouse móvil: 1.203 KB y 23 peticiones; `loading="lazy"` no lo evitaba | Alto | Bajo | El `src` se pone cuando la sección está cerca. Con `#inteligencia-<escenario>` carga enseguida |
| B2 | La demo 3D se pintaba siempre | `demo/inteligencia.html:996-1016` | El bucle no miraba si se veía. TBT de 170 s en la prueba | Alto | Bajo | Se para fuera de pantalla o con la pestaña oculta y se reanuda al volver. Probado: 0 imágenes fuera de pantalla |
| B3 | Ortofoto del mapa: 360 KB a 1600 px para un hueco de ~760 px | `assets/mapa-frutales.webp`, `index.html:183` | Segunda imagen más pesada | Medio | Bajo | 1200 px, 153 KB, y se pide al acercarse. Las parcelas no se mueven |
| B4 | La calculadora saltaba 310 px al cargar en móvil | `herramientas/calculadora-caldo.html:220` | CLS 0,242 (límite 0,1): la escena aparecía encima de los pasos | Alto | Bajo | El hueco se reserva desde el principio. CLS 0,021 |
| B5 | La tarjeta de dictado crecía mientras se escribía la frase | `assets/site.css:408` | CLS de hasta 0,19 en escritorio | Medio | Bajo | La caja reserva sus tres líneas |
| B6 | Salto al cambiar de fuente | `assets/site.css:1-5` | CLS 0,15 en fuentes, escritorio, al arreglar A1 | Medio | Bajo | Fuente de reserva con las medidas de Poppins y precarga del peso normal |
| B7 | Versiones de caché puestas a mano | `site.css?v=20261030` en 12 archivos | Tras un cambio, quien tuviera la hoja en caché veía la vieja | Bajo | Bajo | `versionar.py` las calcula del contenido |

### Accesibilidad

| # | Hallazgo | Dónde | Evidencia | Impacto | Esfuerzo | Qué se hizo |
|---|---|---|---|---|---|---|
| C1 | El foco del teclado no se veía | `assets/site.css:154, 341, 370, 375, 424…` | `outline:none` con un resplandor de 1 px al 35 % (WCAG 2.4.7 y 2.4.11) | Alto | Bajo | Anillo de 2 px en todo lo pulsable |
| C2 | Texto con poco contraste | `assets/site.css:44-46, 340, 376, 384` | axe: 4,17:1 (ámbar), 4,26:1 (rojo), 4,38:1 (verde en píldoras), 3,68:1 (pie, a 9,6 px), 3,48:1 (selector del formulario) | Medio | Bajo | `--warn`, `--bad` y `--ok` del tema claro un punto más oscuros; grises sobre oscuro al tono ya definido; el pie sube a 11,2 px |
| C3 | Los botones del mapa 3D no existían para el lector de pantalla | `demo/inteligencia.html:197` | `role="img"` en el contenedor esconde lo de dentro | Medio | Bajo | `role="group"`; las listas con scroll se pueden enfocar |
| C4 | El lector de pantalla leía la demo de dictado letra a letra | `index.html:90`, `:126`, `:206` | `aria-live` en textos que cambian solos cada 22 ms o cada pocos segundos | Medio | Bajo | Se anuncia la frase y el resultado una vez; el diagrama y la campaña, solo cuando los mueve la persona |
| C5 | Sin `<main>` ni enlace para saltar la cabecera | `index.html`, `404.html` y todas | axe: `landmark-one-main` y 46 bloques fuera de región | Medio | Bajo | `<main>` y «Saltar al contenido» en todas |
| C6 | El nombre accesible del logo no coincidía con el texto | cabecera de todas | axe: `label-content-name-mismatch` (WCAG 2.5.3) | Bajo | Bajo | Se quita el `aria-label` |
| C7 | Cabecera de tabla vacía y enlaces del mapa sin subrayar | `scripts/generar_paginas_usos.py`, `assets/calculadora.css` | axe: `empty-table-header`, `link-in-text-block` | Bajo | Bajo | Cabecera para lector de pantalla; subrayado |

Con movimiento reducido todo funciona como dice el README: el diagrama sale encendido y quieto, la campaña no se recorre sola y la demo enseña el razonamiento. Sin JavaScript se ven las preguntas frecuentes, las 65 filas de fuentes, las tablas de usos y, ahora, las tarjetas de plantillas.

### SEO técnico

| # | Hallazgo | Dónde | Evidencia | Impacto | Esfuerzo | Qué se hizo |
|---|---|---|---|---|---|---|
| S1 | Cinco fichas de plantillas huérfanas | `plantillas/index.html:129-134` | Las tarjetas se pintaban con JavaScript y solo enlazaban el PDF | Alto | Bajo | Tarjetas en el HTML con enlace a su ficha |
| S2 | Plantillas sin canonical ni Open Graph, y enlazadas con `.html` | `plantillas/*.html` | 7 páginas; `index.html` y `creador.html` duplicaban direcciones del sitemap | Medio | Bajo | `scripts/plantillas_seo.py`, que se puede repetir |
| S3 | Títulos de usos cortados en Google | `scripts/generar_paginas_usos.py:72` | 134 de 183 pasaban de 65 caracteres por el sufijo de marca | Medio | Bajo | Los largos acaban en «· FnF» |
| S4 | `lastmod` del sitemap | `sitemap.xml` | — | Bajo | Bajo | Fecha de hoy en lo que cambia de verdad: portada, calculadora, plantillas y usos |

Sin problemas: canonical y Open Graph de las páginas principales, JSON-LD (`Organization`, `WebApplication`, `Article`, `BreadcrumbList`), sitemap sin páginas rotas, redirigidas ni `noindex`, y ningún enlace a `serida.org`.

### Código

| # | Hallazgo | Dónde | Evidencia | Impacto | Esfuerzo | Qué se hizo |
|---|---|---|---|---|---|---|
| E1 | `usos/` no coincidía con su generador | `usos/**/*.html:60` | Al regenerar cambiaban las 183 páginas: miga de pan rota en las publicadas y `?v=` vieja. Captura `usos-miga-de-pan-1440.jpg` | Alto | Bajo | Regenerado |
| E2 | Cabecera y pie copiados a mano en 9 archivos y en el generador | — | Tres variantes de cabecera y dos de pie | Medio | Medio | Una sola fuente: `scripts/cabecera_pie.py` |
| E3 | CSS sin uso | `assets/site.css` | `.sello`, `.cta2`, `.form-note`, `.steps` no aparecen en ningún HTML ni JS | Bajo | Bajo | Quitadas. Se dejan `.pill-*` y `.enter`, que son del sistema de diseño |

## 4. Pendiente de decisión de Luis

No he tocado nada de esto. Va por orden de impacto.

| # | Qué | Dónde | Por qué importa | Propuesta |
|---|---|---|---|---|
| P1 | **La cifra de productos no cuadra**: la demo dice «2.585 productos vigentes» y la portada y `/metodo`, 1.718 | `demo/inteligencia.html:255` frente a `index.html:105` y `metodo.html` | Los datos del repo dan 1.718 productos, 379 cultivos y 83.393 usos, que es lo que pone `/metodo`. La cifra de la demo está escrita a mano fuera de `evaluar()` | Si 2.585 es el total del registro y 1.718 los que tienen usos agrícolas, decirlo igual en los dos sitios; si no, poner 1.718 en la demo |
| P2 | **La quinta comprobación de la portada no está en `/metodo`** | `index.html:133` («Equipo, tractor y horas») frente a la tabla de `metodo.html:77` (producto vigente, autorizado, dosis, plazo, parcela) | El diagrama enlaza a «Cómo lo comprobamos» y allí esa comprobación no aparece | Añadirla a `/metodo` si la app la hace, o cambiarla en el diagrama por la que falta («Autorizado en tu cultivo») |
| P3 | **Afirmaciones que no puedo verificar contra la app** | `index.html:84` («Funciona sin cobertura»), `:122` («Importación de otro cuaderno»), `:142`, `:275` y `asesores.html` («Presentación oficial en lote»), `:313` y `:369` («Listo para… el cuaderno digital oficial», «conforme al… CUE/SIEX») | WhatsApp ya se quitó por no estar. Si el envío al SIEX o la importación aún no funcionan, prometen algo que la app no hace | Confirmar cada una. Las que no estén, con «en desarrollo», como en la demo |
| P4 | **Texto legal** | `privacidad.html:66` (fecha: 25 de septiembre; el formulario cambió de proveedor el 20 de octubre y la casilla de novedades es posterior), `:73` (falta una coma: «…u otro) si quieres…»), `aviso-legal.html` (NIF y domicilio, ya anotado en el README) | La política ya nombra a Cloudflare, así que el contenido está al día, pero la fecha no. Además, ahora el formulario manda la página de origen y las plantillas llevan Umami: son datos no personales, pero conviene que la política lo diga | Actualizar fecha, coma, y una frase sobre el origen de la visita |
| P5 | **El menú «Herramientas gratis» lleva a las plantillas** y las herramientas no están en el menú de escritorio | `scripts/cabecera_pie.py:79`; migas de `calculadora-caldo.html:67` y `direccion-de-trabajo.html:64` | Calculadora, dirección de trabajo, usos y fuentes son la entrada desde Google y solo se enlazan en el pie, en letra pequeña | Una entrada «Herramientas» en el menú con las cinco. Se cambia en un solo archivo |
| P6 | **Dirección de trabajo y usos no invitan a pedir acceso** | `herramientas/direccion-de-trabajo.html`, plantilla de `scripts/generar_paginas_usos.py` | La calculadora tiene «Regístralo en tu cuaderno»; estas dos solo el botón de la cabecera. Usos son 168 páginas de entrada | Un bloque final de una frase y un botón. Es mensaje nuevo: redáctalo tú o lo propongo |
| P7 | **El formulario está al final de una portada de 12.600 px en móvil** | `index.html:384` | Hay botón fijo en la cabecera y cuatro llamadas intermedias, así que no es grave. Sin datos de Umami no puedo decir si otro orden convierte más | Mirar en Umami `ve-precios` y `ve-acceso` frente a `acceso-enviado`. Si pocos llegan a `acceso`, probar un formulario corto (solo correo) bajo el hero. No cambio el orden |
| P8 | **Títulos y descripciones largos** | `cuaderno-digital.html:6` (89 caracteres), fichas de plantillas (hasta 94), descripciones de 175 a 225 caracteres en método, cuaderno, fuentes, calculadora y dirección | Google corta el título hacia los 60 y la descripción hacia los 160 | Te paso textos propuestos si quieres; es redacción |
| P9 | **Creador de plantillas** | `plantillas/creador.html` (línea 153 y formulario) | En móvil la hoja A4 desborda (1.135 px de ancho) y 16 campos no tienen etiqueta para lector de pantalla; sin `<h1>` | Arreglarlo es un trabajo aparte en una herramienta con diseño propio. ¿Lo hago? |
| P10 | **Tarjetas «pendientes» de la demo al 25 % de opacidad** | `demo/inteligencia.html:148` | Contraste 1,7:1 mientras no se encienden (9 avisos de axe en móvil). Es un estado intencionado | Subir a 0,5–0,6: se sigue leyendo como «aún no» |
| P11 | **`auditoria/`, `scripts/` y `README.md` se publican** en fnfanalytics.com | raíz del repo | GitHub Pages sirve todo lo que no empieza por `_`. He excluido `auditoria/` en `robots.txt` | Un `_config.yml` con `exclude`. No lo he puesto porque cambia cómo se construye el sitio y no lo puedo probar desde aquí |
| P12 | **Enlace al premio por `http://`** | `index.html:107` | No pude comprobar si `https://www.ceia3.es/…` responde (sin salida a internet) | Cambiarlo si carga |

Ideas menores, sin urgencia: `FAQPage` y `WebSite` en JSON-LD de la portada; `plantillas/logo-fnf.png` pesa 66 KB para verse a 30 px; three.js r128 (604 KB, 150 KB comprimido) lo usan la demo y la calculadora, y una versión recortada ahorraría unos 75 KB; en escritorio a 1440 px, el botón «Saltar al final» de la demo pisa las cifras de la esquina mientras dura la historia.

## 5. Cómo publicar

1. Revisa la rama en local: `python3 auditoria/herramientas/servidor.py . 8765` y abre `http://localhost:8765`.
2. Mira sobre todo la tipografía (A1), que cambia el aspecto de toda la web.
3. Merge a `main`. No hay nada que desplegar aparte: el Worker no se ha tocado.
4. Después, en Umami, las solicitudes llegarán con su `origen`.

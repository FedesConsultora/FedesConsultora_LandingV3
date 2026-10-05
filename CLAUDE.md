# Fedes Consultora: nueva web

Sitio web corporativo de Fedes Consultora, más un portal de leads (panel de administración y landings privadas por prospecto). Este archivo se lee al iniciar cada sesión. Los documentos de `/docs` son la fuente de verdad del contenido: **no inventes textos, cifras ni datos**.

## Objetivo del sitio

Llamar la atención de CEOs y ejecutivos corporativos, posicionar a Fedes como una opción de calidad en consultoría de empresas y lograr que agenden una **sesión de diagnóstico sin cargo**. Esa es la única conversión del sitio.

El **portal de leads** acompaña ese objetivo: permite gestionar y monitorear a los prospectos y entregarle a cada uno, cuando agenda la sesión, una landing privada cuyo contenido se desbloquea por etapas. El requerimiento completo está en `docs/09-portal-leads.md`.

## Cómo trabajar

1. Antes de cambiar contenido, consultá `/docs` (incluido `docs/09-portal-leads.md`) y `/referencias/referencias.md`.
2. Conservá Astro, la identidad visual V3 y el backend/portal existentes. No rehagas el producto ni migres de stack sin evidencia técnica concreta.
3. El sitio público se prerenderiza por defecto. Las rutas dinámicas existentes se mantienen on-demand con `prerender = false`; los secretos de servidor se leen en runtime.
4. Las migraciones `001–007` ya se aplicaron a producción: nunca editarlas. Toda evolución de schema va en una migración nueva.
5. Los textos del sitio público salen literalmente de los documentos. Si falta un texto, no lo inventes: dejá un marcador `[PENDIENTE]` y actualizá `docs/08-pendientes.md`.
6. Lo marcado `[PENDIENTE]` o `[CONFIRMAR]` no se publica como dato definitivo. Las decisiones abiertas del portal están en `docs/09-portal-leads.md`.
7. El VPS usa un Nginx compartido y `fedes-net`; no publiques puertos de la app ni instales otro proxy, Certbot o PostgreSQL.
8. V1 es referencia histórica. No copies Apps Script ni restaures contenido/módulos antiguos sin una decisión vigente de producto.

## Reglas que siempre se cumplen

**Posicionamiento**
- Somos una consultora de negocios que también ejecuta. Nunca nos definimos como «agencia» ni hablamos de «posteos» o «likes» como resultado.
- La ejecución es con equipo propio, sin terceros.

**Tono**
- Corporativo, directo y seguro. Primera persona del plural para hablar de Fedes («auditamos», «ejecutamos»).
- Tratamos de vos con voseo rioplatense sobrio («agendá», «podés», «tu empresa»). Sin coloquialismos.
- Sin emojis en ningún lugar del sitio, del panel ni de los mails.

**Contenido y legales**
- Nunca decir «Empresa B certificada». Hoy la certificación no se menciona en el sitio.
- No publicar precios. Tampoco dentro de las landings privadas del portal.
- La oferta se comunica como 7 onboardings de 60 días organizados en 3 rutas acumulativas: Mercado y marca (Digital, Identidad, Mercado), Oferta y comercial (Producto, Comercial) y Organización y finanzas (Organizacional, Financiero). No usar los nombres de los combos discontinuados («Imagen y presencia», «Crecimiento de mercado», «Estructura de hierro», «Full Fedes»).
- Los casos son anónimos: sin nombres, logos ni piezas de clientes.
- No publicar cifras sin respaldo ni prometer resultados garantizados. Toda cifra de un caso va con su plazo (60 días, la duración del onboarding).
- No comunicar la reestructuración interna del equipo (mudanza de oficina, cambios societarios).
- Vaddar se presenta siempre como **versión beta**.
- La sesión de diagnóstico es sin cargo.
- Contacto: solo Buenos Aires, Argentina. No hay dirección de coworking para publicar.

**Portal de leads y panel de administración**
- El contenido de cada landing privada es específico de cada prospecto y lo redactan y aprueban personas del equipo (Federico Chironi revisa y aprueba). No sale de `/docs`, pero **rigen todas las reglas de posicionamiento, tono y contenido de este archivo**.
- Las landings privadas nunca deben ser indexables ni adivinables: token aleatorio de al menos 128 bits guardado como hash, `noindex`, sin aparecer en el sitemap y sin analítica de terceros.
- Una etapa bloqueada no envía su contenido al navegador.
- Los datos de los leads son personales (Ley 25.326, Argentina). Los textos legales definitivos están pendientes de validación con un abogado: usá marcadores `[TEXTO LEGAL PENDIENTE]` en lugar de inventar redacción legal.
- Nada de scraping ni automatización sobre LinkedIn. El contacto inicial con los leads es manual.
- Las llamadas a la API de Claude, si se implementan, van siempre del lado del servidor y ningún borrador se publica ni se envía sin aprobación humana explícita.
- Datos de prueba siempre ficticios. No subas leads reales, emails reales ni credenciales al repo. Los secretos van en variables de entorno.

**Identidad visual** (detalle en `docs/07-identidad-visual.md`)
- Colores: `#44718D`, `#71A0C0`, `#1D1D1B` y blanco.
- Tipografías: Söhne (títulos, pesada) y DJR Banner (textos secundarios, liviana). Hay alternativas provisorias hasta tener las licencias.
- Logo solo en negro sobre blanco, blanco sobre negro o blanco sobre `#44718D`. Nunca cambiarle color, relleno ni proporciones.

## Estructura del proyecto

```
CLAUDE.md                          este archivo
docs/
  01-brief-y-decisiones.md         objetivo, público, posicionamiento y decisiones
  02-sitemap.md                    páginas, menú, metadatos y redirecciones
  03-inicio.md                     contenido de la página Inicio
  04-consultoria.md                contenido de la página Consultoría
  05-casos.md                      contenido de la página Casos
  06-contacto-y-nosotros.md        contenido de Contacto y de Nosotros (provisoria)
  07-identidad-visual.md           colores, tipografías, logo y elementos gráficos
  08-pendientes.md                 datos que faltan antes de publicar
  09-portal-leads.md               especificación del portal de leads y del panel de administración
referencias/
  referencias.md                   webs de referencia y qué tomar de cada una
  capturas/                        capturas de pantalla de las referencias
assets/                            logos, fotos y tipografías (a completar)
```

La arquitectura y operación de producción están en `docs/ARCHITECTURE.md`, `docs/DEPLOY_VPS.md`, `docs/OPERATIONS.md` y `docs/ROLLBACK.md`.

## Convenciones para el código

- Idioma del sitio: español (Argentina). Código y comentarios: en el idioma que definamos al elegir el stack.
- Mobile first y responsive. Accesibilidad básica: contraste alto, jerarquía de títulos, textos alternativos.
- Cada página pública con su `title` y `meta description` tal como figuran en `docs/02-sitemap.md`.
- Los textos deben poder editarse sin tocar la lógica (por ejemplo, en archivos de contenido separados de los componentes).
- Las tipografías y el color de acento se configuran en un solo lugar, para reemplazar las alternativas provisorias sin tocar componentes.

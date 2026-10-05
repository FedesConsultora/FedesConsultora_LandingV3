# 08 · Pendientes antes de publicar

> **Nota de vigencia:** los registros anteriores documentan decisiones y despliegues históricos de V3 sobre Vercel. La arquitectura de producción vigente es Astro Node standalone en Docker, detrás del proxy Nginx central; Neon y Resend siguen externos. Los procedimientos actuales están en `docs/DEPLOY_VPS.md` y `docs/OPERATIONS.md`. Las migraciones `001–007` están aplicadas en producción y no se editan.

Los pendientes de contenido no impiden trabajar ni hacer un rehearsal técnico. **Los textos legales sí bloquean el lanzamiento público con captación de datos y los mails reales**: no inventar contenido; mantener `PUBLIC_INDEXABLE=false` y `RESEND_API_KEY` ausente hasta su aprobación.

## Contenido

- **Caso Agro:** un dato de leads o ventas que acompañe la cifra de +297,3% en visualizaciones.
- **Caso Comercio exterior:** desafío de partida y base de cálculo del «hasta 50%».
- **Rutas 2 y 3:** detalle de «qué se alcanza» de los onboardings Producto, Comercial, Organizacional y Financiero. Hoy solo tienen descripción y entregable.
- **Plan mensual posterior al onboarding:** definir qué incluye. Hasta entonces no se listan servicios.
- **Empresa B:** estado de la certificación. Hasta confirmarlo no se menciona.
- **Tamaño objetivo de empresa** (público, `docs/01-brief-y-decisiones.md`): sigue sin confirmar si son empresas de más de 50 empleados. Los rangos del selector del formulario ya están definidos, ver más abajo.
- **Metadatos:** meta título y descripción del Inicio, meta descripción de Casos y metadatos de Nosotros.

## Diseño y marca

- **Logo en vector** (SVG): cargado el blanco en `/assets/logo/`. Falta la versión en negro.
- **Tipografías:** archivos con licencia de Söhne y DJR Banner, o alternativas definidas con diseño.
- **Color de acento:** confirmar si el verde agua del boceto de Figma se incorpora a la marca y con qué HEX.
- **Fotografía:** lineamientos (propia o de banco, tratamiento de color).
- **Textura de papel** y HEX del blanco de fondo.

## Técnico (a definir al construir)

- **Stack** y hosting.
- **Formulario de contacto:** a dónde llegan los datos y quién los recibe. Respuesta en menos de 24 horas.
- ~~**Agenda:** si la sesión se coordina por respuesta del equipo o con un calendario para elegir horario.~~ Resuelto (28/09): calendario de Google embebido en `/contacto`, con el formulario como alternativa.
- **Reemplazo del calendario por cal.com** (pedido del cliente, 29/09): pasar de Google Calendar a cal.com, que sí permite precompletar nombre, mail y demás datos del paso 1 en la página de reserva (Google no lo permite). Falta que el cliente cree la cuenta en cal.com y me pase la URL pública de reserva; ver detalle en el registro de más abajo.
- **Analítica** y seguimiento de la conversión (envíos del formulario).
- **Dominio:** fedesconsultora.com y redirección de `/agencia` hacia `/consultoria`.
- **Páginas legales:** Política de Privacidad y Términos y Condiciones ya existen en la web actual. Hay que actualizar la dirección.

## Fuera del sitio

- Actualizar la dirección en la Política de Privacidad y en los Términos y Condiciones.
- Actualizar la ubicación en Instagram y en Google Maps.
- Reemplazar la meta descripción de la web actual, que dice «Agencia de comunicación y marketing».
- Actualizar el kit de contexto del cliente: ficha, audiencia, calendario y productos.

## Registro de la construcción (Inicio)

- **Color de acento turquesa:** provisorio `#2EC4B6` (variable `--color-accent` en `src/styles/global.css`). No está en el manual de marca. Confirmar el HEX. Se usa solo en detalles (punto de la píldora, subrayado del menú activo, foco).
- **Metadatos del Inicio:** título y descripción propuestos en `src/content/inicio.ts`, armados con textos de los docs. Validar con el equipo.
- **Fotografía:** todas las fotos son de banco de Unsplash, provisorias, en `public/fotos/`, con su origen en `assets/fotos/README.md`. Cabeceras de Inicio, Consultoría, Casos y Contacto; «El problema»; e imágenes genéricas de industria en los tres casos (almacén, puerto, campo), que no son piezas ni instalaciones de clientes. Confirmar fuente definitiva, lineamientos y tratamiento de color.
- **Rótulos de sección del Inicio** (`El problema`, `Rutas`, `Cómo trabajamos`, `Casos`, `Por qué Fedes`) y rótulos del pie (`Menú`, `Contacto`, `Legales`): tomados de los nombres de sección de los docs, no son textos literales. Validar.
- **Logo:** cargado el SVG en blanco (menú, pie y favicon con la «D»). Falta la versión en negro por si se necesita sobre fondo blanco, y confirmar el favicon.
- **Tipografías:** provisorias, Inter (títulos) y Source Serif 4 Light (cuerpo). Reemplazar por Söhne y DJR Banner.
- **Indexación:** el artefacto de rehearsal lleva `PUBLIC_INDEXABLE=false`. Publicar una imagen nueva con `PUBLIC_INDEXABLE=true` sólo después del cutover, legales y contenido aprobados.
- **Formulario:** envío por Resend a `info@fedesconsultora.com` (provisorio). Falta crear la cuenta y la API key de Resend, y verificar el dominio de envío.

## Registro de la construcción (Consultoría, Casos, Contacto, Nosotros)

- **Meta descripción de Casos:** propuesta en `src/content/casos.ts`, armada con textos del doc. Validar.
- **Metadatos de Nosotros:** propuesta provisoria en `src/content/contacto.ts`. La página lleva `noindex` y queda fuera del menú y del pie.
- **Cierre de Casos:** el doc no define uno. Se reutiliza el texto de cierre del Inicio.
- **Rótulos de la escalera de Consultoría** («Ruta 01», «Nivel 1», «Incluye ...», «Entregable») y de Casos («Plazo»): armados a partir del doc, no son literales. Validar.
- **Marcadores `[PENDIENTE]` visibles en el sitio:** plan mensual (Consultoría), desafío y base de cálculo del «hasta 50%» y dato de leads o ventas del caso Agro (Casos), rangos de tamaño de empresa (selector del formulario), textos de Privacidad y Términos.
- **Mensajes técnicos del formulario** («Enviando…» y el mensaje de error) no están en los docs. Validar redacción.
- **Resend:** falta cuenta, API key y verificar el dominio de envío. Ver `.env.example`. Sin verificar el dominio, Resend solo entrega al mail dueño de la cuenta.
- **Privacidad y Términos:** son páginas con marcador. Falta migrar el texto vigente.

## Registro de la construcción (imágenes y animaciones)

- **Fondos abstractos:** generados en código (líneas finas, arcos, cuadrícula, resplandores y la palabra «60» en contorno) con la paleta de marca. El acento turquesa aparece apenas como resplandor tenue. Validar con diseño.
- **Tarjeta del hero del Inicio:** muestra «Sesión de diagnóstico: Sin cargo» y «Onboarding: 60 días», datos ya publicados en los docs. Validar la redacción de los rótulos.
- **Franja en movimiento del Inicio:** «Estrategia · Procesos · Tecnología · Consultoría de negocios · Ejecución propia», armada con textos de los docs. Validar.
- **Cifras animadas de los casos:** suben hasta su valor y siempre terminan con el texto exacto del doc (16%, 50%, +297,3%). Con «reducir movimiento» activado en el sistema no se animan.

## Registro de la construcción (SEO y GEO, fase 1)

- **Dominio asumido:** `https://fedesconsultora.com` para canonical, sitemap y datos estructurados. Se cambia con la variable `PUBLIC_SITE_URL`. Confirmar.
- **Lanzamiento (checklist vigente):**
  1. Publicar y validar la imagen OCI por SHA/digest con `PUBLIC_INDEXABLE=false`.
  2. Hacer el cutover del vhost existente de `fedesconsultora.com` al contenedor siguiendo `docs/DEPLOY_VPS.md`, sin cambiar DNS salvo que el preflight detecte una desviación.
  3. Validar redirects, sitemap, robots, headers privados y smoke externo.
  4. Resolver legales/contenido y recién entonces publicar otra imagen con `PUBLIC_INDEXABLE=true`.
  5. Enviar `https://fedesconsultora.com/sitemap-index.xml` a Google Search Console y Bing Webmaster Tools y habilitar GA4 si se configuró `PUBLIC_GA_ID`.
- **Datos estructurados:** `Organization`/`ProfessionalService`, `WebSite`, `BreadcrumbList`, `ContactPage` y un `Service` por ruta con sus onboardings (sin precios). Usan solo datos de los docs. No incluyen teléfono: el WhatsApp publicado tiene característica 221 (La Plata) y hay que confirmar que coincida con «Buenos Aires».
- **Metadatos:** título del Inicio acortado a 56 caracteres. La meta descripción de Consultoría (184 caracteres) se dejó tal cual figura en `docs/02-sitemap.md`, aunque Google puede cortarla cerca de los 155. Validar si se acorta.
- **`robots.txt`:** al lanzar permite a los rastreadores de buscadores con IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.). Decisión editable en `src/pages/robots.txt.ts`.
- **`llms.txt`:** resumen del sitio para asistentes de IA, con textos de los docs. Los enlaces apuntan a `fedesconsultora.com`.
- **Página 404:** textos provisorios, no están en los docs. Validar.
- **Imagen para compartir** (`og-fedes.jpg`) e íconos: se generan con `node scripts/generate-brand-assets.mjs` a partir del logo y de una foto. Confirmar diseño.
- **Rendimiento:** fotos servidas en AVIF/WebP con varios tamaños y caché de un año. Encabezados de seguridad básicos en `vercel.json`.
- **Fase 2 (necesita contenido del equipo):** una página por onboarding y por ruta, preguntas frecuentes, notas o guías, fechas de actualización visibles y perfil de Google Business.

## Registro de la construcción (Onboardings, nueva sección del menú)

- **Página agregada a pedido del cliente**, no estaba en `docs/02-sitemap.md` original (ya actualizado). Menú: Inicio · Consultoría · Onboardings · Casos · Contacto.
- **Contenido de las tres rutas y sus onboardings:** reutilizado literal de `consultoria.ts` (misma fuente que `/consultoria`, `docs/04-consultoria.md`). No se duplicó el dato a mano, para que un cambio futuro se actualice en un solo lugar.
- **Texto nuevo de esta página** (bajada del hero, título de la sección de resumen, textos de los botones «Quiero empezar por…», cierre): lo escribí yo, no está en los docs. Validar redacción.
- **Resuelto (24/09):** Consultoría ya no repite el detalle de cada onboarding. Ahora Consultoría muestra las tres rutas resumidas (nombre, pregunta y solo el nombre de cada onboarding) y enlaza a «Ver el detalle de cada onboarding» → `/onboardings`. Onboardings, a su vez, enlaza a Consultoría («¿Querés entender primero cómo trabajamos?») para quien llegue directo ahí. El detalle completo (qué hace cada onboarding y su entregable) vive solo en `/onboardings`. También se sacaron de Consultoría los datos estructurados por ruta (Service/OfferCatalog), que ahora solo están en Onboardings, para que coincidan con lo que se ve en cada página.
- **CTA por ruta:** «Quiero empezar por [nombre de la ruta]» lleva a `/contacto?ruta=<ruta>` y precompleta el selector «¿Qué querés resolver?» del formulario. No hay una acción de «contratar» separada de agendar: todo el sitio tiene una sola conversión (la sesión de diagnóstico sin cargo), así que no ofrecimos una vía de compra directa.

## Registro de la construcción (Panel de administración /admin)

- **Qué es:** un panel con usuario y contraseña en `/admin` para ver los leads del formulario de Contacto. Fuera del menú, del pie, del sitemap y de `robots.txt` (no se indexa).
- **Cambio de fondo en `/api/contacto`:** ahora cada envío se guarda primero en una base de datos (fuente de verdad); el mail por Resend es un aviso, no el único registro. Si Resend falla, el lead no se pierde.
- **Base de datos:** Vercel Postgres. Falta que el equipo la agregue desde la pestaña «Storage» del proyecto en Vercel (plan gratuito) y que yo corra la migración (`node scripts/migrate.mjs`) para crear la tabla `leads`.
- **Credenciales del panel:** un solo usuario admin. Se generan con `node scripts/create-admin.mjs`, corrido en la propia terminal de quien lo configure (la contraseña no pasa por el chat ni se guarda en texto plano, solo un hash).
- **Tráfico (Google Analytics 4):** falta crear la propiedad en analytics.google.com y darme el Measurement ID (`PUBLIC_GA_ID`). El panel `/admin` no mide tráfico: eso queda en el propio Google Analytics, con un enlace directo desde el panel.
- **Eventos de GA4 ya instrumentados en el código**, se activan solos en cuanto se cargue `PUBLIC_GA_ID`: clic en cualquier botón que lleve a `/contacto` (evento `cta_agendar`, con la página y el texto del botón) y clic en «Ver el detalle» de cada ruta en Onboardings (evento `ver_detalle_ruta`).
- **Variables de entorno nuevas**, ver `.env.example`: `POSTGRES_URL` (la agrega Vercel sola), `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `PUBLIC_GA_ID`.
- **Sesión:** cookie firmada, válida 12 horas, sin base de datos de sesiones.
- **Pendiente de decidir:** si más adelante hace falta más de un usuario admin, hoy el panel soporta uno solo (alcanza para empezar).

## Registro de la construcción (calendario embebido en Contacto)

- **Qué se agregó:** un calendario de Google (Citas/Appointment Schedule) embebido con `<iframe>` en `/contacto`, arriba del formulario. Muestra disponibilidad real y agenda en el momento, sin salir de la página. El link corto (`calendar.app.google/...`) no se puede embeber (Google lo bloquea con `X-Frame-Options`); se usa la URL larga a la que redirige (`calendar.google.com/calendar/appointments/schedules/...`), que sí permite embebido. Confirmado a mano antes de publicar.
- **Excepción al «no nombrar personas»:** el widget muestra «Federico Chironi · CEO», a pedido del cliente (28/09), solo en ese recuadro. Ver nota en `06-contacto-y-nosotros.md`.
- **Duración confirmada:** 45 minutos, por Google Meet. Resuelve el pendiente que venía del brief original.
- **El formulario existente pasó a ser la alternativa** («¿Preferís que te contactemos nosotros?»), para quien prefiera dejar sus datos en vez de elegir un horario ahora. Su botón cambió de «Agendar sesión de diagnóstico» a «Enviar mis datos», para no confundirlo con la acción de agendar.
- **Si cambia el link de Google Calendar** (por ejemplo, si se rehace el evento de citas), hay que actualizar `embedUrl` en `src/content/contacto.ts` con la URL larga nueva, no la corta.
- **No probado:** el flujo real de reserva de punta a punta (elegir horario, completar nombre y mail del lado de Google, y que llegue la invitación) — eso corre en la infraestructura de Google, fuera de este sitio. Sí se confirmó que el widget carga y muestra horarios reales.

## Registro de la construcción (píldoras del hero, layout de Contacto, tamaños de empresa)

- **Píldoras eliminadas de los heros** (pedido del cliente, 28/09: «que no se vea hecho por IA»). Se sacaron de: el hero del Inicio (rótulos «Estrategia · Procesos · Tecnología») y del componente `PageHero.astro` (usado en Consultoría, Casos, Contacto, Onboardings y Nosotros). En los dos casos se reemplazó por texto plano en el mismo estilo de rótulo que ya usa el resto del sitio (mayúsculas, sin borde ni fondo). Las píldoras que no están en un hero (por ejemplo «Incluye Digital» en Onboardings, «Onboarding Mercado» en las tarjetas de Casos, «ERP en versión beta» de Vaddar) se dejaron igual, porque el pedido fue específico de los heros.
- **Layout de Contacto:** «Qué incluye la sesión» y «Otras vías de contacto» pasaron a una fila de dos columnas arriba. El calendario y el formulario (antes comprimidos en una columna angosta al lado de esa información) ahora son bloques centrados de ancho generoso, uno debajo del otro.
- **Tamaños de empresa, ya definidos** (a pedido del cliente, 28/09, por cantidad de empleados): Hasta 10 · 11 a 50 · 51 a 200 · 201 a 500 · Más de 500 empleados. El campo pasó a ser obligatorio, en el formulario y en el servidor. Reemplaza el marcador `[PENDIENTE]` que tenía el selector.

## Ajuste de layout de Contacto (28/09, segunda vuelta)

A pedido del cliente, se revirtió parcialmente el cambio anterior: el calendario volvió a estar al lado de «Qué incluye la sesión» (dos columnas, como en la versión original), y «¿Preferís que te contactemos nosotros?» con el formulario quedó en su propia sección, debajo, centrada, con fondo celeste tenue (`bg-azul/[0.06]`) para diferenciarla visualmente de la sección de arriba.

## Registro de la construcción (sección «Trabajá con nosotros» en Contacto, 29/09)

- Sección nueva al final de `/contacto`, a pedido del cliente: invita a mandar el CV para trabajar en Fedes, con un botón que abre el mail a `rrhh@fedesconsultora.com` (dirección nueva, no estaba usada en ningún otro lado del sitio).
- Texto (rótulo, título, bajada) lo escribí yo; no está en los docs originales. Validar redacción.
- No se agregó a ningún otro lugar del sitio (menú, pie, otras páginas): queda solo en Contacto, como se pidió.

## Registro de la construcción (formulario y calendario unificados, 29/09)

- **Pedido:** que el formulario y el calendario de Google no se vean como dos opciones aparte.
- **Límite técnico confirmado:** Google Calendar no permite agregar preguntas propias a su formulario de reserva, ni autocompletar nombre/mail por parámetros de URL (probado a mano, no funciona). El formulario propio y el de Google no se pueden fusionar en uno solo.
- **Solución aplicada:** un único trámite en dos pasos, en el mismo lugar de la página (al lado de «Qué incluye la sesión»), en vez de dos secciones separadas:
  1. **Paso 1:** formulario corto («Contanos sobre tu empresa»). Al enviarlo, el lead ya queda guardado en la base, igual que antes.
  2. **Paso 2:** en el mismo lugar aparece el calendario, con un mensaje «¡Gracias, {nombre}! Ahora elegí un horario para tu sesión.». Se avisa explícitamente que Google va a volver a pedir nombre y mail para poder reservar, porque no hay forma de evitarlo.
- **La sección «¿Preferís que te contactemos nosotros?» con fondo celeste se eliminó**, ya que ese formulario pasó a ser el paso 1 del trámite único, en el lugar donde antes estaba el calendario.
- **No se agregó** una salida rápida para elegir el horario sin pasar por el formulario. Si se necesita, es un agregado chico (un enlace tipo «prefiero elegir el horario directo» que muestre el paso 2 sin pasar por el paso 1).

## Registro de la construcción (formulario más corto, 29/09)

- **Se sacaron del paso 1 del formulario:** Cargo, WhatsApp y Comentarios. Quedan: Nombre y apellido, Empresa, Email, Tamaño de la empresa, ¿Qué querés resolver?
- **Base de datos:** las columnas `cargo` y `whatsapp` pasaron a ser opcionales (antes eran obligatorias). Se corrió la migración contra la base de producción (`node scripts/migrate.mjs`) antes de publicar, para no romper los envíos.
- **Panel /admin:** la columna «Cargo» muestra «—» cuando no hay dato, y el WhatsApp ya no se muestra si está vacío. Los leads anteriores a este cambio conservan sus datos de Cargo y WhatsApp (no se borró nada, solo se dejó de pedir).
- **Mail de aviso (Resend):** las filas de Cargo, WhatsApp y Comentarios solo aparecen si hay dato; no vienen bacías en el mail.
- Si más adelante hace falta re-agregar alguno de estos tres campos, la base ya está preparada (nullable): solo hay que volver a mostrar el campo en el formulario.

## Registro de la construcción (heros sin botón de agendar, 30/09)

- **Pedido del cliente:** sacar el botón «Agendar sesión de diagnóstico» de todos los heros, porque ya está en el menú principal (y en el menú móvil).
- **Heros modificados:** Inicio (queda solo «Ver casos», ahora como botón sólido en vez de contorno, porque pasó a ser el único), Consultoría y Onboardings (quedan sin botón), Nosotros (queda solo «Ver Consultoría») y la página 404 (queda solo «Volver al inicio»; se ajustó el texto para no mencionar el botón que ya no está).
- **No se tocó:** el botón del menú principal, las franjas de cierre de cada página («Empecemos por un diagnóstico») ni los botones por ruta en Onboardings, que siguen llevando a Contacto. Casos y Contacto ya no tenían botón en el hero.
- Los eventos de Google Analytics de clics a Contacto (`cta_agendar`) siguen funcionando; simplemente hay un botón menos que los dispare.

## Registro de la construcción (texto sobre el título del hero, sacado, 30/09)

- **Pedido del cliente:** sacar también el texto que había quedado en el lugar de las píldoras (por ejemplo «ESTRATEGIA · PROCESOS · TECNOLOGÍA» en Inicio, o «CONTACTO» arriba del título en las demás páginas).
- **Se sacó** el rótulo que iba pegado arriba del `<h1>` en el Inicio y en todas las páginas que usan `PageHero.astro` (Consultoría, Casos, Contacto, Onboardings, Nosotros, 404).
- **No se tocó** el rótulo chico que va debajo de la línea divisoria, al pie del hero (por ejemplo «CONTACTO» en letra pequeña) — es un elemento distinto, nunca tuvo forma de píldora, y sigue funcionando como referencia de sección.
- Los rótulos en píldora («Estrategia · Procesos · Tecnología») siguen documentados en `03-inicio.md` como parte del brief original, aunque ya no se muestran en el sitio.

## Registro de la construcción (avisos de «[PENDIENTE]» sacados de pantalla, 30/09)

- **Pedido del cliente:** sacar los textos que se veían con la etiqueta de pendiente.
- **Regla que se mantiene** (CLAUDE.md): no se inventó ningún dato para reemplazarlos. Se dejó de mostrar el aviso en pantalla; lo que falta sigue anotado acá, en este documento.
- **Consultoría**, sección «Después del onboarding»: se sacó el recuadro. El título y el texto de la sección quedan igual; sigue sin mencionar servicios concretos del plan mensual, tal como pide el doc.
- **Casos**: se sacó el recuadro de los casos «Comercio exterior y logística» y «Agromarketing y sanidad animal». Las fichas quedan con su cifra, titular y texto, sin el aviso.
- **Privacidad y Términos y Condiciones**: ya no muestran el aviso de contenido pendiente. Ahora dicen «Estamos actualizando esta página.», el mismo tono que ya usa Nosotros para su sección en construcción.
- **El componente `Pendiente.astro` se eliminó** del proyecto: no le quedó ningún uso.
- **Lo que sigue pendiente, sin cambios:** el plan mensual, el desafío y la base de cálculo del caso de comercio exterior, el dato de leads/ventas del caso Agro, y migrar el texto real de Privacidad y Términos. Todo sigue en la lista de arriba de este documento.

## Registro de la construcción (reemplazo del calendario por cal.com, pendiente de cuenta, 29/09)

- **Pedido del cliente:** cambiar el calendario de Google por uno de cal.com, integrado de la misma forma (paso 2 del trámite de Contacto), para que la persona no tenga que volver a escribir nombre, mail y empresa al elegir horario. A diferencia de Google, la página de reserva de cal.com sí acepta precompletar esos datos por parámetro de URL (`?name=...&email=...&notes=...`).
- **Bloqueado hasta que el cliente cree la cuenta en cal.com.** No lo puedo hacer yo: es un alta en un servicio externo. El sitio sigue con el calendario de Google mientras tanto (sin cambios en `src/content/contacto.ts` ni en `contacto.astro`).
- **Cuando la cuenta esté lista, necesito:**
  1. El tipo de evento configurado («Sesión de diagnóstico», 45 minutos, Google Meet) con la disponibilidad conectada.
  2. La URL pública de reserva (por ejemplo `cal.com/usuario/sesion-diagnostico`).
- **Nombre del perfil en cal.com:** preferencia del cliente (29/09) es que figure «Fedes Consultora»; si no es posible en cal.com, no hay problema en que figure «Fede Chironi» (misma excepción puntual ya aprobada para el calendario de Google, ver `06-contacto-y-nosotros.md`).
- **Al migrar:** actualizar `embedUrl` en `src/content/contacto.ts` (o pasar a construir la URL en el cliente con los datos del paso 1, si se arma el precompletado) y el texto de `calendario.body`, que hoy aclara que «Google te va a pedir tu nombre y mail de nuevo» — eso deja de ser cierto con cal.com.

## Registro de la construcción (driver de base de datos, 29/09)

- **Cambio de `@vercel/postgres` a `@neondatabase/serverless`:** el paquete de Vercel está discontinuado (Vercel pasó su Postgres a Neon). Es el mismo motor y la misma variable `POSTGRES_URL`; no cambia de proveedor ni requiere migrar datos. La conexión quedó centralizada en `src/lib/db.ts`.
- **No probado contra la base real:** no hay `.env` local con `POSTGRES_URL`. Hay que confirmar en la vista previa de Vercel que el panel lista los leads y que el formulario de Contacto los guarda.

## Registro de la construcción (base de desarrollo, 29/09)

- **Rama `desarrollo` en Neon** (proyecto de la integración de Vercel, se abre desde Vercel > Storage > Open in Neon). Creada solo con la estructura, sin los datos de producción, y sin vencimiento. El desarrollo del portal y los datos de prueba ficticios van ahí; `main` es producción.
- **`.env` local:** `POSTGRES_URL` apunta a `desarrollo`. Las demás variables de base que trajo `vercel env pull` (`DATABASE_URL`, `PGHOST`, etc.) siguen apuntando a `main`, pero el código no las usa. Volver a correr `npx vercel env pull .env` pisa el archivo y vuelve a apuntar a producción.
- **Migraciones en producción:** se aplican recién cuando cada fase esté aprobada, con `npm run db:migrate` apuntando a `main`. Antes, confirmar que la restauración a un punto anterior de Neon esté disponible.

## Registro de la construcción (portal, fase 1, paso 2: autenticación del panel, 29/09)

- **Usuarios en la base** (tabla `admins`), uno por persona. Se crean o se les cambia la contraseña con `npm run admin:crear`, corrido en la terminal de quien configure: la contraseña no pasa por el chat. Cambiar la contraseña cierra las sesiones abiertas de ese usuario.
- **Sesiones revocables:** la cookie lleva un token al azar y la base guarda solo su hash. Cierre a los 30 minutos sin uso y máximo de 12 horas. «Salir» revoca la sesión.
- **Protección:** cookie `HttpOnly`, `Secure` y `SameSite=Strict`; chequeo de origen de Astro; token CSRF en todo lo que modifica datos; límite de 5 intentos fallidos de login cada 15 minutos por IP (la IP se guarda como HMAC, no en claro); el panel responde con `Cache-Control: no-store`.
- **Corregido:** el login aceptaba cualquier destino en `?next=` (redirección abierta). Ahora solo acepta rutas del panel.
- **Mensajes nuevos del panel** («Demasiados intentos fallidos...», aviso de panel sin configurar): texto propio, no está en los docs. Validar.
- **Antes de publicar este cambio en producción:** aplicar la migración 002 en `main` y crear al menos un usuario ahí con `npm run admin:crear`; si no, el panel queda sin acceso. `SESSION_SECRET` ya existe en Vercel. `ADMIN_USER` y `ADMIN_PASSWORD_HASH` dejan de usarse y se pueden borrar de Vercel después del deploy.
- **Pendiente:** no hay pantalla para dar de baja administradores. Por ahora se hace desde la base (`activo = false`).

## Registro de la construcción (portal, fase 1, paso 3: pipeline, 29/09)

- **Un lead por persona:** `leads` pasa a ser único por email. Cada envío del formulario de Contacto se guarda aparte en `formularios`, así no se pierde ningún envío.
- **Producción tiene 3 leads con el mismo email** (parecen envíos de prueba). Al aplicar la migración 003 en `main` se fusionan en uno solo, con la fecha del primer envío y los datos del último; los 3 envíos quedan en `formularios`. Probado en `desarrollo` con datos ficticios que reproducen el caso.
- **Leads del formulario web:** entran como «Respondió», con fuente «Web» y el consentimiento registrado (texto de la casilla: «Acepto la Política de Privacidad»). Si el email ya existe, el envío se suma a ese lead: completa datos vacíos, actualiza «qué quiere resolver» y renueva el consentimiento, sin pisar lo que cargó el equipo. Si el lead estaba en «Identificado», «Contactado» o «Perdido», vuelve a «Respondió».
- **Alta manual:** entra como «Identificado». Email opcional (los contactos de LinkedIn pueden no tenerlo), pero único si se carga.
- **Registro de auditoría desde ahora** (alta, edición, cambio de estado), aunque su pantalla es de la fase 4. En la edición guarda qué campos cambiaron, no sus valores.
- **Corregido:** en `/admin`, los datos del CSV van dentro de la página y un nombre malicioso enviado desde el formulario público podía inyectar código en el panel. También se corrigió el gráfico de leads por día (mezclaba fechas UTC y locales) y su desborde en celulares.
- **Lista de países provisoria** (Argentina, países de la región, España, Estados Unidos, Otro) mientras se define el alcance geográfico. **Ciudad** queda como texto libre: la especificación pide lista controlada, pero no hay una definida.
- **Pendiente de decidir:** si un lead que pidió la baja vuelve a completar el formulario web, hoy se renueva el consentimiento pero la baja se mantiene. Definir con el abogado si el nuevo envío la levanta.
- **Quedan para la fase 3:** tablero con arrastrar y soltar, filtros completos, puntaje de encaje, edición de la lista de sectores y recordatorios de próximo paso (hoy solo se marcan como vencidos en la lista).

## Registro de la construcción (portal, fase 1, paso 4: landings y editor, 29/09)

- **Crear una landing** desde la ficha del lead («Crear landing»). Nace con la plantilla de 4 etapas de la especificación: «Resultados del diagnóstico» y «Ruta y onboardings sugeridos» se desbloquean al entregar; «Caso anónimo del sector» y «Hoja de ruta y próximos pasos», a mano. Título por defecto: «Diagnóstico de [Empresa]».
- **Editor de etapas** con los 9 tipos de bloque. El bloque de ruta se elige de las 3 rutas y 7 onboardings vigentes, y muestra la descripción y el entregable tomados de `consultoria.ts` (una sola fuente).
- **Reglas:** editar una etapa le quita la aprobación; solo se desbloquean etapas aprobadas (también lo exige la base); una etapa visible para el lead no se edita, primero hay que bloquearla; si dos personas editan la misma etapa, la segunda recibe un aviso en lugar de pisar los cambios.
- **Control antes de aprobar:** bloquea emojis, montos y precios, «agencia», «posteos» o «likes», «Empresa B» y los nombres de los combos discontinuados.
- **Link:** token de 256 bits; la base guarda su hash y una copia cifrada (AES-256-GCM). Se puede copiar, revocar y regenerar. Una landing revocada no se reactiva con el mismo link: hay que generar uno nuevo.
- **Variable de entorno nueva:** `LANDING_TOKEN_KEY` (32 bytes en base64). **Antes de publicar en producción** hay que cargarla en Vercel, distinta de la de desarrollo. Si se pierde, los links siguen funcionando pero el panel ya no puede mostrarlos.
- **Textos propios de la landing, a validar:** «Próximamente» (etapas bloqueadas), «Ruta sugerida», «Caso anónimo · [sector]», los rótulos «Situación / Camino / Resultado» del caso y «Entregable:». El pie dice «Fedes Consultora · Buenos Aires, Argentina».
- **Quedan para la fase 3:** editar la plantilla de etapas desde el panel, desbloqueo programado y vista previa integrada en el editor (hoy se abre en otra pestaña).
- **Landing de ejemplo en `desarrollo`:** «Diagnóstico de Empresa Ficticia S.A.», con contenido ficticio, para revisar el diseño.

## Registro de la construcción (portal, fase 1, paso 5: landing del lead, 29/09)

- **`/diagnostico/[token]`:** muestra el título de la landing y sus etapas. Las desbloqueadas, con su contenido; las bloqueadas, solo con título y «Próximamente». El contenido de una etapa bloqueada no sale de la base, así que no llega al HTML (verificado con textos testigo).
- **Link inexistente, vencido, revocado o de una landing en borrador:** la misma página genérica, con el mismo código (404), sin revelar el motivo.
- **Límite:** 20 links inválidos cada 10 minutos por IP; después, la IP recibe un 429 aun con un link válido. La IP se guarda como HMAC.
- **No indexable:** `X-Robots-Tag`, metaetiqueta `robots`, `Referrer-Policy: no-referrer` y `Cache-Control: private, no-store` (en el middleware y en `vercel.json`); fuera de `robots.txt` y del sitemap; sin Google Analytics, canonical ni Open Graph; título de pestaña genérico.
- **Visitas:** una por acceso; las recargas del mismo navegador dentro de 30 minutos cuentan una vez. No cuentan los administradores con sesión ni los bots de vista previa de links (WhatsApp, Slack, LinkedIn, Outlook, etc.). El editor de la landing muestra cuántas visitas hubo y la última.
- **Baja:** el pie tiene «No quiero recibir más comunicaciones», que registra la baja del lead (queda en su ficha) y muestra una confirmación.
- **Textos propios, a validar:** «Este link no está disponible.» y «Si necesitás acceder a tu diagnóstico, escribinos a info@fedesconsultora.com.» (página genérica) y la confirmación de la baja, «Registramos tu pedido: no vas a recibir más comunicaciones de Fedes Consultora.» (validar con el abogado). Están en `src/content/diagnostico.ts`.
- **Los clics en agendar y WhatsApp** todavía no se registran: quedan para el monitoreo (fase 3).

## Registro de la construcción (portal, fase 1, paso 6: cierre y verificación, 29/09)

- **Comandos nuevos:**
  - `npm test`: pruebas unitarias (52).
  - `npm run verificar:fase1`: recorre los 9 criterios de aceptación de la fase 1 contra el servidor local (`npm run dev` corriendo) y la base de desarrollo, con datos ficticios que borra al terminar. Resultado al 29/09: 43 de 43 verificaciones, los 9 criterios cumplidos.
  - `npm run db:seed-demo`: carga 6 leads ficticios (`@ejemplo.test`), uno por estado del pipeline, y una landing entregada. Se puede correr varias veces.
- **Protección de producción:** `verificar:fase1` y `db:seed-demo` solo corren si la base tiene la tabla marcadora `marca_desarrollo`, que existe únicamente en la rama `desarrollo`. Probado: contra `main` se detienen sin tocar nada. `db:migrate` y `admin:crear` no tienen esta protección, porque también se usan en producción: siempre muestran o usan la base del `.env`, revisarla antes.
- **El «©» del pie del sitio** no cuenta como emoji: el control de contenido de las landings tampoco marca ©, ® ni ™.

## Publicar la fase 1 en producción (checklist histórico de Vercel; no usar para VPS)

> Conservado como registro del despliegue anterior. Para el release actual usar exclusivamente `docs/DEPLOY_VPS.md`, `docs/OPERATIONS.md` y `docs/ROLLBACK.md`.

El procedimiento histórico era:

1. En Neon (Vercel > Storage > Open in Neon), confirmar que la restauración a un punto anterior esté disponible para `main`.
2. En Vercel > Settings > Environment Variables, cargar `LANDING_TOKEN_KEY` (`openssl rand -base64 32`), distinta de la de desarrollo. Confirmar que `SESSION_SECRET` exista.
3. Aplicar las migraciones en `main`: con `POSTGRES_URL` apuntando a producción, `npm run db:migrate`. Aplica 001 (sin cambios sobre lo existente), 002, 003 (fusiona los 3 leads con el mismo email en uno, sin perder los envíos), 004, 005 y 006 (activa la extensión `unaccent` para la búsqueda).
4. Crear los usuarios del panel en producción con `npm run admin:crear` (misma base). Sin esto nadie puede entrar al panel.
5. Volver a apuntar el `.env` local a `desarrollo`.
6. Publicar el código (deploy).
7. Prueba rápida en producción: login, envío del formulario de Contacto con un email de prueba, crear y entregar una landing de prueba, abrirla en una ventana privada, y borrarla.
8. Borrar de Vercel `ADMIN_USER` y `ADMIN_PASSWORD_HASH`, que ya no se usan.

## Registro de la construcción (fase 2: mails, 30/09)

- **Se retomó a pedido del cliente**, junto con la vista de landings. Decisiones aplicadas: copia de cada respuesta a `info@` y adjuntos guardados solo con nombre y tamaño (los archivos quedan en Resend).
- **Funciona en modo simulado** (sin clave de Resend): todo se registra y se puede revisar en el panel, pero ningún mail sale. Verificado con `npm run verificar:fase2`: 45 de 45, los 7 criterios de la fase 2 cumplidos.
- **Qué hay:** sección «Mails» en el menú (recibidos con contador de no leídos, enviados y plantillas); «Enviar mail» en la ficha del lead, con plantillas, vista previa exacta y respuesta a mails recibidos; mail automático al entregar la landing o al desbloquear una etapa (casilla por etapa); registro de consentimiento para leads cargados a mano; aperturas y clics con links propios firmados; baja desde cada mail (también la baja en un clic de Gmail y Yahoo); estados de entrega, rebotes, spam y respuestas por webhook con firma verificada.
- **Reglas:** solo a leads con email y consentimiento, sin baja y sin rebote; sin emojis ni montos; los mails automáticos solo con plantillas aprobadas (editar una plantilla le quita la aprobación). **Ningún mail real sale mientras haya textos «[PENDIENTE]»**, incluido el pie legal.
- **Chequeo de origen de formularios:** pasó de Astro al middleware con las mismas reglas, para poder aceptar la baja en un clic (llega sin cabecera `Origin`) solo en esa ruta. El resto sigue igual (verificado).
- **Los links de los mails no llevan el token de la landing**: redirigen en el momento del clic, y solo si el link de la landing no se regeneró.
- **Textos pendientes:** asunto y texto de las 3 plantillas (entrega, nueva etapa, seguimiento); pie legal de los mails (`[TEXTO LEGAL PENDIENTE]`, con el abogado); textos de la página de baja y de los botones de los mails («Ver mi diagnóstico», «Agendar reunión»), en `src/content/mails.ts`. El texto de consentimiento de los leads cargados a mano queda como `[TEXTO LEGAL PENDIENTE]`.
- **Medición de aperturas:** es aproximada (algunos programas de correo precargan o bloquean imágenes) y falta la validación del abogado y su mención en la Política de Privacidad.
- **Recordatorios automáticos:** siguen en la fase 3 (faltan plazos y topes).

### Para activar los mails reales (además de la checklist de la fase 1)

1. Crear la cuenta de Resend y verificar `fedesconsultora.com` (registros SPF, DKIM y DMARC en el DNS). Confirmar que el plan incluya recepción de mails.
2. Configurar un subdominio de recepción (por ejemplo `r.fedesconsultora.com`, registro MX que indica Resend) y cargar `MAIL_RESPUESTAS_DOMINIO`.
3. Crear el webhook en Resend hacia `https://fedesconsultora.com/api/webhooks/resend` con los eventos de entrega, rebote, spam, fallo y recepción; cargar su secreto en `RESEND_WEBHOOK_SECRET`.
4. Cargar `RESEND_API_KEY`, `MAIL_LINKS_URL=https://fedesconsultora.com` y `MAIL_COPIA_RESPUESTAS=info@fedesconsultora.com` como configuración runtime del contenedor **sólo después del smoke sin correo real**. No cargar `MAIL_PERMITIDOS` en producción estable.
5. Las migraciones 001–007 ya están aplicadas. El release VPS agrega 008; confirmar por dry-run que no aparezca ninguna otra pendiente.
6. Reemplazar el pie legal y los textos «[PENDIENTE]», y aprobar las plantillas desde el panel. Hasta entonces, nada sale.
7. Hacer primero un envío controlado con destinatario permitido antes de quitar la allowlist de prueba.

## Publicación en producción (30/09)

- **Publicado** en https://fedes-web.vercel.app (sin dominio propio todavía; el sitio sigue con `noindex`).
- **Migraciones 001 a 007 aplicadas en `main`** (las corrió el equipo). Los 3 leads de prueba con el mismo email quedaron fusionados en uno, con sus 3 envíos del formulario.
- **Variables cargadas en Vercel (Production):** `LANDING_TOKEN_KEY` (nueva, distinta de la de desarrollo) y `MAIL_LINKS_URL=https://fedes-web.vercel.app`. `SESSION_SECRET` ya existía.
- **Mails en modo simulado** en producción (no hay clave de Resend): ver «Para activar los mails reales».
- **Falta:** crear los usuarios del panel en producción (`npm run admin:crear` apuntando a `main`); después, borrar de Vercel `ADMIN_USER` y `ADMIN_PASSWORD_HASH`, que ya no se usan. Las variables de Preview siguen apuntando a `main` (la misma base que producción).

## Portal de leads (decisiones abiertas de `09-portal-leads.md`, actualizado 29/09)

Resuelto: stack actual Astro Node standalone en Docker detrás del Nginx central, Neon Postgres y Resend externos; remitente previsto `info@fedesconsultora.com`; todos los leads en el panel, landing después de la sesión, mails manuales/por etapa, respuestas en el panel, medición de aperturas y clics, y agenda con Google Calendar hasta migrar a cal.com.

Sigue abierto:

- **Administradores:** quiénes tienen acceso al panel.
- **Puntaje de encaje:** pesos de cada criterio y alcance geográfico.
- **Legales:** retención de datos, textos legales de la landing y de los mails, recordatorios automáticos y medición de aperturas. Todo con validación de un abogado. Mientras tanto, `[TEXTO LEGAL PENDIENTE]`.
- **Volumen del piloto:** cuántas sesiones de diagnóstico por semana puede sostener Federico.
- **Plantilla de etapas:** contenido definitivo y plazos de desbloqueo de las etapas 3 y 4.
- **Plantillas de mail:** textos de entrega, nueva etapa, seguimiento y recordatorios.
- **Recordatorios automáticos:** plazos, tope por lead y separación mínima. Plazo del aviso de leads sin actividad.
- **DNS de `fedesconsultora.com`:** acceso para verificar el envío en Resend y configurar el subdominio de recepción de respuestas. Definir si se reenvía una copia a `info@`.
- **Adjuntos de las respuestas:** guardarlos o solo listarlos.
- **Modo oscuro** de la landing (el sitio público no lo tiene).
- **cal.com:** al migrar, usar un webhook para que la reserva pase el lead a «Agendó» con la fecha de la sesión.

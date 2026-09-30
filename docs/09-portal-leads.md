# Especificación — Portal de leads de Fedes Consultora

> **Versión:** 0.2 (29/09). Actualizada con el flujo definido por el cliente: todos los leads pasan por el panel, la landing se entrega después de la sesión y los mails se envían desde el panel (a mano, automáticos al desbloquear una etapa y recordatorios automáticos).
> **Estado:** pendiente de aprobación. Las decisiones marcadas con ⚠️ PENDIENTE no se implementan hasta resolverse.
> **Lectura previa:** `CLAUDE.md` (reglas de marca, tono y contenido).

---

## 1. Objetivo

Construir dentro de la web de Fedes:

1. Un **panel de administración** donde se gestionan **todos** los leads, tanto los que contacta el equipo como los que llegan por el formulario de la web, desde el primer contacto hasta que se convierten en clientes.
2. Una **landing privada por prospecto** ("Diagnóstico de [Empresa]") que se entrega **después de la sesión de diagnóstico sin cargo**. Muestra los resultados del diagnóstico, la ruta y los onboardings sugeridos y cualquier otra información relevante para ese cliente. Su contenido se **desbloquea por etapas**, para sostener el interés del lead a lo largo del proceso comercial.
3. **Mails desde el panel**: individuales en cualquier momento, automáticos al desbloquear una etapa y recordatorios automáticos de seguimiento. Las respuestas de los leads se ven en el panel.

**Meta comercial:** que cada lead reciba valor concreto después de su sesión, que ningún lead se pierda por falta de seguimiento y que Fedes tenga datos propios del embudo (contactados, respuestas, sesiones, propuestas, cierres).

**Fuera de la meta:** envíos masivos, mails en frío a personas que no dieron su consentimiento, scraping de LinkedIn o automatización de mensajes en LinkedIn. El contacto inicial por LinkedIn es manual, desde el perfil de Federico.

## 2. Flujo del lead

1. **Entrada**, por una de dos vías:
   - **Contacto propio** (LinkedIn, recomendación, evento, otro): el administrador carga el lead a mano o por CSV. Estado inicial: *Identificado*.
   - **Formulario de Contacto de la web**: el lead entra solo al pipeline con fuente «web», estado *Respondió* y el consentimiento registrado (acepta la Política de Privacidad al enviar). Si ya existe un lead con ese email, se suma al existente en lugar de duplicarse.
2. **Seguimiento hasta la sesión:** mails individuales, recordatorios automáticos, notas y próximos pasos.
3. **Sesión agendada:** con el calendario actual de Google, el administrador carga la fecha y hora de la sesión y pasa el lead a *Agendó*. Cuando se migre a cal.com, un webhook puede hacerlo solo (ver `08-pendientes.md`).
4. **Sesión realizada:** el lead pasa a *Sesión realizada*.
5. **Armado de la landing:** el equipo carga los resultados, la ruta y los onboardings sugeridos y el resto del contenido. Federico Chironi revisa y aprueba.
6. **Entrega:** al activar la landing se desbloquean las primeras etapas y se envía automáticamente el mail con el link.
7. **Seguimiento posterior:** se desbloquean las etapas siguientes (cada una con su mail), se registran visitas, aperturas, clics y respuestas, y corren los recordatorios automáticos hasta *Propuesta*, *Onboarding* (cliente) o *Perdido*.

## 3. Usuarios y roles

| Rol | Quién | Acceso |
|---|---|---|
| **Administrador** | Federico Chironi y el equipo comercial que se designe (⚠️ PENDIENTE: quiénes) | Panel completo, detrás de login |
| **Lead** | Prospecto que realizó la sesión de diagnóstico | Solo su landing, mediante un link privado. Sin cuenta ni contraseña |

Un solo rol de administrador alcanza para la primera versión. Cada administrador tiene su propio usuario, para que el historial y la auditoría registren quién hizo cada acción.

## 4. Modelo de datos

Los nombres son orientativos: adaptarlos al stack y a las convenciones del repo.

### 4.1 `leads`
| Campo | Detalle |
|---|---|
| nombre y apellido, cargo | Texto. Nombre y apellido en un solo campo, igual que el formulario web (decidido 29/09) |
| empresa, sitio web | Texto |
| país, ciudad | Listas controladas |
| tamaño | **Rango normalizado**, el mismo del formulario web (decidido 29/09): 1-10, 11-50, 51-200, 201-500, más de 500, desconocido |
| sector | **Lista controlada** (ver 4.6), un solo idioma |
| linkedin_url, email, teléfono | Opcionales |
| fuente | Lista: LinkedIn (búsqueda propia), recomendación, contenido entrante, web, evento, otro |
| qué quiere resolver | Lo que eligió en el formulario web, si llegó por ahí |
| estado | Ver 4.7 |
| fecha_sesion | Fecha y hora de la sesión de diagnóstico |
| puntaje_encaje | 0 a 100, calculado (ver 4.8), con los criterios que lo componen |
| notas | Texto libre |
| proximo_paso, fecha_proximo_paso | Con recordatorio en el panel |
| consentimiento | Fecha, origen y texto vigente al momento de registrarlo |
| baja | Fecha, si el lead pidió no ser contactado |
| recordatorios_pausados | Boolean. Permite frenar los recordatorios automáticos de un lead |
| creado, actualizado | Marcas de tiempo |

### 4.2 `landings`
| Campo | Detalle |
|---|---|
| lead_id | Relación con `leads` (1 lead puede tener más de una landing en el futuro) |
| titulo | Por defecto "Diagnóstico de [Empresa]" |
| token | Aleatorio, criptográficamente seguro, de al menos 128 bits. La búsqueda se hace **solo por su hash**. Además se guarda una **copia cifrada** (AES-256-GCM, clave en variable de entorno) para que el panel pueda volver a mostrar el link y los mails automáticos puedan armarlo (decidido 29/09). El token nunca se guarda en claro |
| estado | borrador, activa, vencida, revocada |
| entregada_el | Marca de tiempo de la activación. Se usa para los desbloqueos programados |
| vence_el | Opcional |

### 4.3 `etapas`
| Campo | Detalle |
|---|---|
| landing_id, orden | Posición dentro de la landing |
| titulo | Texto |
| contenido | Lista de **bloques** (ver 4.4) |
| estado | bloqueada, desbloqueada |
| modo_desbloqueo | al entregar, manual, o programado (desplazamiento relativo a `entregada_el`, por ejemplo "3 días después") |
| desbloqueada_el | Marca de tiempo |
| aprobada | Boolean. **Una etapa no puede desbloquearse si no está aprobada** |
| enviar_mail | Boolean, activado por defecto. Si está activo, al desbloquearse la etapa se envía automáticamente el mail al lead (ver 7.2) |

### 4.4 Bloques de contenido
Tipos mínimos: título, párrafo, lista, destacado (callout), tabla simple, caso anónimo (sector, situación, camino, resultado), ruta y onboardings sugeridos (elegidos de las 3 rutas y 7 onboardings vigentes, con el porqué), llamado a la acción (botón a agendar o a WhatsApp) y separador. Guardar el contenido como datos estructurados, no como HTML libre, para que el diseño sea consistente y no haya riesgo de inyección.

### 4.5 `admins`
Usuario, hash de la contraseña, nombre, activo, último acceso. Las sesiones del panel se guardan en la base para poder revocarlas.

### 4.6 Sectores
Lista controlada, editable por el administrador. Valores iniciales sugeridos, alineados con los casos y con los leads relevados: sanidad animal y veterinaria, distribución mayorista, laboratorios y farma, alimentos y bebidas, industria y manufactura, retail, salud, energía, comercio exterior y logística, otros.

### 4.7 Estados del pipeline
Identificado → Contactado → Respondió → Agendó → Sesión realizada → Propuesta → Onboarding → Perdido.
Cada cambio de estado se registra con fecha y usuario. "Perdido" pide un motivo (lista corta: sin presupuesto, sin necesidad, eligió otra opción, sin respuesta, no es el perfil, otro).

### 4.8 Puntaje de encaje
Configurable desde una sola pieza de código o de ajustes, para cambiar los pesos sin tocar la lógica. Criterios propuestos (⚠️ PENDIENTE: pesos, a definir con Federico):
- Cargo con poder de decisión (CEO, dueño, gerente general, presidente).
- Tamaño de empresa entre 51 y 500 empleados.
- País: Argentina (⚠️ PENDIENTE: si se suman otros).
- Sector con casos o afín.
- Señales de crecimiento sin estructura (carga manual con casillas, por ejemplo: web desactualizada, redes inconsistentes, expansión reciente).

### 4.9 `eventos`
Registro de actividad del lead: `lead_id`, `landing_id` y `etapa_id` (si aplican), `envio_id` (si viene de un mail), tipo (visita, apertura de etapa, clic en agendar, clic en WhatsApp, descarga, apertura de mail, clic en mail), marca de tiempo y duración aproximada. **No guardar la IP en claro ni usar trackers de terceros.**

### 4.10 `envios`
Registro de cada mail enviado desde el sistema: lead, tipo (manual, automático por etapa, recordatorio), plantilla, asunto, cuerpo enviado, usuario que lo envió (si fue manual), marca de tiempo, identificador del proveedor, estado de entrega (enviado, entregado, rebotado, marcado como spam), primera apertura y primer clic.

### 4.11 `mensajes_recibidos`
Respuestas de los leads: lead, `envio_id` al que responde (si se puede asociar), remitente, asunto, cuerpo en texto, adjuntos (nombre y tamaño; ver 7.5), marca de tiempo, leído (sí o no).

### 4.12 `plantillas_mail` y `reglas_recordatorio`
Plantillas editables (ver 7.3) y reglas de los recordatorios automáticos (ver 7.4).

## 5. Portal del lead

- **URL:** `/diagnostico/[token]`. Si el token no existe, venció o fue revocado, mostrar una página genérica sin revelar cuál fue el motivo.
- **No indexable:** `noindex` en metaetiqueta y encabezado, exclusión en `robots.txt`, sin aparecer en el sitemap y con `Referrer-Policy: no-referrer`.
- **Sin login.** El link es la credencial: tratarlo como un secreto. Limitar la tasa de intentos por IP para frenar adivinación.
- **Título de la pestaña genérico** («Tu diagnóstico | Fedes Consultora»), sin el nombre de la empresa, y sin Open Graph: las vistas previas de links en WhatsApp o mail no deben mostrar datos del prospecto (decidido 29/09). Los accesos de esos bots de vista previa y de administradores con sesión no se cuentan como visitas.
- **Contenido:** solo las etapas desbloqueadas. Las bloqueadas se muestran como próximas piezas, con título y estado, pero **sin contenido en el HTML enviado al navegador**.
- **Diseño:** identidad visual de Fedes (ver `CLAUDE.md`), responsive y coherente con el sitio. Sin emojis. ⚠️ PENDIENTE: modo oscuro (el sitio público hoy no lo tiene).
- **Llamados a la acción:** agendar la reunión de propuesta y contacto por WhatsApp (+54 9 221 309-2529, confirmado vigente). Mientras no esté cal.com, el botón de agendar usa **el mismo link de Google Calendar que hoy usa `/contacto`** (configurado en un solo lugar).
- **Pie:** enlaces a Política de Privacidad y a Términos y Condiciones del sitio, y una opción clara de "No quiero recibir más comunicaciones" que registra la baja.

### Etapas previstas (plantilla inicial)
La landing se entrega después de la sesión. Lo primero que ve el lead son los resultados y la ruta sugerida:

1. **Resultados del diagnóstico:** lo conversado en la sesión y las prioridades. Se desbloquea al entregar.
2. **Ruta y onboardings sugeridos:** cuál de las tres rutas y qué onboardings, con el porqué. **Sin precios.** Se desbloquea al entregar.
3. **Caso anónimo del sector:** prueba social, siempre anónima. Desbloqueo manual o programado.
4. **Hoja de ruta y próximos pasos:** llamado a agendar la reunión de propuesta. Desbloqueo manual o programado.

Cada landing se crea desde esta plantilla y se edita a medida: se pueden sumar etapas con otra información relevante para ese cliente. La plantilla es editable por el administrador. ⚠️ PENDIENTE: plazos por defecto de las etapas 3 y 4.

## 6. Panel de administración

Ruta `/admin`, detrás de login. Sesiones seguras guardadas en la base (revocables), protección CSRF, límite de intentos de login y cierre de sesión por inactividad a los 30 minutos, con un máximo de 12 horas (decidido 29/09).

### 6.1 Pipeline de leads
- Vista **tablero** (columnas por estado, arrastrar y soltar) y vista **lista** (filtros por estado, sector, país, tamaño, fuente y puntaje; orden y búsqueda).
- Crear y editar leads a mano.
- Ficha del lead con todos los campos, **línea de tiempo** (cambios de estado, mails enviados y recibidos, aperturas, clics, visitas a la landing y notas), próximos pasos y sus landings.
- Recordatorios de "próximo paso" vencidos y respuestas sin leer, visibles al abrir el panel.
- Aviso de leads sin actividad hace más de X días (⚠️ PENDIENTE: plazo).
- Importación por **CSV** con vista previa, que:
  - normaliza tamaño y sector a las listas controladas;
  - detecta duplicados por email y por dominio;
  - marca los datos incompletos o contradictorios, sin descartarlos;
  - exige indicar la fuente y el estado del consentimiento del lote.

### 6.2 Gestión de landings
- Crear una landing desde un lead, con la plantilla de etapas.
- Editor de etapas con vista previa idéntica a la del lead.
- Aprobar una etapa, y desbloquear o bloquear con un clic (manual) o programar el desbloqueo.
- Activar (entregar) la landing: desbloquea las etapas marcadas "al entregar" y dispara su mail.
- Copiar el link, revocarlo, regenerar el token y fijar vencimiento.

### 6.3 Mails
- **Bandeja** de respuestas recibidas, con indicador de no leídas, y respuestas visibles también en la ficha de cada lead.
- Redactar y enviar un mail individual desde la ficha del lead o respondiendo a un mensaje recibido.
- Editar las plantillas y las reglas de recordatorio.
- Ver el historial de envíos con su estado de entrega, aperturas y clics.

### 6.4 Monitoreo
- **Por landing:** visitas, etapas abiertas, tiempo aproximado, clics en agendar o WhatsApp, última actividad.
- **Por lead:** mails enviados, abiertos, con clic y respondidos.
- **Alertas internas:** cuando un lead vuelve a entrar a la landing, abre la ruta sugerida, hace clic en agendar o responde un mail (se ven en el panel y, opcionalmente, por mail a los administradores).
- **Embudo global:** cantidad por estado, tasa de paso entre estados y conversión por fuente y por sector. Exportable a CSV.

### 6.5 Datos y cumplimiento
- Exportar los datos de un lead.
- **Borrar un lead y todo lo asociado** (landings, etapas, eventos, envíos y mensajes recibidos), con confirmación.
- Registrar consentimientos y bajas, y **excluir automáticamente** a los leads dados de baja de cualquier envío, manual o automático.
- Registro de auditoría de acciones sensibles (crear, aprobar, desbloquear, entregar, revocar, enviar, borrar, exportar).

## 7. Mails

### 7.1 Reglas generales
- **Remitente:** `Fedes Consultora <info@fedesconsultora.com>`. Hay que verificar el dominio en el proveedor de envío.
- Tono corporativo del sitio, voseo, sin emojis y sin precios. Antes de enviar, el sistema bloquea el envío si detecta emojis o montos.
- Cada mail lleva el enlace de baja. Un lead dado de baja o con un rebote permanente no recibe más mails.
- Solo se envían mails a leads con base legal registrada: los que llegaron por el formulario web (aceptaron la Política de Privacidad) o los que dieron su email y su consentimiento en el contacto (queda registrado cuándo y cómo). Nunca a leads cargados desde LinkedIn que no hayan dado su email.
- El texto legal y de baja **no se inventa**: dejar marcadores `[TEXTO LEGAL PENDIENTE]` hasta que se valide.
- Proveedor: **Resend**, que ya usa el sitio para el formulario de Contacto.

### 7.2 Tipos de envío
1. **Manual:** un administrador redacta o parte de una plantilla, ve la vista previa y envía a un lead. En cualquier momento.
2. **Automático al desbloquear una etapa:** al desbloquearse una etapa con `enviar_mail` activo (al entregar, a mano o programada), se envía un mail con el enlace a la landing. Si se desbloquean varias etapas juntas, sale un solo mail. El contenido de la etapa ya fue aprobado; la plantilla del mail también.
3. **Recordatorio automático:** según las reglas de 7.4.

### 7.3 Plantillas
Editables desde el panel, con variables del lead (nombre, empresa, link a la landing, link para agendar). Plantillas iniciales: entrega de la landing, nueva etapa disponible, seguimiento, recordatorio para agendar la sesión, recordatorio para agendar la propuesta. Los textos los redacta y aprueba el equipo (⚠️ PENDIENTE).

### 7.4 Recordatorios automáticos
- Uno a uno, con plantillas aprobadas por el equipo. No son envíos masivos ni secuencias en frío.
- Reglas iniciales propuestas (⚠️ PENDIENTE: plazos y cantidad máxima por lead):
  - Lead del formulario web que no agendó la sesión después de X días.
  - Landing entregada que el lead no abrió después de X días.
  - Lead que vio la ruta sugerida pero no agendó la reunión de propuesta después de X días.
- Un recordatorio **no se envía** si el lead respondió, se dio de baja, tuvo un rebote, pasó a *Propuesta*, *Onboarding* o *Perdido*, o tiene los recordatorios pausados.
- Tope de recordatorios por lead y separación mínima entre dos mails automáticos.
- Se ejecutan con una tarea programada del lado del servidor.

### 7.5 Respuestas en el panel
- Las respuestas de los leads se reciben en el panel para que no se pierdan en una casilla personal.
- Implementación propuesta: los mails salen de `info@fedesconsultora.com` con una dirección de respuesta (Reply-To) en un subdominio de recepción (por ejemplo `respuestas@` en un subdominio de `fedesconsultora.com`) que recibe el proveedor y reenvía al panel por webhook. Así no se toca la casilla actual de `info@`. ⚠️ PENDIENTE: acceso al DNS del dominio y si además se reenvía una copia a `info@`.
- Cada respuesta se asocia al lead por el mail al que responde o por el remitente, marca al lead como "respondió", frena sus recordatorios y genera una alerta.
- Adjuntos: ⚠️ PENDIENTE (guardarlos o solo listarlos).

### 7.6 Aperturas y clics
- **Clics:** los enlaces del mail apuntan al propio sitio con un identificador del envío, que registra el clic y redirige. **No se usa el seguimiento de clics del proveedor**, porque reescribiría el link de la landing y el token pasaría por un servidor de terceros.
- **Aperturas:** imagen de seguimiento servida desde el propio sitio. Es un dato aproximado: algunos clientes de mail (por ejemplo Apple Mail) precargan las imágenes y marcan aperturas que no ocurrieron, y otros las bloquean.
- ⚠️ PENDIENTE: validación del abogado sobre la medición de aperturas y su mención en la Política de Privacidad.

## 8. Privacidad y seguridad

- Ley 25.326 (Argentina): registrar base legal y consentimiento, permitir acceso, rectificación y supresión. ⚠️ PENDIENTE: validación con un abogado, incluida la eventual inscripción de la base de datos, los recordatorios automáticos y la medición de aperturas.
- Todos los datos en tránsito por HTTPS. Secretos en variables de entorno, nunca en el repo.
- Tokens de landing: buscar por hash y comparar en tiempo constante. La copia cifrada solo se descifra del lado del servidor, para mostrar el link en el panel o armar un mail.
- El contenido de las landings y los mails recibidos pueden describir la situación de una empresa: tratarlos como confidenciales. Nada de analítica de terceros en `/diagnostico/*` y `/admin/*`.
- Webhooks del proveedor de mails (entrega, rebotes, respuestas) verificados con firma.
- Retención de datos: ⚠️ PENDIENTE (definir por cuánto tiempo se conserva un lead sin actividad).
- Las claves de cualquier API externa se usan solo del lado del servidor.

## 9. Fases y criterios de aceptación

### Fase 1 — Pipeline y landing mínima
- Un administrador inicia sesión (usuarios en la base, cierre por inactividad, CSRF).
- Los envíos del formulario de Contacto entran al pipeline como leads con fuente «web», sin duplicar por email. Los leads existentes se migran.
- Crea y edita un lead a mano y cambia su estado, con historial.
- Crea una landing desde la plantilla, edita y aprueba etapas.
- Activa la landing, desbloquea etapas manualmente y copia el link (el envío por mail llega en la fase 2).
- El lead abre el link y ve solo las etapas desbloqueadas, empezando por los resultados y la ruta sugerida.
- El HTML de una etapa bloqueada **no contiene su contenido**.
- Un token inválido, vencido o revocado muestra la página genérica.
- La landing no es indexable (verificable en encabezados y metaetiquetas).
- Se registra una visita por acceso.
- Sin precios y sin emojis en ninguna pantalla ni plantilla.

### Fase 2 — Mails
- Dominio verificado y envío desde `info@fedesconsultora.com`.
- Envío manual con plantillas, vista previa y bloqueo de emojis y montos.
- Mail automático al desbloquear una etapa.
- Enlace de baja funcionando y exclusión automática de los dados de baja.
- Registro de consentimiento.
- Estados de entrega por webhook, aperturas y clics propios.
- Respuestas recibidas en el panel y asociadas al lead.

### Fase 3 — Seguimiento
- Pipeline en tablero y lista con filtros, línea de tiempo y recordatorios de próximo paso.
- Recordatorios automáticos por mail con sus reglas y topes.
- Desbloqueo programado de etapas.
- Alertas internas.
- Importación por CSV con normalización, duplicados y avisos de datos incompletos.

### Fase 4 — Monitoreo y cumplimiento
- Métricas por landing y por lead, y embudo global con exportación a CSV.
- Borrado y exportación de un lead.
- Registro de auditoría.

### Fase 5 — Asistencia con Claude (opcional)
- Botón "generar borrador" que arma, del lado del servidor, un borrador de los resultados o de un mail a partir de la ficha del lead y de las notas de la sesión que el administrador aporte.
- Las reglas de `CLAUDE.md` se incluyen como instrucciones fijas.
- **Ningún borrador se publica ni se envía sin aprobación humana explícita.**
- Registrar qué se generó, con qué entrada y quién lo aprobó.

## 10. Fuera de alcance (por ahora)
- Scraping o automatización sobre LinkedIn.
- Envíos masivos y mails a personas sin consentimiento registrado.
- Integraciones con CRM externos.
- Pasarelas de pago o publicación de precios.
- Cuentas de lead con usuario y contraseña.
- Generación de contenido sin revisión humana.

## 11. Decisiones

### Resueltas (29/09)
- **Stack:** el actual (Astro en Vercel, Postgres, Resend).
- **Proveedor de mails:** Resend. Remitente `info@fedesconsultora.com`.
- **Leads:** todos se gestionan en el panel, incluidos los del formulario web.
- **Entrega de la landing:** solo después de la sesión de diagnóstico. Lo primero que se ve son los resultados y la ruta sugerida; el resto se desbloquea por etapas.
- **Mails:** manuales en cualquier momento, automáticos al desbloquear una etapa y recordatorios automáticos.
- **Respuestas:** se ven en el panel.
- **Medición:** aperturas y clics de los mails.
- **Agenda:** el mismo link de Google Calendar de `/contacto`, hasta migrar a cal.com.

### Abiertas
1. Quiénes serán administradores.
2. Pesos del puntaje de encaje y alcance geográfico (Argentina, y si se suma Chile u otros).
3. Si las landings privadas pueden mencionar precios en el futuro. Por ahora, no.
4. Política de retención de datos y textos legales, con validación de un abogado (incluye recordatorios automáticos y medición de aperturas).
5. Cuántas sesiones de diagnóstico por semana puede sostener Federico (define el volumen del piloto).
6. Color de acento y tipografías con licencia (se usa una alternativa configurable mientras tanto).
7. Plantilla definitiva de etapas, plazos de desbloqueo y contenido de cada una.
8. Textos de las plantillas de mail.
9. Plazos, cantidad máxima y separación de los recordatorios automáticos, y plazo del aviso de leads sin actividad.
10. Acceso al DNS de `fedesconsultora.com` para verificar el envío y configurar la recepción de respuestas, y si se reenvía una copia a `info@`.
11. Adjuntos de las respuestas: guardarlos o solo listarlos.
12. Modo oscuro de la landing.

## 12. Cómo empezar (instrucción para Claude Code)
1. Leé `CLAUDE.md` y este documento completos.
2. Explorá el repo y respondé, sin escribir código: cuál es el stack, si hay backend y base de datos, cómo es el deploy y qué se puede reutilizar (autenticación, componentes, estilos).
3. Proponé un plan técnico para la **Fase 1**, con archivos a crear o modificar, riesgos y decisiones que necesiten aprobación.
4. Esperá la aprobación antes de implementar. Al terminar cada fase, verificá los criterios de aceptación y reportá qué quedó cumplido y qué no.

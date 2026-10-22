# 10 · Landing para el campo (`/campo`)

Landing de campaña para quienes escanean el QR de los avisos en las revistas **La Rural** y **Angus**. Una sola página, mobile first, que adapta seis textos según la revista de origen. La conversión es una: agendar una **primera reunión** sin cargo (Google Calendar o WhatsApp). No lleva formulario.

- **Fuente:** brief técnico «Landing Fedes para el campo · Brief técnico para Claude Code» (21/10/2026) y su HTML de referencia (`landing-campo/index.html`). Si difieren, manda el HTML.
- **Textos:** literales del HTML de referencia, en `src/content/campo.ts`. Este documento resume la estructura; los textos de cada origen están en el objeto `ORIGENES`.
- **Fuera del menú y del sitemap.** No compite con la home.

## Excepciones de campaña (aprobadas el 21/10/2026)

Esta landing no sigue algunas reglas generales de `CLAUDE.md`, por decisión explícita del equipo:

| Regla general | En `/campo` |
|---|---|
| La conversión se llama «sesión de diagnóstico» | Se llama «primera reunión» o «tomemos unos mates». Nunca «diagnóstico». |
| Tono corporativo, sin coloquialismos | Tono humano, de par a par, con voseo («Tomemos unos mates»). |
| Colores `#44718D`, `#71A0C0`, `#1D1D1B` y blanco | Se suman `#14303D` (navy, fondo principal), `#F3F1EC` (fondo claro), `#D3E1EA`, `#4A4A48` y `#E2DED5` (textos secundarios y bordes). |
| Logo blanco solo sobre negro o `#44718D` | Logo blanco sobre navy `#14303D` en el hero. En el pie va sobre negro. |
| Tipografías provisorias del sitio (Inter / Source Serif) | Hanken Grotesk (400 a 900), alojada en el propio servidor (`@fontsource/hanken-grotesk`), en reemplazo de Söhne. |

Siguen vigentes todas las demás: sin precios, sin nombres del equipo («consultores de Fedes»), casos anónimos, ejecución con equipo propio, sin emojis.

## URL, QR y origen

| Ruta | Tipo | Destino |
|---|---|---|
| `/campo` | Página (render en servidor) | Versión general si no hay `utm_source` |
| `/r/larural` | Redirección 302, sin caché | `/campo?utm_source=larural&utm_medium=revista&utm_campaign=agro-2026` |
| `/r/angus` | Redirección 302, sin caché | `/campo?utm_source=angus&utm_medium=revista&utm_campaign=agro-2026` |

- Los QR impresos codifican `https://fedesconsultora.com/r/larural` y `https://fedesconsultora.com/r/angus`. Se generan recién con las redirecciones publicadas y probadas.
- La página elige los textos en el servidor según `utm_source` (`larural`, `angus`; cualquier otro valor o ninguno = general). Llega correcta desde el primer render, sin parpadeo y sin depender de JavaScript.
- Las redirecciones están en `src/pages/r/[origen].ts` y no en `redirects` de `astro.config.mjs`: con el adaptador de Node, esas salen como 301 aunque se pida 302.
- Para sumar otra revista o canal: una entrada en `ORIGENES` y otra en `REDIRECCIONES` (`src/content/campo.ts`).

## Estructura

1. Hero: logo, píldora «CONSULTORÍA PARA EL AGRO», etiqueta de origen (no en la general), H1, bajada según origen, botones Agendar y WhatsApp, «PRIMERA REUNIÓN SIN CARGO».
2. Cinta celeste en loop, según origen (decorativa, `aria-hidden`).
3. ¿Te suena?: «El problema no es el trabajo. Es la estructura.» y tres tarjetas.
4. Qué ordenamos: H2 y tres tarjetas con ícono, según origen.
5. Así es la primera reunión: tres pasos y botón al calendario.
6. Por qué Fedes: +5 años, 60 días de onboarding y el caso anónimo de distribución veterinaria mayorista (el mismo de `05-casos.md`, aprobado para publicar de forma anónima).
7. Preguntas frecuentes (acordeón con `<details>`).
8. Cierre: «Tomemos unos mates y lo charlamos.», botones y filas de contacto (Llamar, Escribir, Seguir).
9. Pie: logo, Privacidad, Términos y «© 2026 Fedes Consultora». En celular, barra fija inferior con Agendar y WhatsApp (aparece después de 520 px de scroll).

## Conversión

| Acción | Link | Dónde |
|---|---|---|
| Agendar | Página de reservas de Google Calendar (`CALENDAR_URL`, sin el segmento `/u/0/`) | Hero, pasos, cierre y barra |
| WhatsApp | `https://wa.me/5492213092529?text=<mensaje según origen>` | Hero, cierre y barra |
| Llamar | `tel:+5492213092529` | Cierre |
| Escribir | `mailto:info@fedesconsultora.com` | Cierre |
| Seguir | `https://www.instagram.com/fedesconsultora` | Cierre |

## Medición (GA4)

Usa el mismo GA4 del sitio (`PUBLIC_GA_ID`). Sin ese ID no se carga gtag y no se envía nada. Un único listener lee `data-cta` y `data-pos` de cada link y envía:

| Evento | Se dispara al tocar | Parámetros |
|---|---|---|
| `click_agendar` | Cualquier botón de agendar | `origen`, `ubicacion` (hero, pasos, cierre, barra), `link_url` |
| `click_whatsapp` | Cualquier botón de WhatsApp | ídem |
| `click_telefono` | Fila Llamar | ídem |
| `click_email` | Fila Escribir | ídem |
| `click_instagram` | Fila Seguir | ídem |

En GA4 conviene marcar `click_agendar` y `click_whatsapp` como eventos clave y registrar `origen` y `ubicacion` como dimensiones personalizadas. La reserva concretada ocurre dentro de Google Calendar y se cruza a mano con el CRM.

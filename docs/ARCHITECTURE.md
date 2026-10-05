# Arquitectura de V3

## Producción

```text
Internet
  → Nginx compartido (TLS, host apex, límites, headers)
  → Docker network externa fedes-net
  → fedesconsultora-web:4321 (imagen GHCR inmutable, Astro 7 / Node standalone)
  → Neon PostgreSQL + Resend
```

La app se instala bajo `/srv/fedesconsultora`; el proxy central está bajo `/srv/proxy`. El servicio sólo declara `expose: 4321`, no `ports`. No crea otro proxy ni instala Certbot. Neon conserva la base y los datos actuales; no se agrega PostgreSQL local ni Redis.

Astro prerenderiza las páginas públicas por defecto. Las rutas dinámicas del portal, APIs, landings privadas y tracking siguen marcadas `prerender = false`. Se ejecuta `node ./dist/server/entry.mjs` con `HOST=0.0.0.0` y `PORT=4321`. `session: false` desactiva el almacenamiento de sesiones de Astro; la autenticación propia conserva sesiones revocables en PostgreSQL.

## Variables y artefactos

- Build-time público: `PUBLIC_SITE_URL`, `PUBLIC_INDEXABLE`, `PUBLIC_GA_ID` y `PUBLIC_BUILD_ID`. Se incorporan a páginas o código público cuando corresponde. La indexación se mantiene desactivada (`PUBLIC_INDEXABLE=false`) hasta una decisión explícita.
- Runtime de servidor: `POSTGRES_URL`, `SESSION_SECRET`, `LANDING_TOKEN_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `CONTACT_TO`, `CONTACT_FROM` y `MAIL_*`. Los módulos de servidor usan `getSecret` de `astro:env/server`; se inyectan al iniciar el contenedor.
- Los scripts de migración y alta de admin usan el entorno de proceso en comandos one-shot. Ninguna clave de producción entra en `docker build`, el lockfile, la imagen o el repositorio.
- Un cambio de variables `PUBLIC_*` requiere reconstruir el artefacto. Los secretos runtime se cambian sin reconstruir.
- CI ejecuta el gate hermético y Docker smoke antes de publicar `ghcr.io/fedesconsultora/fedesconsultora-landingv3:sha-<SHA>`. Producción fija `IMAGE_REF` al digest OCI del workflow. El Compose de producción no tiene bloque `build`; `docker-compose.build.yml` sólo habilita builds locales.
- El workflow de integración se dispara manualmente, exige `DATABASE_ENV=ci` y la marca persistente `marca_ci` con el ID exacto de la rama Neon exclusiva. Para probar efectos del webhook, usa un servidor Resend falso en loopback con clave sintética; la app rechaza endpoints de mock no locales.

## Frontera del proxy

Sólo Nginx es público. Compose conecta el contenedor a `fedes-net`; Nginx pasa el tráfico por el nombre `fedesconsultora-web:4321`. Nginx fija `Host` y `X-Forwarded-Host` a `fedesconsultora.com`, `X-Forwarded-Proto` a `https`, `X-Forwarded-Port` a `443` y sobrescribe `X-Forwarded-For` con `$remote_addr`. Astro valida el host vía `security.allowedDomains` con el apex HTTPS. Rate limiting usa exclusivamente el `context.clientAddress` que Astro valida con ese límite de confianza.

`Origin` se compara con la URL pública reconstruida por Astro. Una petición legítima con Origin HTTPS llega bien aunque el tramo interno sea HTTP; un Origin externo se rechaza. La baja RFC 8058 mantiene su única excepción sin Origin y valida el token firmado existente.

## Datos y privacidad

Neon es la fuente de verdad. Las migraciones `001–007` están aplicadas y son inmutables; cambios de esquema van en migraciones nuevas. La migración `008` agrega el registro idempotente de eventos de Resend. Webhook firma, deduplicación durable y clave idempotente de reenvío preceden sus efectos externos.

Admin, diagnósticos, `/m/` y APIs privadas son no-cache. El middleware no registra URL ni payload en errores; los access logs Nginx se desactivan para rutas con tokens o datos del panel. Las páginas privadas no llevan GA, no están en sitemap y no publican token, canonical ni OpenGraph de prospectos. Los logs de aplicación van a stdout/stderr con eventos estructurados y sin secretos ni datos personales.

## Auditoría de la referencia V1

| Clasificación | Capacidades |
|---|---|
| A — ya absorbidas | Leads, pipeline, admins/auth, auditoría, landings privadas, emails, bajas, aperturas, clicks y métricas que corresponden al portal actual. |
| B — útil que falta | No se aprobó un módulo histórico para transplantar en esta migración. |
| C — legado discontinuado | Galicia y módulos/contenido de branding, testimonios, equipo, blog y galerías que no forman parte del producto V3 actual. |
| D — requiere decisión | CMS genérico, administración/media upload, campañas/funnels/automatizaciones y el flujo histórico `ONB_Records`; no confundirlo con los diagnósticos privados de V3. |

No se reutiliza backend Apps Script.

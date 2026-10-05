# Despliegue VPS

Procedimiento preparado para el proxy real inventariado; no ejecuta cambios remotos. La app vive en `/srv/fedesconsultora`, el proxy central en `/srv/proxy` y ambos usan `fedes-net`. Producción descarga una imagen ya construida de GHCR; no compila en el VPS.

## 1. Publicar y elegir el artefacto

El workflow manual **Publish release image** (`.github/workflows/publish-image.yml`) corre `npm ci`, `npm run verify`, construye y prueba la imagen, y luego publica `ghcr.io/fedesconsultora/fedesconsultora-landingv3:sha-<SHA-completo>`. Rehúsa sobrescribir una etiqueta SHA existente y entrega el digest OCI. Para deploy usar el digest exacto reportado, no `latest`.

Antes de publicar, la imagen pasa por health/smoke, usuario no root, filesystem raíz de solo lectura, `/tmp` escribible, ausencia de secrets en `Config.Env` y `docker stop` con un máximo de 20 segundos. El build usa sólo configuración pública y el SHA. Estas pruebas deben ejecutarse en GitHub Actions o en un Docker Engine sano; el resultado local bloqueado se documenta en el handoff de release.

## 2. Preflight del VPS y checkout de configuración

Medir el estado actual en el VPS antes de cada release; los valores de inventario son un snapshot y no un estado vigente garantizado:

```sh
df -h /srv /var/lib/docker
free -h
docker system df
docker image ls ghcr.io/fedesconsultora/fedesconsultora-landingv3
docker network inspect fedes-net
```

La captura inicial mostró Ubuntu 24.04.5, Docker 29.6.2, Compose 5.3.1, 40 GB libres con 81% ocupado, 3.2 GiB disponibles, 2.2 GiB de swap en uso y 4.4 GB de build cache. No iniciar si el preflight actual compromete los servicios compartidos. Conservar al menos las últimas 2–3 imágenes por digest; no ejecutar prune global ni borrar volúmenes o artefactos de rollback.

```sh
sudo install -d -o "$USER" -g "$USER" /srv/fedesconsultora
cd /srv/fedesconsultora
if [ ! -d .git ]; then
  git clone https://github.com/FedesConsultora/FedesConsultora_LandingV3.git .
else
  git fetch origin --prune --tags
fi
git checkout --detach <SHA_REVISADO>
test "$(git rev-parse HEAD)" = "<SHA_REVISADO>"
git status --short --branch
```

El checkout entrega Compose y la documentación versionada. No ejecutar `npm ci`, `npm run build` ni `docker compose build` en el VPS.

## 3. Configuración runtime

Crear `/srv/fedesconsultora/.env.production` con el gestor de secretos vigente, fuera de Git y de la imagen, y restringir permisos:

```sh
chmod 600 /srv/fedesconsultora/.env.production
```

Variables públicas incluidas durante el build: `PUBLIC_SITE_URL=https://fedesconsultora.com`, `PUBLIC_INDEXABLE=false`, `PUBLIC_GA_ID` y `PUBLIC_BUILD_ID` (SHA). El workflow toma `PUBLIC_GA_ID` de la variable de repositorio GitHub homónima; si no existe, la imagen se publica sin GA4. Cambiar cualquiera de estas variables exige publicar una nueva imagen/SHA; nunca incluir secretos en argumentos de build.

| Variable runtime | Clasificación y uso |
|---|---|
| `POSTGRES_URL` | Secreto. La misma base Neon `main`; conservar valor y datos actuales. |
| `SESSION_SECRET` | Secreto. Mantener para no invalidar sesiones firmadas/CSRF. |
| `LANDING_TOKEN_KEY` | Secreto. Mantener la clave que cifra los tokens guardados. |
| `RESEND_WEBHOOK_SECRET` | Secreto runtime para verificar firmas. |
| `RESEND_API_KEY` | Secreto runtime; dejar vacío durante migración para conservar el modo simulado. |
| `CONTACT_TO`, `CONTACT_FROM` | Configuración runtime; `CONTACT_TO` puede considerarse privado. |
| `MAIL_FROM`, `MAIL_LINKS_URL`, `MAIL_PERMITIDOS`, `MAIL_RESPUESTAS_DOMINIO`, `MAIL_COPIA_RESPUESTAS` | Configuración runtime; tratar direcciones/listas como privadas. `MAIL_LINKS_URL=https://fedesconsultora.com`. |

No agregar `RESEND_TEST_BASE_URL` a producción: sólo permite un mock HTTP local para integración y acepta loopback únicamente. No activar correos reales por el solo hecho de migrar. No habilitar indexación.

## 4. Pull, respaldo y migración

Si el paquete es privado, autenticarse en GHCR con un token `read:packages` almacenado por el operador, sin mostrarlo:

```sh
printf '%s' "$GHCR_READ_TOKEN" | docker login ghcr.io --username "$GHCR_USER" --password-stdin
unset GHCR_READ_TOKEN
```

Definir el digest publicado por el workflow:

```sh
export IMAGE_REF='ghcr.io/fedesconsultora/fedesconsultora-landingv3@sha256:<DIGEST_PUBLICADO>'
cd /srv/fedesconsultora
docker compose --env-file .env.production config --quiet
docker compose --env-file .env.production pull
```

Confirmar backup/PITR de Neon `main` y registrar punto/horario antes de escribir. Luego:

```sh
docker compose --env-file .env.production run --rm --no-deps fedesconsultora-web npm run db:migrate -- --dry-run
docker compose --env-file .env.production run --rm --no-deps fedesconsultora-web npm run db:migrate
```

Las migraciones `001–007` ya aplicadas son inmutables. `008_resend_webhooks_idempotencia.sql` agrega la tabla de eventos idempotentes. Si el dry-run muestra algo inesperado o el target no está confirmado como Neon `main`, detenerse antes de ejecutar la migración. No se agrega Postgres al VPS.

Para crear/actualizar un admin, usar el comando interactivo sin exponer contraseña en args o logs:

```sh
docker compose --env-file .env.production run --rm --no-deps --interactive fedesconsultora-web npm run admin:crear
```

## 5. Arranque y proxy central

```sh
docker compose --env-file .env.production up -d --no-build
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=100 fedesconsultora-web
docker compose -f /srv/proxy/docker-compose.yml exec -T nginx wget -qO- http://fedesconsultora-web:4321/api/health
```

El endpoint esperado es `{"status":"ok","service":"fedesconsultora-web","build":"<SHA>"}`. El servicio sólo expone 4321 dentro de `fedes-net`; no publica un puerto del host.

El vhost vigente está en `/srv/proxy/nginx/conf.d/fedesconsultora.com.conf`, ACME usa `/var/www/certbot`, los certificados montados se ubican en `/etc/letsencrypt/live/fedesconsultora.com/{fullchain.pem,privkey.pem}` y el servicio Compose real se llama `nginx` (contenedor `fedes-proxy`). El sitio estático previo en `/srv/www/fedes.ai` se conserva para rollback. La plantilla nueva conserva TLS 1.2/1.3, HSTS de 24 horas y `upgrade-insecure-requests` del vhost vigente además de los headers de V3.

Antes de reemplazar el vhost, guardar una copia fechada. Integrar la plantilla `deploy/nginx/fedesconsultora.com.conf.example` en el archivo real y verificar, sin borrar la copia:

```sh
docker compose -f /srv/proxy/docker-compose.yml exec -T nginx nginx -t
docker compose -f /srv/proxy/docker-compose.yml exec -T nginx nginx -s reload
```

El snapshot de certificado cubría apex y `www` y vencía el 11-11-2026; confirmar vigencia actual antes del cambio. No instalar Certbot ni alterar certificados desde la app.

## 6. Smoke y cutover

Después de validar Nginx:

```sh
curl -fsS https://fedesconsultora.com/api/health
```

Desde una máquina operadora con Node 24 y checkout del SHA probado, ejecutar `PROXY_TEST_BASE=https://fedesconsultora.com npm run smoke:proxy` y `SMOKE_BASE=https://fedesconsultora.com RESEND_WEBHOOK_SECRET=<CLAVE_DE_PRUEBA_NO_PRODUCTIVA> npm run smoke`. Completar el checklist externo: `/`, `/contacto`, `/admin` sin sesión, login controlado, pipeline, landing privada, formulario con lead persistido, mail simulado, webhook firmado, privacidad, robots, sitemap y 404. Probar `www`→apex, ACME, `Origin: https://fedesconsultora.com`, límites y headers.

El cutover del vhost es la última operación. No cambiar DNS, retirar Vercel ni activar indexación como parte de este bloque. Mantener el sitio estático, el vhost anterior y el deployment Vercel hasta completar la observación acordada.

## 7. Integración Neon aislada en CI

`npm run verify` es hermético. El workflow manual `Verify isolated Neon integration` usa GitHub Environment `neon-ci`; requiere secretos `CI_NEON_POSTGRES_URL`, `CI_SESSION_SECRET`, `CI_LANDING_TOKEN_KEY`, `CI_RESEND_WEBHOOK_SECRET` y variable `CI_NEON_BRANCH_ID`.

La conexión debe apuntar a una rama Neon exclusiva, creada desde un snapshot sin datos personales y nunca compartida con desarrollo o `main`. Antes de habilitar el workflow, crear sólo en esa rama la marca:

```sql
CREATE TABLE public.marca_ci (
  entorno TEXT NOT NULL CHECK (entorno = 'ci'),
  branch_id TEXT NOT NULL UNIQUE,
  creada_el TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.marca_ci (entorno, branch_id) VALUES ('ci', '<ID_REAL_DE_LA_RAMA_NEON_CI>');
```

Configurar la variable GitHub con el mismo ID exacto. El runner exige `DATABASE_ENV=ci`, valida la URL PostgreSQL, exige exactamente una marca coincidente y rehúsa cualquier `RESEND_API_KEY` real antes de migrar o limpiar fixtures. Tras Fase 1/2, inicia un servidor aparte y un mock Resend en loopback, fuerza respuesta ambigua del proveedor, y verifica retry con la misma Idempotency-Key. Si no existen rama/secretos, el workflow queda sin ejecutar; no sustituirlos por la rama compartida o `main`.

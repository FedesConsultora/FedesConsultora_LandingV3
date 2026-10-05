# Despliegue en VPS

Este documento prepara un despliegue repetible; la edición remota de Nginx y el cutover de DNS quedan a cargo del operador. El destino es `/srv/fedesconsultora/docker-compose.yml`, con Nginx en `/srv/proxy/nginx/conf.d/fedesconsultora.com.conf` y upstream `fedesconsultora-web:4321` en `fedes-net`.

## 1. Preflight y checkout

Antes de construir, comprobar el espacio, memoria y versiones guardadas:

```sh
df -h /srv /var/lib/docker
free -h
docker system df
docker image ls fedesconsultora-web
docker network inspect fedes-net
```

El inventario inicial reportó disco al 81% con unos 40 GB libres, 3.2 GiB disponibles, 2.2 GiB de swap en uso y 4.4 GB de caché BuildKit (2.6 GB reclamables). Detener el despliegue si el preflight muestra presión que pueda afectar los servicios compartidos. Mantener 2–3 releases etiquetadas. No usar `docker system prune -a` ni eliminar volúmenes. Si hace falta recuperar espacio, inspeccionar primero `docker builder du` y limpiar sólo caché de build antigua de forma controlada.

```sh
sudo install -d -o "$USER" -g "$USER" /srv/fedesconsultora
cd /srv/fedesconsultora
git fetch --all --tags
git checkout --detach <SHA_REVISADO>
git status --short --branch
npm ci
npm run verify
```

Usar un SHA exacto y verificar que `npm run verify` termina verde. No construir desde archivos sucios.

## 2. Archivo runtime

Crear `/srv/fedesconsultora/.env.production` con el gestor de secretos operativo, propietario del usuario de deploy y modo `600`:

```sh
chmod 600 /srv/fedesconsultora/.env.production
```

Valores requeridos:

| Variable | Uso | Tipo |
|---|---|---|
| `POSTGRES_URL` | URL de la misma base Neon `main`; no migrar ni regenerar la base. | Runtime secret |
| `SESSION_SECRET` | Derivación CSRF/HMAC. Conservar el valor del entorno actual. | Runtime secret |
| `LANDING_TOKEN_KEY` | AES-256-GCM para links existentes. Conservar el valor actual para no perder acceso a tokens guardados. | Runtime secret |
| `RESEND_API_KEY` | Envíos y lectura/reenvío Resend. Omitir durante la migración para mantener modo simulado. | Runtime secret |
| `RESEND_WEBHOOK_SECRET` | Verificación de firma del webhook Resend. | Runtime secret |
| `CONTACT_TO`, `CONTACT_FROM` | Aviso de formulario. | Runtime config |
| `MAIL_FROM`, `MAIL_LINKS_URL`, `MAIL_PERMITIDOS`, `MAIL_RESPUESTAS_DOMINIO`, `MAIL_COPIA_RESPUESTAS` | Envío, links y recepción. `MAIL_LINKS_URL` debe ser `https://fedesconsultora.com`. | Runtime config; guardar como secreto el campo si contiene una credencial |

Configuración pública de build: `PUBLIC_SITE_URL=https://fedesconsultora.com`, `PUBLIC_INDEXABLE=false`, `PUBLIC_GA_ID` y `BUILD_SHA`. No cargar secretos como build args. El compose expone como build args sólo las variables públicas y el SHA.

No activar correo real por tener endpoint/webhook. Mantener `RESEND_API_KEY` vacío durante la primera migración y smoke controlado; actualizar la URL webhook de Resend a `https://fedesconsultora.com/api/webhooks/resend` cuando se apruebe ese cambio. No habilitar indexación en este despliegue.

## 3. Imagen y migración

Registrar SHA e imagen previa antes de construir. Compose no imprime valores de `.env.production` al validar configuración:

```sh
cd /srv/fedesconsultora
export IMAGE_TAG="$(git rev-parse --short=12 HEAD)"
export BUILD_SHA="$(git rev-parse HEAD)"
docker compose --env-file .env.production config --quiet
docker compose --env-file .env.production build
docker image inspect "fedesconsultora-web:$IMAGE_TAG" --format '{{.Config.User}}'
```

La imagen se construye sin credenciales de producción. Confirmar backup/PITR de Neon `main` y registrar hora/estado. Después revisar y aplicar migraciones:

```sh
docker compose --env-file .env.production run --rm --no-deps fedesconsultora-web npm run db:migrate -- --dry-run
docker compose --env-file .env.production run --rm --no-deps fedesconsultora-web npm run db:migrate
```

La migración `008_resend_webhooks_idempotencia.sql` es nueva y aditiva. No editar ni recrear `001–007`. Si el dry-run propone una migración inesperada, detenerse y revisar el target Neon antes de escribir.

Para crear o actualizar el admin de producción, usar el comando interactivo sin poner la contraseña en argumentos ni logs:

```sh
docker compose --env-file .env.production run --rm --no-deps --interactive fedesconsultora-web npm run admin:crear
```

## 4. Arranque, proxy y smoke

```sh
docker compose --env-file .env.production up -d --no-build
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=100 fedesconsultora-web
```

Comprobar que el contenedor está healthy, escucha internamente en 4321 y no tiene `ports` publicados. Probar el origin interno y el endpoint de salud. Luego integrar `deploy/nginx/fedesconsultora.com.conf.example` en la configuración actual. Mantener exactamente las directivas de certificado y la excepción ACME del proxy instalado; el certificado inventariado cubre apex y `www`, vence el 11-11-2026, y Nginx debe seguir siendo el único terminador TLS.

Antes del cutover DNS, probar Nginx con resolución temporal del dominio al VPS:

```sh
curl --resolve fedesconsultora.com:443:<IP_VPS> -sS -D - https://fedesconsultora.com/api/health
```

Después de instalar el vhost, correr `nginx -t` desde el contenedor/compose real del proxy y sólo entonces recargarlo según el servicio identificado en ese compose. La captura de inventario confirmó un `nginx -t` previo verde; repetirlo tras el cambio. Desde un host externo, ejecutar `PROXY_TEST_BASE=https://fedesconsultora.com npm run smoke:proxy` y `npm run smoke` con `SMOKE_BASE` apuntando al sitio de prueba.

Checklist funcional después del arranque: `/`, `/contacto`, `/admin` sin sesión, login controlado, pipeline, landing privada, formulario controlado con lead persistido, mail simulado, webhook firmado, headers privados, `/robots.txt`, sitemap y 404. No activar DNS cutover ni retirar Vercel hasta que el dueño valide la prueba externa.

## 5. Integración DB de CI

El gate `npm run verify` no accede a bases. `npm run verify:integration` requiere los secretos `CI_NEON_POSTGRES_URL`, `CI_SESSION_SECRET`, `CI_LANDING_TOKEN_KEY` y `CI_RESEND_WEBHOOK_SECRET`; deben apuntar a una rama Neon exclusiva de CI con la tabla marcadora `marca_desarrollo`. El runner verifica esa marca antes de migrar, arranca la misma app construida, corre smoke e integración y exige `RESEND_API_KEY` vacío. Nunca configurar esos secretos con `main` ni con la rama compartida de desarrollo.

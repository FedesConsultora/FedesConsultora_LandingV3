# Rollback

## Preparación en cada release

- Guardar el digest actual y los últimos 2–3 digests GHCR de release.
- Antes de modificar proxy, guardar una copia fechada de `/srv/proxy/nginx/conf.d/fedesconsultora.com.conf`.
- Mantener el deployment Vercel publicado durante la validación y el periodo acordado después del cutover.
- Registrar imagen y configuración previas sin copiar `.env.production` a archivos de salida.

## Volver a la imagen anterior

En `/srv/fedesconsultora`, fijar el digest exacto de la imagen anterior y arrancarla con la misma configuración runtime:

```sh
export IMAGE_REF='ghcr.io/fedesconsultora/fedesconsultora-landingv3@sha256:<DIGEST_ANTERIOR>'
docker compose --env-file .env.production pull
docker compose --env-file .env.production up -d --no-build
docker compose --env-file .env.production ps
docker compose -f /srv/proxy/docker-compose.yml exec -T nginx wget -qO- http://fedesconsultora-web:4321/api/health
```

Comprobar `healthy`, `GET /api/health`, páginas públicas, `/admin` y headers privados. No borrar el release fallido hasta entender el error.

## Volver la configuración Nginx

Restaurar el archivo exacto respaldado en `/srv/proxy/nginx/conf.d/fedesconsultora.com.conf`, ejecutar `docker compose -f /srv/proxy/docker-compose.yml exec -T nginx nginx -t` y sólo si pasa recargar con `docker compose -f /srv/proxy/docker-compose.yml exec -T nginx nginx -s reload`. Validar dominio, certificado, ACME y respuestas desde fuera.

```sh
sudo cp -a /srv/proxy/nginx/conf.d/fedesconsultora.com.conf.<FECHA>.bak /srv/proxy/nginx/conf.d/fedesconsultora.com.conf
docker compose -f /srv/proxy/docker-compose.yml exec -T nginx nginx -t
docker compose -f /srv/proxy/docker-compose.yml exec -T nginx nginx -s reload
```

Si se necesita regresar antes de operar el dominio en el VPS, mantener el dominio/deployment Vercel disponible. Después de un cutover, usar el vhost anterior del proxy o revertir el DNS según el procedimiento del operador; no eliminar archivos, certificados ni la app Vercel como parte del rollback de esta release.

## Base de datos

La migración `008` sólo añade la tabla de eventos idempotentes e índice. El código previo puede ignorarlos, por lo que el rollback normal no revierte ni borra el schema. No editar las migraciones aplicadas ni ejecutar SQL de DROP como parte del rollback. Si Neon presenta problemas, detener escrituras/despliegues y usar el procedimiento de restore/PITR de Neon aprobado por el responsable de la base; primero confirmar el punto y las consecuencias sobre datos posteriores.

# Rollback

## Preparación en cada release

- Guardar SHA del release actual y los últimos 2–3 tags Docker inmutables.
- Antes de modificar proxy, guardar una copia fechada de `/srv/proxy/nginx/conf.d/fedesconsultora.com.conf`.
- Mantener el deployment Vercel publicado durante la validación y el periodo acordado después del cutover.
- Registrar imagen y configuración previas sin copiar `.env.production` a archivos de salida.

## Volver a la imagen anterior

En `/srv/fedesconsultora`, escoger el SHA exacto de la imagen anterior y arrancarla con la misma configuración runtime:

```sh
export IMAGE_TAG=<SHA_ANTERIOR_CORTO>
docker image inspect "fedesconsultora-web:$IMAGE_TAG" >/dev/null
docker compose --env-file .env.production up -d --no-build
docker compose --env-file .env.production ps
```

Comprobar `healthy`, `GET /api/health`, páginas públicas, `/admin` y headers privados. No borrar el release fallido hasta entender el error.

## Volver la configuración Nginx

Restaurar el archivo exacto respaldado en el proxy central, ejecutar `nginx -t` dentro del servicio real de `/srv/proxy/docker-compose.yml` y recargar Nginx con el comando del compose inventariado. Validar dominio, certificado, ACME y respuestas desde fuera. No ejecutar una recarga si `nginx -t` no termina verde.

Si se necesita regresar antes de operar el dominio en el VPS, mantener el dominio/deployment Vercel disponible. Después de un cutover, usar el vhost anterior del proxy o revertir el DNS según el procedimiento del operador; no eliminar archivos, certificados ni la app Vercel como parte del rollback de esta release.

## Base de datos

La migración `008` sólo añade la tabla de eventos idempotentes e índice. El código previo puede ignorarlos, por lo que el rollback normal no revierte ni borra el schema. No editar las migraciones aplicadas ni ejecutar SQL de DROP como parte del rollback. Si Neon presenta problemas, detener escrituras/despliegues y usar el procedimiento de restore/PITR de Neon aprobado por el responsable de la base; primero confirmar el punto y las consecuencias sobre datos posteriores.

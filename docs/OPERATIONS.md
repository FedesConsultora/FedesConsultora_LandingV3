# Operaciones

## Estado y salud

El healthcheck de Compose solicita `GET /api/health` cada 30 segundos y sólo confirma que el proceso responde; no consulta Neon. Devuelve `ok`, el nombre del servicio y el SHA/build público. Una base Neon en scale-to-zero no debe marcar unhealthy a la app.

```sh
cd /srv/fedesconsultora
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=200 fedesconsultora-web
docker stats --no-stream fedesconsultora-web
docker system df
```

Los logs de la app van a stdout/stderr y Docker los rota a 3 archivos de 10 MB. Se registran evento, clase de ruta y nombre/código de error, no URL, query, token, contraseña, CSRF, claves, `POSTGRES_URL` ni payload personal. Nginx no registra solicitudes de `/diagnostico/*`, `/m/*`, `/admin/*` ni `/api/admin/*` en el vhost propuesto.

## Tareas habituales

- Migración pendiente: revisar el target Neon, confirmar backup/PITR, correr primero `docker compose --env-file .env.production run --rm --no-deps fedesconsultora-web npm run db:migrate -- --dry-run`, luego ejecutar migración aprobada y revisar logs.
- Admin: `docker compose --env-file .env.production run --rm --no-deps --interactive fedesconsultora-web npm run admin:crear`. No pasar contraseñas en línea de comandos.
- Smoke local/proxy: `SMOKE_BASE=http://127.0.0.1:4321 npm run smoke`; desde fuera, `PROXY_TEST_BASE=https://fedesconsultora.com npm run smoke:proxy` después de servir la ruta por el Nginx de prueba.
- Mensajes: mantener `RESEND_API_KEY` ausente para simular. El modo real requiere autorización separada, dominio verificado, textos aprobados y `MAIL_PERMITIDOS` configurado durante pruebas controladas.
- Webhook: `https://fedesconsultora.com/api/webhooks/resend`; firma obligatoria, eventos idempotentes por ID. No incluir cuerpos o datos recibidos en logs.

## Disco y releases

Conservar las últimas 2–3 imágenes release por SHA y verificar `docker image ls` antes de limpiar. El VPS inventariado está al 81% de uso y mantiene varios servicios compartidos; hacer `df -h`, `docker system df` y revisar `docker builder du` antes de cualquier housekeeping. Limpiar caché de build antigua de forma dirigida. No ejecutar `docker system prune -a`, no limpiar volúmenes y no borrar la imagen de rollback elegida.

## Incidentes

1. Comprobar salud del proceso y disponibilidad de Neon/Resend separadamente; health no consulta esas dependencias.
2. No copiar variables de entorno a tickets ni usar `docker inspect` sin filtrar porque puede mostrar secretos runtime.
3. Ante 5xx, revisar sólo logs estructurados. El middleware no propaga excepciones de rutas al logger del adapter con la URL privada.
4. Si el nuevo release está afectado, seguir `docs/ROLLBACK.md`; preservar base y tabla de eventos.

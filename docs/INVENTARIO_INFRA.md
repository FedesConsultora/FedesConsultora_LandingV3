# Inventario de infraestructura (solo lectura)

Procedimiento para relevar el VPS antes de comparar alternativas de alojamiento. No ejecuta cambios remotos ni migraciones: solo lee estado y escribe un reporte local.

## Para qué sirve

`docs/DEPLOY_VPS.md` conserva un snapshot de recursos del VPS (disco, memoria, swap) tomado una vez. Para decidir si conviene mantener, optimizar o migrar hace falta una medición actual y repetible: qué corre, cuánto consume, qué depende de qué, cuándo vencen los certificados y qué backups existen. El script `scripts/inventario-vps.sh` junta esos datos en un único reporte.

## Cómo ejecutarlo

Lo corre una persona con acceso al servidor, a mano. Recomendado con `sudo` para ver certificados, logs de contenedores y firewall.

```sh
cd /srv/fedesconsultora
sudo OUT_DIR=/root/inventarios bash scripts/inventario-vps.sh
```

Variables opcionales: `OUT_DIR` (carpeta del reporte), `DOMINIOS` (dominios a resolver; por defecto `fedes.ai fedesconsultora.com vaddar.com sedeagro.fedes.ai`), `PROXY_DIR` (por defecto `/srv/proxy`), `APP_DIR` (por defecto `/srv`) y `BACKUP_DIRS` (carpetas de backups a listar).

El reporte queda en `inventario-vps-<host>-<fecha>.txt` con permisos 600.

## Qué relevan sus nueve secciones

1. Sistema operativo, CPU, memoria, swap, disco e inodos, y procesos que más memoria usan.
2. Docker: contenedores, consumo, política de reinicio, límites, redes (incluida `fedes-net` y quién está conectado), volúmenes, imágenes y peso de los logs.
3. Puertos en escucha, servicios activos y temporizadores.
4. Nginx central: archivos de vhost y directivas `server_name`, `listen`, `proxy_pass` y de certificados; validación de sintaxis sin recargar.
5. Vencimiento de certificados TLS.
6. DNS: cómo resuelve hoy cada dominio histórico y nuevo, para clasificarlo como productivo o no con evidencia.
7. Aplicaciones bajo `/srv`: tamaño y último commit de cada repositorio.
8. Backups y tareas programadas (horario y nombre del comando).
9. Seguridad básica del host: SSH, firewall, cuentas con login, actualizaciones pendientes.

## Garantías y límites

- **Solo lectura.** No reinicia, borra, recarga ni modifica configuración.
- **Sin secretos.** No lee `.env*`, no muestra variables de entorno de contenedores, argumentos de procesos ni el contenido de crontabs o de archivos de Nginx.
- **Informa lo que no puede ver.** Si falta una herramienta o un permiso, la sección lo indica y el resto continúa.
- **No mide facturación ni contratación.** Los recursos contratados y el costo mensual salen de la factura y del panel del proveedor, no del servidor.
- **No mide tráfico a lo largo del tiempo.** El reporte es una foto. Para crecimiento y picos hace falta monitoreo continuo o repetirlo en fechas distintas.

## Tratamiento del reporte

Describe la infraestructura: es interno. No se sube a Git (`.gitignore` excluye `inventario-vps-*.txt`) ni se pega en tickets públicos. Revisarlo antes de compartirlo con terceros, como un proveedor de nube.

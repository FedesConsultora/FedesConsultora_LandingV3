#!/usr/bin/env bash
# Inventario de SOLO LECTURA del VPS (Donweb u otro). Pensado para ejecutarse una vez, a mano,
# por quien opera el servidor, antes de comparar alternativas de infraestructura.
#
# Garantías de diseño:
#   - No modifica nada: sin escrituras salvo el archivo de salida (modo 600), sin reinicios,
#     sin `docker rm/prune`, sin `nginx -s reload`, sin cambios de DNS.
#   - No imprime secretos: no lee `.env*`, no muestra variables de entorno de contenedores
#     (nunca usa `docker inspect` sin formato), no muestra argumentos de procesos ni el contenido
#     de crontabs ni de archivos de configuración de Nginx (solo directivas puntuales).
#   - Cada sección tolera que falte una herramienta o un permiso: lo informa y sigue.
#
# Uso:
#   bash scripts/inventario-vps.sh                  # recomendado con sudo para ver todo
#   OUT_DIR=/tmp DOMINIOS="a.com b.com" bash scripts/inventario-vps.sh
#
# Variables opcionales:
#   OUT_DIR     Carpeta del reporte (por defecto, la actual).
#   DOMINIOS    Dominios a resolver (por defecto, los del relevamiento inicial).
#   PROXY_DIR   Raíz del proxy central (por defecto /srv/proxy).
#   APP_DIR     Raíz de las apps (por defecto /srv).
#   BACKUP_DIRS Carpetas de backups a listar (solo nombre, tamaño y fecha). Opcional.
#
# El reporte describe la infraestructura: tratalo como interno, no lo subas a Git ni lo pegues en
# tickets públicos. `.gitignore` ya excluye `inventario-vps-*.txt`.

set -u
umask 077

OUT_DIR="${OUT_DIR:-$PWD}"
DOMINIOS="${DOMINIOS:-fedes.ai fedesconsultora.com vaddar.com sedeagro.fedes.ai}"
PROXY_DIR="${PROXY_DIR:-/srv/proxy}"
APP_DIR="${APP_DIR:-/srv}"
BACKUP_DIRS="${BACKUP_DIRS:-}"

HOST="$(hostname 2>/dev/null || echo desconocido)"
FECHA="$(date +%Y%m%d-%H%M%S)"
SALIDA="${OUT_DIR%/}/inventario-vps-${HOST}-${FECHA}.txt"

if ! : >"$SALIDA" 2>/dev/null; then
  echo "No se puede escribir en $OUT_DIR. Indicá otra carpeta con OUT_DIR=..." >&2
  exit 1
fi
chmod 600 "$SALIDA" 2>/dev/null || true

tiene() { command -v "$1" >/dev/null 2>&1; }

seccion() {
  {
    printf '\n==== %s ====\n' "$1"
  } | tee -a "$SALIDA"
}

# Ejecuta un comando, agrega su salida al reporte y nunca corta el script si falla.
correr() {
  local salida
  salida="$("$@" 2>&1)" || salida="${salida}"$'\n'"[código de salida distinto de 0: $*]"
  printf '%s\n' "$salida" | tee -a "$SALIDA"
}

nota() { printf '%s\n' "$*" | tee -a "$SALIDA"; }

{
  echo "Inventario de solo lectura"
  echo "Host: $HOST"
  echo "Fecha: $(date -Is 2>/dev/null || date)"
  echo "Usuario: $(id -un 2>/dev/null) (uid $(id -u 2>/dev/null))"
} | tee -a "$SALIDA"
if [ "$(id -u 2>/dev/null)" != "0" ]; then
  nota "AVISO: sin permisos de root. Faltarán datos de logs, certificados y firewall."
fi

seccion "1. Sistema y recursos"
correr bash -c 'cat /etc/os-release 2>/dev/null | grep -E "^(PRETTY_NAME|VERSION_ID)="; uname -srm'
correr bash -c 'echo "CPU (nproc): $(nproc 2>/dev/null)"; grep -m1 "model name" /proc/cpuinfo 2>/dev/null'
correr uptime
correr free -h
if tiene swapon; then correr swapon --show; fi
correr df -hT -x tmpfs -x devtmpfs -x overlay
correr df -i -x tmpfs -x devtmpfs -x overlay
nota "-- Procesos por memoria (solo nombre del proceso, sin argumentos)"
correr bash -c 'ps -eo pid,comm,%cpu,%mem,rss --sort=-%mem 2>/dev/null | head -15'

seccion "2. Docker"
if tiene docker; then
  correr docker version --format 'Cliente {{.Client.Version}} / Servidor {{.Server.Version}}'
  correr docker compose version
  nota "-- Contenedores (nombre, imagen, estado, puertos publicados)"
  correr docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
  nota "-- Consumo instantáneo"
  correr docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}'
  nota "-- Política de reinicio y límites (sin variables de entorno)"
  correr bash -c "docker ps -aq | xargs -r docker inspect --format '{{.Name}} restart={{.HostConfig.RestartPolicy.Name}} mem_limit={{.HostConfig.Memory}} cpus={{.HostConfig.NanoCpus}} readonly_rootfs={{.HostConfig.ReadonlyRootfs}} user={{.Config.User}}'"
  nota "-- Redes"
  correr docker network ls --format 'table {{.Name}}\t{{.Driver}}\t{{.Scope}}'
  correr bash -c "docker network ls --format '{{.Name}}' | grep -vE '^(bridge|host|none)$' | while read -r r; do printf '%s: ' \"\$r\"; docker network inspect \"\$r\" --format '{{range \$id,\$c := .Containers}}{{\$c.Name}} {{end}}'; done"
  nota "-- Proyectos Compose"
  correr docker compose ls -a
  nota "-- Uso de disco de Docker"
  correr docker system df
  nota "-- Volúmenes"
  correr docker volume ls --format 'table {{.Name}}\t{{.Driver}}'
  nota "-- Imágenes (tamaño y antigüedad)"
  correr docker image ls --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}'
  nota "-- Tamaño de los logs de contenedores (solo tamaño, sin contenido)"
  correr bash -c 'du -sh /var/lib/docker/containers/*/*-json.log 2>/dev/null | sort -rh | head -10'
else
  nota "Docker no está instalado o no es accesible para este usuario."
fi

seccion "3. Servicios y puertos en escucha"
if tiene ss; then
  correr bash -c 'ss -tulnH 2>/dev/null | awk "{print \$1, \$5}" | sort -u'
fi
if tiene systemctl; then
  nota "-- Servicios activos (nombres)"
  correr bash -c 'systemctl list-units --type=service --state=running --no-legend --no-pager 2>/dev/null | awk "{print \$1}"'
  nota "-- Temporizadores systemd"
  correr bash -c 'systemctl list-timers --no-pager --no-legend 2>/dev/null | head -20'
fi

seccion "4. Nginx / proxy central (solo directivas puntuales, no el archivo completo)"
if [ -d "$PROXY_DIR/nginx/conf.d" ]; then
  nota "Archivos de vhost:"
  correr ls -la "$PROXY_DIR/nginx/conf.d"
  nota "Directivas server_name / listen / proxy_pass / ssl_certificate (rutas, no contenido):"
  correr bash -c "grep -HEn '^[[:space:]]*(server_name|listen|proxy_pass|ssl_certificate|ssl_protocols|limit_req_zone|limit_req)[[:space:]]' '$PROXY_DIR'/nginx/conf.d/*.conf 2>/dev/null"
else
  nota "No existe $PROXY_DIR/nginx/conf.d. Ajustá PROXY_DIR si el proxy está en otra ruta."
fi
if tiene docker; then
  nota "-- Contenedor del proxy: validación de sintaxis (no recarga)"
  correr bash -c "docker ps --format '{{.Names}}' | grep -iE 'proxy|nginx' | head -3 | while read -r n; do echo \"[\$n]\"; docker exec \"\$n\" nginx -t 2>&1; done"
fi

seccion "5. Certificados TLS (vencimiento)"
if tiene openssl; then
  encontrados=0
  for crt in /etc/letsencrypt/live/*/fullchain.pem "$PROXY_DIR"/certbot/conf/live/*/fullchain.pem; do
    [ -r "$crt" ] || continue
    encontrados=1
    nota "[$crt]"
    correr openssl x509 -in "$crt" -noout -subject -enddate
  done
  [ "$encontrados" = 0 ] && nota "No se encontraron certificados legibles en las rutas habituales (puede faltar root)."
else
  nota "openssl no está disponible."
fi

seccion "6. DNS (resolución actual desde este servidor)"
for d in $DOMINIOS; do
  nota "[$d]"
  if tiene dig; then
    correr bash -c "echo A: \$(dig +short A '$d' | tr '\n' ' '); echo AAAA: \$(dig +short AAAA '$d' | tr '\n' ' '); echo NS: \$(dig +short NS '$d' | tr '\n' ' '); echo MX: \$(dig +short MX '$d' | tr '\n' ' ')"
  else
    correr getent ahosts "$d"
  fi
done
nota "-- IP pública de este servidor"
if tiene curl; then correr curl -fsS --max-time 5 https://api.ipify.org; echo | tee -a "$SALIDA" >/dev/null; fi

seccion "7. Aplicaciones bajo $APP_DIR (estructura y tamaño, sin contenido)"
correr bash -c "ls -la '$APP_DIR' 2>/dev/null"
correr bash -c "du -sh '$APP_DIR'/* 2>/dev/null | sort -rh | head -20"
nota "-- Repositorios Git detectados (rama y último commit, sin remotos con credenciales)"
correr bash -c "for g in '$APP_DIR'/*/.git; do d=\$(dirname \"\$g\"); printf '%s: ' \"\$d\"; git -C \"\$d\" log -1 --format='%h %ad %s' --date=short 2>/dev/null || echo 'sin acceso'; done"

seccion "8. Backups y tareas programadas"
if [ -n "$BACKUP_DIRS" ]; then
  for b in $BACKUP_DIRS; do
    nota "[$b]"
    correr bash -c "ls -lat '$b' 2>/dev/null | head -15"
  done
else
  nota "BACKUP_DIRS no definido: no se listan carpetas de backups. Indicalas para verificar antigüedad."
fi
nota "-- Cron (solo el horario y el nombre del primer comando; no se imprimen argumentos)"
correr bash -c 'for f in /etc/crontab /etc/cron.d/*; do [ -r "$f" ] && grep -vE "^[[:space:]]*(#|$)" "$f" | grep -vE "^[A-Z_]+=" | awk "{printf \"%s %s %s %s %s -> \", \$1,\$2,\$3,\$4,\$5; n=split(\$7,a,\"/\"); print a[n]}"; done 2>/dev/null | head -30'
correr bash -c 'crontab -l 2>/dev/null | grep -vE "^[[:space:]]*(#|$)" | awk "{printf \"%s %s %s %s %s -> \", \$1,\$2,\$3,\$4,\$5; n=split(\$6,a,\"/\"); print a[n]}" | head -20'

seccion "9. Seguridad básica del host"
if tiene sshd; then
  correr bash -c 'sshd -T 2>/dev/null | grep -Ei "^(port|permitrootlogin|passwordauthentication|pubkeyauthentication) "'
fi
if tiene ufw; then correr ufw status; fi
if tiene fail2ban-client; then correr fail2ban-client status; fi
nota "-- Cuentas con shell de login (solo nombres)"
correr bash -c "getent passwd | awk -F: '\$7 !~ /(nologin|false)\$/ {print \$1}'"
nota "-- Paquetes con actualización pendiente (cantidad)"
if tiene apt; then correr bash -c 'apt list --upgradable 2>/dev/null | grep -c upgradable'; fi
nota "-- Reinicio pendiente"
correr bash -c '[ -f /var/run/reboot-required ] && echo "SÍ" || echo "no"'

seccion "Fin"
nota "Reporte guardado en: $SALIDA (modo 600). Revisalo antes de compartirlo."

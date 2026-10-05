// Límite de intentos fallidos por IP, guardado en Postgres (tabla `intentos`) para que funcione
// igual en todas las instancias. La IP se guarda como HMAC, nunca en claro.
import { db } from './db';
import { hmac } from './seguridad';

type Tipo = 'login' | 'token';

export const LIMITES: Record<Tipo, { max: number; minutos: number }> = {
  login: { max: 5, minutos: 15 },
  token: { max: 20, minutos: 10 },
};

// Astro Node valida X-Forwarded-For sólo cuando X-Forwarded-Host coincide con
// security.allowedDomains. El Nginx de fedes-net sobrescribe ambos; no leemos headers aquí.
export function clientIp(context: { clientAddress: string; request?: Request }) {
  return context.clientAddress || 'desconocida';
}

export function ipKey(ip: string) {
  return hmac(`ip:${ip}`);
}

export async function superoLimite(tipo: Tipo, ip: string) {
  const { max, minutos } = LIMITES[tipo];
  const [{ n }] = await db()`
    SELECT count(*)::int AS n FROM intentos
    WHERE tipo = ${tipo} AND clave = ${ipKey(ip)}
      AND creado_el > now() - make_interval(mins => ${minutos})
  `;
  return n >= max;
}

export async function registrarFallo(tipo: Tipo, ip: string) {
  await db().transaction([
    db()`INSERT INTO intentos (tipo, clave) VALUES (${tipo}, ${ipKey(ip)})`,
    // Limpieza: los intentos de más de un día ya no cuentan para ningún límite.
    db()`DELETE FROM intentos WHERE creado_el < now() - interval '1 day'`,
  ]);
}

// Límite de intentos fallidos por IP, guardado en Postgres (tabla `intentos`) para que funcione
// igual en todas las instancias serverless de Vercel. La IP se guarda como HMAC, nunca en claro.
import { db } from './db';
import { hmac } from './seguridad';

type Tipo = 'login' | 'token';

export const LIMITES: Record<Tipo, { max: number; minutos: number }> = {
  login: { max: 5, minutos: 15 },
  token: { max: 20, minutos: 10 },
};

// IP del visitante. En Vercel, Astro la toma de los encabezados de la plataforma.
export function clientIp(context: { clientAddress: string; request: Request }) {
  try {
    return context.clientAddress;
  } catch {
    return context.request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'desconocida';
  }
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

// Autenticación del panel /admin. Usuarios en la tabla `admins` (contraseña con scrypt).
// Sesión: la cookie lleva un token al azar y la base guarda solo su hash, así cada sesión
// se puede revocar. Cierre por inactividad y un máximo absoluto de duración.
import { db } from './db';
import { hmac, randomToken, safeEqual, sha256, verifyPassword } from './seguridad';

export const SESSION_COOKIE = 'fedes_admin_session';
export const INACTIVIDAD_MINUTOS = 30;
export const MAXIMO_HORAS = 12;
export const SESSION_MAX_AGE = MAXIMO_HORAS * 60 * 60;

export type Admin = { id: number; usuario: string; nombre: string; sesionId: number; csrf: string };

export function isAdminConfigured() {
  return Boolean(import.meta.env.SESSION_SECRET && import.meta.env.POSTGRES_URL);
}

export async function hayAdmins() {
  const [{ n }] = await db()`SELECT count(*)::int AS n FROM admins WHERE activo`;
  return n > 0;
}

// Devuelve el id del admin si usuario y contraseña son correctos. Siempre corre scrypt,
// exista o no el usuario, para no revelar por tiempo de respuesta cuáles existen.
export async function checkCredentials(usuario: string, password: string) {
  const rows = await db()`
    SELECT id, password_hash FROM admins WHERE usuario = ${usuario.toLowerCase()} AND activo
  `;
  const ok = verifyPassword(password, rows[0]?.password_hash);
  return ok ? (rows[0].id as number) : null;
}

export async function createSession(adminId: number) {
  const token = randomToken();
  await db().transaction([
    db()`
      INSERT INTO sesiones_admin (admin_id, token_hash, vence_el)
      VALUES (${adminId}, ${sha256(token)}, now() + make_interval(hours => ${MAXIMO_HORAS}))
    `,
    db()`UPDATE admins SET ultimo_acceso = now() WHERE id = ${adminId}`,
  ]);
  return token;
}

// Valida la cookie y, si la sesión sigue viva, renueva su último uso. Una sola consulta:
// si la sesión venció, fue revocada, pasó el tiempo de inactividad o el admin está inactivo,
// no devuelve filas.
export async function getSession(token: string | undefined): Promise<Admin | null> {
  if (!token) return null;
  const rows = await db()`
    UPDATE sesiones_admin s SET ultimo_uso = now()
    FROM admins a
    WHERE s.admin_id = a.id
      AND s.token_hash = ${sha256(token)}
      AND s.revocada_el IS NULL
      AND s.vence_el > now()
      AND s.ultimo_uso > now() - make_interval(mins => ${INACTIVIDAD_MINUTOS})
      AND a.activo
    RETURNING a.id, a.usuario, a.nombre, s.id AS sesion_id
  `;
  if (!rows[0]) return null;
  const { id, usuario, nombre, sesion_id } = rows[0];
  return { id, usuario, nombre, sesionId: sesion_id, csrf: csrfToken(token) };
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;
  await db()`UPDATE sesiones_admin SET revocada_el = now() WHERE token_hash = ${sha256(token)} AND revocada_el IS NULL`;
}

// Token CSRF derivado de la sesión: no hace falta guardarlo y cambia con cada sesión.
export function csrfToken(sessionToken: string) {
  return hmac(`csrf:${sessionToken}`);
}

export function csrfValid(sessionToken: string, candidate: string | null | undefined) {
  return Boolean(candidate) && safeEqual(csrfToken(sessionToken), candidate!);
}

// Destino después del login: solo rutas internas del panel, para evitar redirecciones abiertas
// (por ejemplo ?next=https://otro-sitio.com o ?next=//otro-sitio.com).
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith('/admin') || next.startsWith('//') || next.includes('\\')) return '/admin';
  return next;
}

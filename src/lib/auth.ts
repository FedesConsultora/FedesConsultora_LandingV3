// Autenticación del panel /admin: un solo usuario, credenciales en variables de entorno.
// Contraseña guardada como scrypt (nunca en texto plano). Sesión: cookie firmada con HMAC,
// sin base de datos de sesiones ni librerías externas de JWT.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'fedes_admin_session';
const SESSION_HOURS = 12;

function secret() {
  const s = import.meta.env.SESSION_SECRET;
  if (!s) throw new Error('Falta SESSION_SECRET');
  return s;
}

export function isAdminConfigured() {
  return Boolean(import.meta.env.ADMIN_USER && import.meta.env.ADMIN_PASSWORD_HASH && import.meta.env.SESSION_SECRET);
}

export function verifyPassword(username: string, password: string): boolean {
  const expectedUser = import.meta.env.ADMIN_USER;
  const stored = import.meta.env.ADMIN_PASSWORD_HASH; // "salt:hash", ambos en hex
  if (!expectedUser || !stored) return false;

  // Comparación de usuario a tiempo constante, para no filtrar por timing si existe o no.
  const userOk = timingSafeEqual(
    Buffer.from(username.padEnd(64, '\0')),
    Buffer.from(expectedUser.padEnd(64, '\0')),
  );

  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, 'hex');
  const passOk = candidate.length === expected.length && timingSafeEqual(candidate, expected);

  return userOk && passOk;
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSessionToken(username: string): string {
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `${username}.${exp}.${randomBytes(8).toString('hex')}`;
  const payloadB64 = Buffer.from(payload).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return false;
  let expectedSig: string;
  try {
    expectedSig = sign(payloadB64);
  } catch {
    return false;
  }
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return false;

  const payload = Buffer.from(payloadB64, 'base64url').toString();
  const [, expStr] = payload.split('.');
  const exp = Number(expStr);
  return Number.isFinite(exp) && Date.now() < exp;
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = SESSION_HOURS * 60 * 60;

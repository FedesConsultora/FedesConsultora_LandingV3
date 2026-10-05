// Primitivas criptográficas compartidas por el panel y las landings privadas.
// Solo node:crypto, sin librerías externas.
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import { runtimeEnv } from './runtime-env';

export function sessionSecret() {
  const s = runtimeEnv('SESSION_SECRET');
  if (!s) throw new Error('Falta SESSION_SECRET');
  return s;
}

// Token aleatorio de 256 bits, apto para URL.
export function randomToken() {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function hmac(value: string, secret = sessionSecret()) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

// Comparación en tiempo constante. Si los largos difieren devuelve false sin comparar
// (el largo de un hash o de un HMAC no es secreto).
export function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// Contraseñas: scrypt con sal propia, guardado como "sal:hash" en hex.
// scripts/create-admin.mjs usa el mismo formato.
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

// Hash de relleno: cuando el usuario no existe se verifica igual contra este valor,
// para que el tiempo de respuesta no revele qué usuarios existen.
const DUMMY_HASH = hashPassword(randomToken());

export function verifyPassword(password: string, stored: string | null | undefined) {
  const [salt, hashHex] = (stored ?? DUMMY_HASH).split(':');
  if (!salt || !hashHex) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected) && stored != null;
}

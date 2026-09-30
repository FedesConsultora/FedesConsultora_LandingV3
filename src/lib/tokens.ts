// Tokens de las landings privadas (docs/09-portal-leads.md, 4.2 y 8).
// - El link lleva un token al azar de 256 bits.
// - La base busca solo por su hash SHA-256 (una copia de la base no alcanza para abrir landings
//   sin la clave), y además guarda una copia cifrada con AES-256-GCM para que el panel pueda
//   volver a mostrar el link y los mails puedan armarlo.
// - La clave (LANDING_TOKEN_KEY, 32 bytes en base64) vive solo en variables de entorno.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { randomToken, sha256 } from './seguridad';

const VERSION = 'v1';
const AAD = Buffer.from('fedes-landing-token');

function clave() {
  const raw = import.meta.env.LANDING_TOKEN_KEY;
  const key = raw ? Buffer.from(raw, 'base64') : null;
  if (!key || key.length !== 32) throw new Error('LANDING_TOKEN_KEY falta o no tiene 32 bytes en base64');
  return key;
}

export function cifrarToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', clave(), iv);
  cipher.setAAD(AAD);
  const cifrado = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), cifrado].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join(':');
}

export function descifrarToken(valor: string) {
  const [version, iv, tag, cifrado] = valor.split(':');
  if (version !== VERSION || !iv || !tag || !cifrado) throw new Error('Token cifrado con formato desconocido');
  const decipher = createDecipheriv('aes-256-gcm', clave(), Buffer.from(iv, 'base64url'));
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(cifrado, 'base64url')), decipher.final()]).toString('utf8');
}

export function nuevoToken() {
  const token = randomToken();
  return { token, hash: hashToken(token), cifrado: cifrarToken(token) };
}

export const hashToken = (token: string) => sha256(`landing:${token}`);

// Formato válido de un token: 43 caracteres base64url (256 bits). Todo lo demás se descarta
// antes de consultar la base.
export const formatoTokenValido = (token: string | undefined) => Boolean(token && /^[A-Za-z0-9_-]{43}$/.test(token));

export const rutaLanding = (token: string) => `/diagnostico/${token}`;

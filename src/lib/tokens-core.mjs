// Núcleo criptográfico de los tokens de landing, en JavaScript plano para que lo usen tanto el
// sitio (src/lib/tokens.ts, con la clave de runtime) como los scripts de Node
// (scripts/seed-demo.mjs, con la clave de process.env). Un solo lugar define el formato.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const AAD = Buffer.from('fedes-landing-token');

/** @param {string | undefined} raw clave en base64 (32 bytes) */
export function claveDesde(raw) {
  const key = raw ? Buffer.from(raw, 'base64') : null;
  if (!key || key.length !== 32) throw new Error('LANDING_TOKEN_KEY falta o no tiene 32 bytes en base64');
  return key;
}

/** Token al azar de 256 bits, apto para URL. */
export const tokenAlAzar = () => randomBytes(32).toString('base64url');

/** Hash con el que se busca la landing en la base. */
export const hashToken = (/** @type {string} */ token) => createHash('sha256').update(`landing:${token}`).digest('hex');

/** @param {string} token @param {Buffer} key */
export function cifrar(token, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(AAD);
  const datos = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), datos.toString('base64url')].join(':');
}

/** @param {string} valor @param {Buffer} key */
export function descifrar(valor, key) {
  const [version, iv, tag, datos] = valor.split(':');
  if (version !== VERSION || !iv || !tag || !datos) throw new Error('Token cifrado con formato desconocido');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(datos, 'base64url')), decipher.final()]).toString('utf8');
}

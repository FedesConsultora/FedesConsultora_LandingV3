// Tokens de las landings privadas (docs/09-portal-leads.md, 4.2 y 8).
// - El link lleva un token al azar de 256 bits.
// - La base busca solo por su hash SHA-256 (una copia de la base no alcanza para abrir landings
//   sin la clave), y además guarda una copia cifrada con AES-256-GCM para que el panel pueda
//   volver a mostrar el link y los mails puedan armarlo.
// - La clave (LANDING_TOKEN_KEY, 32 bytes en base64) vive solo en variables de entorno.
// El formato está en tokens-core.mjs, compartido con los scripts de Node.
import { claveDesde, cifrar, descifrar, hashToken, tokenAlAzar } from './tokens-core.mjs';

export { hashToken };

const clave = () => claveDesde(import.meta.env.LANDING_TOKEN_KEY);

export const cifrarToken = (token: string) => cifrar(token, clave());
export const descifrarToken = (valor: string) => descifrar(valor, clave());

export function nuevoToken() {
  const token = tokenAlAzar();
  return { token, hash: hashToken(token), cifrado: cifrarToken(token) };
}

// Formato válido de un token: 43 caracteres base64url (256 bits). Todo lo demás se descarta
// antes de consultar la base.
export const formatoTokenValido = (token: string | undefined) => Boolean(token && /^[A-Za-z0-9_-]{43}$/.test(token));

export const rutaLanding = (token: string) => `/diagnostico/${token}`;

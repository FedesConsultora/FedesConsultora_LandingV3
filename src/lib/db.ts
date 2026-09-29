// Conexión a Postgres (Neon, que reemplazó a Vercel Postgres). Se usa el cliente HTTP de Neon:
// una consulta por pedido, sin pool de conexiones que mantener abierto en funciones serverless.
// La cadena de conexión se lee de import.meta.env para que funcione igual en `astro dev` y en Vercel.
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | null = null;

export function hasDb() {
  return Boolean(import.meta.env.POSTGRES_URL);
}

export function db() {
  const url = import.meta.env.POSTGRES_URL;
  if (!url) throw new Error('Falta POSTGRES_URL');
  client ??= neon(url);
  return client;
}

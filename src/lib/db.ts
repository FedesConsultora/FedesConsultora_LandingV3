// Conexión a Postgres (Neon, que reemplazó a Vercel Postgres). Se usa el cliente HTTP de Neon:
// una consulta por pedido, sin pool persistente. La URL se resuelve en runtime desde astro:env/server.
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { runtimeEnv } from './runtime-env';

let client: NeonQueryFunction<false, false> | null = null;

export function hasDb() {
  return Boolean(runtimeEnv('POSTGRES_URL'));
}

export function db() {
  const url = runtimeEnv('POSTGRES_URL');
  if (!url) throw new Error('Falta POSTGRES_URL');
  client ??= neon(url);
  return client;
}

// Aplica las migraciones pendientes de db/migrations/, en orden por nombre (001_, 002_, ...).
// Cada migración se aplica en una transacción junto con su registro en schema_migrations:
// si una sentencia falla, no queda nada a medias y la migración sigue figurando como pendiente.
//
// Uso:
//   npm run db:migrate            aplica las pendientes
//   npm run db:migrate -- --dry-run   solo lista las pendientes, sin escribir nada en la base
//
// Requiere POSTGRES_URL (en .env, por ejemplo con `npx vercel env pull .env`).
// Regla: una migración ya aplicada no se edita. Cualquier cambio va en un archivo nuevo.
import { readdirSync, readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { splitSql } from './lib/split-sql.mjs';

const dryRun = process.argv.includes('--dry-run');
const dir = new URL('../db/migrations/', import.meta.url);

if (!process.env.POSTGRES_URL) {
  console.error('Falta POSTGRES_URL. Corré primero: npx vercel env pull .env');
  process.exit(1);
}
const sql = neon(process.env.POSTGRES_URL);

const files = readdirSync(dir)
  .filter((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f))
  .sort();

// En modo de prueba no se crea la tabla de control: si no existe, todas están pendientes.
const [{ existe }] = await sql`SELECT to_regclass('public.schema_migrations') IS NOT NULL AS existe`;
if (!existe && !dryRun) {
  await sql`
    CREATE TABLE schema_migrations (
      nombre TEXT PRIMARY KEY,
      aplicada_el TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}
const applied = new Set(existe ? (await sql`SELECT nombre FROM schema_migrations`).map((r) => r.nombre) : []);
const pending = files.filter((f) => !applied.has(f));

if (pending.length === 0) {
  console.log('No hay migraciones pendientes.');
  process.exit(0);
}

for (const file of pending) {
  const statements = splitSql(readFileSync(new URL(file, dir), 'utf8'));
  if (dryRun) {
    console.log(`Pendiente: ${file} (${statements.length} sentencias)`);
    continue;
  }
  await sql.transaction([
    ...statements.map((s) => sql.query(s)),
    sql`INSERT INTO schema_migrations (nombre) VALUES (${file})`,
  ]);
  console.log(`Aplicada: ${file}`);
}

if (dryRun) console.log('\nModo de prueba: no se escribió nada en la base.');

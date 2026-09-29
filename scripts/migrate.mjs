// Crea (o actualiza) las tablas del panel de administración.
// Requiere que POSTGRES_URL esté disponible (ej. corriendo `vercel env pull .env` antes).
// Uso: node scripts/migrate.mjs
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');

if (!process.env.POSTGRES_URL) {
  console.error('Falta POSTGRES_URL. Corré primero: npx vercel env pull .env');
  process.exit(1);
}
const sql = neon(process.env.POSTGRES_URL);

for (const statement of schema.split(';').map((s) => s.trim()).filter(Boolean)) {
  await sql.query(statement);
}
console.log('Migración aplicada: tabla "leads" lista.');

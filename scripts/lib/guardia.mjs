// Protección para los scripts que crean o borran datos (seed-demo, verificar-fase1):
// solo corren si la base tiene la tabla marcadora `marca_desarrollo`, que existe únicamente
// en la rama de desarrollo de Neon. La rama principal (producción) no la tiene, así que un
// .env que apunte a producción hace que el script se detenga sin tocar nada.
//
// Para marcar una base de desarrollo nueva (nunca la de producción), una sola vez:
//   CREATE TABLE marca_desarrollo (creada_el TIMESTAMPTZ NOT NULL DEFAULT now());
import { neon } from '@neondatabase/serverless';

export async function baseDeDesarrollo() {
  if (!process.env.POSTGRES_URL) {
    console.error('Falta POSTGRES_URL en el .env.');
    process.exit(1);
  }
  const sql = neon(process.env.POSTGRES_URL);
  const [{ marcada }] = await sql`SELECT to_regclass('public.marca_desarrollo') IS NOT NULL AS marcada`;
  if (!marcada) {
    console.error(
      `La base ${new URL(process.env.POSTGRES_URL).hostname} no está marcada como de desarrollo.\n` +
        'Este script crea y borra datos: solo corre sobre la rama de desarrollo. No se tocó nada.',
    );
    process.exit(1);
  }
  return sql;
}

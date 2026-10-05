// Protección para los scripts que crean o borran datos (seed-demo, verificar-fase1):
// solo corren si la base tiene la tabla marcadora `marca_desarrollo`, que existe únicamente
// en la rama de desarrollo de Neon. La rama principal (producción) no la tiene, así que un
// .env que apunte a producción hace que el script se detenga sin tocar nada.
//
// Para marcar una base de desarrollo nueva (nunca la de producción), una sola vez:
//   CREATE TABLE marca_desarrollo (creada_el TIMESTAMPTZ NOT NULL DEFAULT now());
import { neon } from '@neondatabase/serverless';

export function validarConfiguracionCI(env = process.env) {
  if (env.DATABASE_ENV !== 'ci') throw new Error('DATABASE_ENV debe ser exactamente ci.');
  if (!env.POSTGRES_URL) throw new Error('Falta la URL de la rama Neon CI.');
  if (env.RESEND_API_KEY) throw new Error('La integración CI no permite envío real por Resend.');
  const branchId = env.CI_NEON_BRANCH_ID;
  if (!branchId || !/^[a-z0-9][a-z0-9_-]{2,127}$/i.test(branchId) || branchId.toLowerCase() === 'main') {
    throw new Error('Falta un CI_NEON_BRANCH_ID válido y exclusivo.');
  }
  let url;
  try {
    url = new URL(env.POSTGRES_URL);
  } catch {
    throw new Error('La URL de la rama Neon CI no es válida.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) {
    throw new Error('La URL configurada no es una conexión PostgreSQL válida.');
  }
  return { branchId, connectionString: env.POSTGRES_URL };
}

// Esta marca vive sólo en la rama Neon exclusiva de integración. El branch ID debe coincidir
// exactamente con el valor configurado fuera de la base; el hostname por sí solo no es una guarda.
export async function baseDeCI(env = process.env) {
  const { branchId, connectionString } = validarConfiguracionCI(env);
  const sql = neon(connectionString);
  let marcas;
  try {
    marcas = await sql`SELECT entorno, branch_id FROM public.marca_ci ORDER BY branch_id LIMIT 2`;
  } catch {
    throw new Error('No se pudo verificar la marca de la rama Neon CI; no se ejecutó ninguna operación.');
  }
  if (marcas.length !== 1 || marcas[0].entorno !== 'ci' || marcas[0].branch_id !== branchId) {
    throw new Error('La marca de la base no coincide con CI_NEON_BRANCH_ID; no se ejecutó ninguna operación.');
  }
  return sql;
}

export async function baseDeDesarrollo() {
  if (process.env.DATABASE_ENV === 'ci') return baseDeCI();
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

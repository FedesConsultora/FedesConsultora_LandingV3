// Borra o anonimiza los datos personales vencidos según la Política de Privacidad (24 meses).
// Las reglas están en scripts/lib/depuracion.mjs.
//
// Uso:
//   npm run db:depurar                 aplica la depuración
//   npm run db:depurar -- --dry-run    solo cuenta lo que se borraría, sin escribir nada
//
// En producción corre una vez por día desde el cron del VPS (docs/OPERATIONS.md).
// Requiere POSTGRES_URL en el entorno (o en .env para desarrollo local).
import { neon } from '@neondatabase/serverless';
import { depurar, MESES } from './lib/depuracion.mjs';

const dryRun = process.argv.includes('--dry-run');

if (!process.env.POSTGRES_URL) {
  console.error('Falta POSTGRES_URL. Cargá la variable del entorno o un .env local seguro.');
  process.exit(1);
}

const resumen = await depurar(neon(process.env.POSTGRES_URL), { dryRun });
// Solo cantidades: nunca se imprimen datos de los leads.
console.log(JSON.stringify({ event: dryRun ? 'depuracion_simulada' : 'depuracion', meses: MESES, ...resumen }));

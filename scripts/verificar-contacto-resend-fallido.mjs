import { randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { baseDeCI } from './lib/guardia.mjs';

await baseDeCI();
const sql = neon(process.env.POSTGRES_URL);
const email = `ci-contact-${randomBytes(12).toString('hex')}@example.test`;
const base = process.env.VERIFICAR_URL || 'http://127.0.0.1:4322';
let response;

try {
  response = await fetch(`${base}/api/contacto`, {
    method: 'POST',
    headers: { Origin: base },
    body: new URLSearchParams({
      nombre: 'Release integration',
      empresa: 'Synthetic test',
      email,
      tamano: 'Hasta 10 empleados',
      resolver: 'Tecnología',
      privacidad: 'on',
    }),
  });
  const body = await response.json().catch(() => null);
  const [stored] = await sql`
    SELECT l.id, f.resend_status
    FROM leads l JOIN formularios f ON f.lead_id = l.id
    WHERE lower(l.email) = lower(${email})
    ORDER BY f.id DESC LIMIT 1
  `;
  if (response.status !== 200 || body?.ok !== true || !stored?.id || stored.resend_status !== 'failed') {
    throw new Error('El contacto no quedó persistido con el estado de aviso fallido esperado.');
  }
  console.log('OK   contacto persistido aunque el mock local de Resend devuelve error; respuesta HTTP de éxito conserva el lead.');
} finally {
  await sql`DELETE FROM leads WHERE lower(email) = lower(${email})`;
}

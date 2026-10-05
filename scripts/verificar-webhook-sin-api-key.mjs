import { randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { Webhook } from 'standardwebhooks';
import { baseDeCI } from './lib/guardia.mjs';

await baseDeCI();
if (process.env.RESEND_API_KEY) {
  console.error('Esta prueba exige RESEND_API_KEY vacío.');
  process.exit(1);
}

const sql = neon(process.env.POSTGRES_URL);
const base = process.env.VERIFICAR_URL || 'http://127.0.0.1:4322';
const eventId = `ci_no_key_${randomBytes(12).toString('hex')}`;
const emailId = `ci_email_no_key_${randomBytes(12).toString('hex')}`;
const payload = JSON.stringify({
  type: 'email.received',
  created_at: new Date().toISOString(),
  data: {
    email_id: emailId,
    from: 'release-test@example.test',
    to: ['info@fedesconsultora.com'],
    received_for: [],
    subject: 'Synthetic message without provider API',
    message_id: `<${eventId}@example.test>`,
    attachments: [],
  },
});

const timestamp = new Date();
const signature = new Webhook(process.env.RESEND_WEBHOOK_SECRET).sign(eventId, timestamp, payload);

try {
  const response = await fetch(`${base}/api/webhooks/resend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'svix-id': eventId,
      'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
      'svix-signature': signature,
    },
    body: payload,
  });
  const [event] = await sql`
    SELECT estado, error_code FROM resend_webhook_events WHERE event_id = ${eventId}
  `;
  const [received] = await sql`
    SELECT count(*)::int AS n FROM mensajes_recibidos WHERE resend_id = ${emailId}
  `;
  if (response.status !== 503 || event?.estado !== 'failed' || event?.error_code !== 'provider' || received?.n !== 0) {
    throw new Error('Un email.received sin API key debe quedar reintentable y no persistir un mensaje vacío.');
  }
  console.log('OK   email.received sin RESEND_API_KEY devuelve 503, queda failed y no pierde el cuerpo.');
} finally {
  await sql`DELETE FROM mensajes_recibidos WHERE resend_id = ${emailId}`;
  await sql`DELETE FROM resend_webhook_events WHERE event_id = ${eventId}`;
}

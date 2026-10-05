import { createHash, randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { Webhook } from 'standardwebhooks';
import { baseDeCI } from './lib/guardia.mjs';

await baseDeCI();
const sql = neon(process.env.POSTGRES_URL);
const eventId = `ci_event_${randomBytes(12).toString('hex')}`;
const expiredEventId = `ci_expired_${randomBytes(12).toString('hex')}`;
const resendId = `ci_email_${randomBytes(12).toString('hex')}`;
const bases = (process.env.VERIFICAR_URLS || process.env.VERIFICAR_URL || 'http://127.0.0.1:4322').split(',').map((v) => v.trim());
const data = {
  email_id: resendId,
  from: 'release-test@example.test',
  to: ['info@fedesconsultora.com'],
  received_for: [],
  subject: 'Resend CI mock test',
  message_id: `<${eventId}@example.test>`,
  attachments: [],
};
const payload = JSON.stringify({ type: 'email.received', created_at: new Date().toISOString(), data });
const firmar = (id, body) => {
  const ts = new Date();
  const signature = new Webhook(process.env.RESEND_WEBHOOK_SECRET).sign(id, ts, body);
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'svix-id': id,
      'svix-timestamp': String(Math.floor(ts.getTime() / 1000)),
      'svix-signature': signature,
    },
    body,
  };
};
const deliver = (id, body, index = 0) => fetch(`${bases[index % bases.length]}/api/webhooks/resend`, firmar(id, body));
const check = (name, ok) => {
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${name}`);
  if (!ok) throw new Error(`Falló la verificación: ${name}`);
};

try {
  const expiredPayload = JSON.stringify({ type: 'email.delivered', data: { email_id: `unknown_${expiredEventId}` } });
  await sql`INSERT INTO resend_webhook_events (event_id, event_type, resend_email_id, estado, intentos, lease_until)
    VALUES (${expiredEventId}, 'email.delivered', ${`unknown_${expiredEventId}`}, 'processing', 1, now() - interval '1 minute')`;
  const leaseContenders = await Promise.all([
    deliver(expiredEventId, expiredPayload, 0),
    deliver(expiredEventId, expiredPayload, 1),
  ]);
  const [lease] = await sql`SELECT estado, intentos FROM resend_webhook_events WHERE event_id = ${expiredEventId}`;
  check('dos Node workers compiten por un lease expirado y sólo uno lo reclama',
    leaseContenders.every((response) => [200, 503].includes(response.status)) && lease?.estado === 'done' && lease.intentos === 2);

  const concurrent = await Promise.all([deliver(eventId, payload, 0), deliver(eventId, payload, 1)]);
  const retry = await deliver(eventId, payload, 0);
  const replay = await deliver(eventId, payload, 1);
  const [event] = await sql`SELECT estado, intentos FROM resend_webhook_events WHERE event_id = ${eventId}`;
  const received = await sql`SELECT count(*)::int AS n FROM mensajes_recibidos WHERE resend_id = ${resendId}`;
  check('dos entregas concurrentes más retry y replay terminan con un solo evento procesado',
    concurrent.every((response) => [200, 503].includes(response.status)) &&
    retry.status === 200 && replay.status === 200 && event?.estado === 'done' && event.intentos === 2 && received[0].n === 1);

  const unsigned = await fetch(`${bases[0]}/api/webhooks/resend`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'svix-id': `bad_${eventId}`, 'svix-timestamp': String(Math.floor(Date.now() / 1000)), 'svix-signature': 'v1,invalid' }, body: payload,
  });
  const [unsignedRow] = await sql`SELECT event_id FROM resend_webhook_events WHERE event_id = ${`bad_${eventId}`}`;
  check('firma inválida se rechaza sin persistir efectos', unsigned.status === 401 && !unsignedRow);
  console.log(`Webhook CI de prueba ${createHash('sha256').update(eventId).digest('hex').slice(0, 12)} verificado; no se registran payloads ni direcciones.`);
} finally {
  await sql`DELETE FROM mensajes_recibidos WHERE resend_id = ${resendId}`;
  await sql`DELETE FROM resend_webhook_events WHERE event_id = ${eventId}`;
  await sql`DELETE FROM resend_webhook_events WHERE event_id = ${expiredEventId}`;
}

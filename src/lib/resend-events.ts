import { db } from './db';

export type WebhookClaim = 'claimed' | 'done' | 'busy';

// Una clave con lease impide que dos entregas simultáneas apliquen efectos internos. Si el
// proceso cae, la entrega puede reclamarse al vencer el lease; Resend retries/replays conservan
// su event ID, que también se usa como Idempotency-Key al reenviar una respuesta.
export async function claimResendEvent(eventId: string, eventType: string, emailId: string | null): Promise<WebhookClaim> {
  const claimed = await db()`
    INSERT INTO resend_webhook_events (event_id, event_type, resend_email_id, estado, lease_until)
    VALUES (${eventId}, ${eventType}, ${emailId}, 'processing', now() + interval '10 minutes')
    ON CONFLICT (event_id) DO UPDATE SET
      event_type = EXCLUDED.event_type,
      resend_email_id = COALESCE(EXCLUDED.resend_email_id, resend_webhook_events.resend_email_id),
      estado = 'processing',
      intentos = resend_webhook_events.intentos + 1,
      lease_until = now() + interval '10 minutes',
      error_code = NULL
    WHERE resend_webhook_events.estado = 'failed'
       OR (resend_webhook_events.estado = 'processing' AND resend_webhook_events.lease_until <= now())
    RETURNING event_id
  `;
  if (claimed.length) return 'claimed';
  const [existing] = await db()`SELECT estado FROM resend_webhook_events WHERE event_id = ${eventId}`;
  return existing?.estado === 'done' ? 'done' : 'busy';
}

export async function completeResendEvent(eventId: string) {
  await db()`
    UPDATE resend_webhook_events
    SET estado = 'done', completado_el = now(), lease_until = now(), error_code = NULL
    WHERE event_id = ${eventId} AND estado = 'processing'
  `;
}

export async function failResendEvent(eventId: string, code: 'provider' | 'database' | 'processing') {
  await db()`
    UPDATE resend_webhook_events
    SET estado = 'failed', lease_until = now(), error_code = ${code}
    WHERE event_id = ${eventId} AND estado = 'processing'
  `;
}

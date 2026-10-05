-- 008: registro durable e idempotente de entregas de webhooks de Resend.
-- No guardar el payload: email.received puede contener datos personales.
CREATE TABLE resend_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  resend_email_id TEXT,
  estado TEXT NOT NULL CHECK (estado IN ('processing', 'failed', 'done')),
  intentos INTEGER NOT NULL DEFAULT 1 CHECK (intentos > 0),
  lease_until TIMESTAMPTZ NOT NULL,
  error_code TEXT,
  recibido_el TIMESTAMPTZ NOT NULL DEFAULT now(),
  completado_el TIMESTAMPTZ
);

CREATE INDEX resend_webhook_events_lease_idx
  ON resend_webhook_events (lease_until)
  WHERE estado IN ('processing', 'failed');

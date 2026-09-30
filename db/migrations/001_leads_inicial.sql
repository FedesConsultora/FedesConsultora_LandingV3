-- 001: esquema inicial del panel, tal como estaba en db/schema.sql antes del sistema de migraciones.
-- Cada envío del formulario de Contacto se guarda en `leads`, independientemente de si el mail de
-- Resend se pudo enviar o no. Es idempotente: en la base que ya tiene la tabla no cambia nada.

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nombre TEXT NOT NULL,
  empresa TEXT NOT NULL,
  cargo TEXT, -- opcional desde el 29/09: se sacó del formulario para achicarlo
  email TEXT NOT NULL,
  whatsapp TEXT, -- opcional desde el 29/09: se sacó del formulario para achicarlo
  tamano TEXT,
  resolver TEXT NOT NULL,
  ruta_referido TEXT, -- si llegó con "?ruta=" desde Onboardings/Consultoría, antes de elegir en el selector
  comentarios TEXT,
  resend_status TEXT NOT NULL DEFAULT 'skipped' -- 'sent' | 'failed' | 'skipped' (sin RESEND_API_KEY)
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);

-- Si la tabla ya existía con cargo/whatsapp obligatorios (versión anterior), se relajan acá.
-- Seguro de correr de nuevo: si ya son nullable, no hace nada.
ALTER TABLE leads ALTER COLUMN cargo DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN whatsapp DROP NOT NULL;

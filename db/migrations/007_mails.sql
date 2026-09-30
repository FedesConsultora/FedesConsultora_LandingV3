-- 007: mails desde el panel (fase 2, docs/09-portal-leads.md sección 7).

-- Plantillas editables. Editar una plantilla le quita la aprobación; los mails automáticos
-- solo usan plantillas aprobadas.
CREATE TABLE plantillas_mail (
  id SERIAL PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE, -- 'entrega' | 'nueva_etapa' | 'seguimiento' | ...
  nombre TEXT NOT NULL,
  uso TEXT NOT NULL CHECK (uso IN ('automatico', 'manual')),
  asunto TEXT NOT NULL,
  cuerpo TEXT NOT NULL, -- texto con variables {{nombre}}, {{empresa}}, {{link_landing}}, {{link_agendar}}, {{etapas}}
  aprobada BOOLEAN NOT NULL DEFAULT false,
  aprobada_por INTEGER REFERENCES admins (id) ON DELETE SET NULL,
  aprobada_el TIMESTAMPTZ,
  actualizada_el TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Los textos no están definidos todavía: nacen con marcadores y sin aprobar. Mientras un texto
-- tenga "[PENDIENTE]" no sale ningún mail real (src/lib/mails.ts).
INSERT INTO plantillas_mail (clave, nombre, uso, asunto, cuerpo) VALUES
  ('entrega', 'Entrega de la landing', 'automatico',
   '[PENDIENTE] Asunto del mail de entrega',
   E'Hola, {{nombre}}:\n\n[PENDIENTE] Texto del mail de entrega de la landing.\n\n{{link_landing}}'),
  ('nueva_etapa', 'Nueva etapa disponible', 'automatico',
   '[PENDIENTE] Asunto del mail de nueva etapa',
   E'Hola, {{nombre}}:\n\n[PENDIENTE] Texto del mail de nueva etapa disponible: {{etapas}}.\n\n{{link_landing}}'),
  ('seguimiento', 'Seguimiento', 'manual',
   '[PENDIENTE] Asunto del mail de seguimiento',
   E'Hola, {{nombre}}:\n\n[PENDIENTE] Texto del mail de seguimiento.');

-- Cada mail enviado (o simulado) desde el sistema.
CREATE TABLE envios (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  landing_id INTEGER REFERENCES landings (id) ON DELETE SET NULL,
  -- Hash del token de la landing al enviar: los links del mail llevan a la landing solo si el
  -- link sigue siendo el mismo (generar un link nuevo también anula los mails viejos).
  landing_token_hash TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('manual', 'automatico', 'respuesta')),
  plantilla_id INTEGER REFERENCES plantillas_mail (id) ON DELETE SET NULL,
  responde_a INTEGER, -- mensajes_recibidos.id, si es una respuesta
  para TEXT NOT NULL,
  asunto TEXT NOT NULL,
  cuerpo TEXT NOT NULL, -- texto tal como salió (sin las URLs de seguimiento)
  admin_id INTEGER REFERENCES admins (id) ON DELETE SET NULL, -- nulo si fue automático
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'simulado', 'enviado', 'entregado', 'rebotado', 'spam', 'fallido')),
  resend_id TEXT UNIQUE,
  error TEXT,
  creado_el TIMESTAMPTZ NOT NULL DEFAULT now(),
  entregado_el TIMESTAMPTZ,
  abierto_el TIMESTAMPTZ, -- primera apertura (aproximada)
  clic_el TIMESTAMPTZ -- primer clic
);

CREATE INDEX envios_lead_idx ON envios (lead_id, creado_el DESC);

-- Respuestas de los leads (y cualquier mail que llegue a la dirección de respuestas).
CREATE TABLE mensajes_recibidos (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads (id) ON DELETE CASCADE, -- nulo si no se pudo asociar
  envio_id INTEGER REFERENCES envios (id) ON DELETE SET NULL,
  resend_id TEXT NOT NULL UNIQUE, -- evita duplicados si el webhook llega dos veces
  message_id TEXT,
  de TEXT NOT NULL,
  asunto TEXT NOT NULL,
  cuerpo TEXT NOT NULL, -- solo texto: el HTML recibido nunca se muestra
  adjuntos JSONB NOT NULL DEFAULT '[]', -- nombre y tamaño; los archivos quedan en Resend
  recibido_el TIMESTAMPTZ NOT NULL DEFAULT now(),
  leido_el TIMESTAMPTZ,
  leido_por INTEGER REFERENCES admins (id) ON DELETE SET NULL
);

CREATE INDEX mensajes_recibidos_lead_idx ON mensajes_recibidos (lead_id, recibido_el DESC);
CREATE INDEX mensajes_recibidos_no_leidos_idx ON mensajes_recibidos (recibido_el DESC) WHERE leido_el IS NULL;

-- Rebote permanente: el lead no recibe más mails (igual que una baja).
ALTER TABLE leads ADD COLUMN rebote_el TIMESTAMPTZ;

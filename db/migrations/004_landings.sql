-- 004: landings privadas por prospecto, sus etapas, la plantilla de etapas y los eventos de visita.
-- docs/09-portal-leads.md, secciones 4.2, 4.3, 4.9 y 5.

CREATE TABLE landings (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  -- El link se busca solo por el hash (SHA-256). La copia cifrada (AES-256-GCM, clave en
  -- LANDING_TOKEN_KEY) permite volver a mostrar el link en el panel y armarlo en los mails.
  token_hash TEXT NOT NULL UNIQUE,
  token_cifrado TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'activa', 'revocada')), -- "vencida" se deriva de vence_el
  entregada_el TIMESTAMPTZ, -- primera activación; base de los desbloqueos programados
  vence_el TIMESTAMPTZ,
  creada_el TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizada_el TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX landings_lead_idx ON landings (lead_id);

CREATE TABLE etapas (
  id SERIAL PRIMARY KEY,
  landing_id INTEGER NOT NULL REFERENCES landings (id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  contenido JSONB NOT NULL DEFAULT '[]', -- lista de bloques (src/lib/bloques.ts), nunca HTML
  estado TEXT NOT NULL DEFAULT 'bloqueada' CHECK (estado IN ('bloqueada', 'desbloqueada')),
  modo_desbloqueo TEXT NOT NULL DEFAULT 'manual' CHECK (modo_desbloqueo IN ('al_entregar', 'manual', 'programado')),
  dias_desde_entrega INTEGER CHECK (dias_desde_entrega IS NULL OR dias_desde_entrega >= 0), -- modo programado (fase 3)
  desbloqueada_el TIMESTAMPTZ,
  aprobada BOOLEAN NOT NULL DEFAULT false,
  aprobada_por INTEGER REFERENCES admins (id) ON DELETE SET NULL,
  aprobada_el TIMESTAMPTZ,
  enviar_mail BOOLEAN NOT NULL DEFAULT true, -- mail automático al desbloquear (fase 2)
  version INTEGER NOT NULL DEFAULT 0, -- sube con cada edición: evita que dos personas se pisen los cambios
  actualizada_el TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Una etapa no puede estar desbloqueada si no está aprobada.
  CONSTRAINT etapas_desbloqueada_aprobada_check CHECK (estado = 'bloqueada' OR aprobada),
  -- Diferida para poder intercambiar el orden de dos etapas en una misma transacción.
  CONSTRAINT etapas_orden_unico UNIQUE (landing_id, orden) DEFERRABLE INITIALLY DEFERRED
);

-- Plantilla de etapas con la que nace cada landing. Editable por el administrador (pantalla en la fase 3).
CREATE TABLE plantilla_etapas (
  id SERIAL PRIMARY KEY,
  orden INTEGER NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  modo_desbloqueo TEXT NOT NULL CHECK (modo_desbloqueo IN ('al_entregar', 'manual', 'programado')),
  contenido JSONB NOT NULL DEFAULT '[]'
);

-- Plantilla inicial (docs/09-portal-leads.md, sección 5): lo primero que ve el lead son los
-- resultados y la ruta sugerida. El contenido lo escribe el equipo para cada prospecto.
INSERT INTO plantilla_etapas (orden, titulo, modo_desbloqueo) VALUES
  (1, 'Resultados del diagnóstico', 'al_entregar'),
  (2, 'Ruta y onboardings sugeridos', 'al_entregar'),
  (3, 'Caso anónimo del sector', 'manual'),
  (4, 'Hoja de ruta y próximos pasos', 'manual');

-- Actividad del lead en su landing. Sin IP en claro: `visitante` es un HMAC (IP y navegador)
-- que solo sirve para no contar dos veces la misma visita.
CREATE TABLE eventos (
  id BIGSERIAL PRIMARY KEY,
  landing_id INTEGER NOT NULL REFERENCES landings (id) ON DELETE CASCADE,
  etapa_id INTEGER REFERENCES etapas (id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('visita', 'apertura_etapa', 'clic_agendar', 'clic_whatsapp', 'descarga', 'apertura_mail', 'clic_mail', 'baja')),
  visitante TEXT,
  duracion_seg INTEGER,
  creado_el TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX eventos_landing_idx ON eventos (landing_id, tipo, creado_el DESC);

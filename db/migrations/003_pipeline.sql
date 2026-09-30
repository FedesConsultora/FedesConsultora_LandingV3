-- 003: pipeline de leads.
-- `leads` pasa a ser un lead por persona (único por email), con los campos del pipeline.
-- Cada envío del formulario de Contacto se guarda aparte, en `formularios`, así un lead que
-- completa el formulario más de una vez conserva todos sus envíos.
-- Códigos de estado, fuente, tamaño y motivo: src/lib/pipeline.ts (etiquetas para el panel).

-- Sectores: lista controlada, editable por el administrador (docs/09-portal-leads.md, 4.6).
CREATE TABLE sectores (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO sectores (nombre, orden) VALUES
  ('Sanidad animal y veterinaria', 1),
  ('Distribución mayorista', 2),
  ('Laboratorios y farma', 3),
  ('Alimentos y bebidas', 4),
  ('Industria y manufactura', 5),
  ('Retail', 6),
  ('Salud', 7),
  ('Energía', 8),
  ('Comercio exterior y logística', 9),
  ('Otros', 10);

-- Envíos del formulario de Contacto, tal como llegaron.
CREATE TABLE formularios (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nombre TEXT NOT NULL,
  empresa TEXT NOT NULL,
  email TEXT NOT NULL,
  cargo TEXT,
  whatsapp TEXT,
  tamano TEXT, -- texto del formulario, sin normalizar
  resolver TEXT,
  ruta_referido TEXT,
  comentarios TEXT,
  resend_status TEXT -- 'sent' | 'failed' | 'skipped'
);

CREATE INDEX formularios_lead_idx ON formularios (lead_id, created_at DESC);

-- Hasta ahora cada fila de `leads` era un envío del formulario: se copian todas a `formularios`.
INSERT INTO formularios (lead_id, created_at, nombre, empresa, email, cargo, whatsapp, tamano, resolver, ruta_referido, comentarios, resend_status)
SELECT id, created_at, nombre, empresa, email, cargo, whatsapp, tamano, resolver, ruta_referido, comentarios, resend_status
FROM leads;

-- Fusión de leads con el mismo email: se conserva el más antiguo (primer contacto), con los
-- datos del envío más reciente, y sus envíos pasan a apuntar a él. Ningún envío se pierde.
UPDATE formularios f SET lead_id = k.conservar
FROM (SELECT id, min(id) OVER (PARTITION BY lower(email)) AS conservar FROM leads) k
WHERE f.lead_id = k.id AND k.id <> k.conservar;

UPDATE leads l
SET nombre = f.nombre, empresa = f.empresa, tamano = COALESCE(f.tamano, l.tamano),
    resolver = f.resolver, ruta_referido = f.ruta_referido
FROM (SELECT DISTINCT ON (lead_id) * FROM formularios ORDER BY lead_id, created_at DESC) f
WHERE f.lead_id = l.id;

DELETE FROM leads l USING leads k WHERE lower(l.email) = lower(k.email) AND l.id > k.id;

-- Campos del pipeline. Los leads cargados a mano pueden no tener email ni "qué quiere resolver".
ALTER TABLE leads ALTER COLUMN email DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN resolver DROP NOT NULL;
-- El estado del mail de aviso ahora vive en `formularios`. La columna queda por compatibilidad.
ALTER TABLE leads ALTER COLUMN resend_status DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN resend_status DROP DEFAULT;

ALTER TABLE leads ADD COLUMN sitio_web TEXT;
ALTER TABLE leads ADD COLUMN pais TEXT;
ALTER TABLE leads ADD COLUMN ciudad TEXT;
ALTER TABLE leads ADD COLUMN sector_id INTEGER REFERENCES sectores (id);
ALTER TABLE leads ADD COLUMN linkedin_url TEXT;
ALTER TABLE leads ADD COLUMN fuente TEXT;
ALTER TABLE leads ADD COLUMN estado TEXT;
ALTER TABLE leads ADD COLUMN motivo_perdido TEXT;
ALTER TABLE leads ADD COLUMN fecha_sesion TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN notas TEXT;
ALTER TABLE leads ADD COLUMN proximo_paso TEXT;
ALTER TABLE leads ADD COLUMN fecha_proximo_paso DATE;
ALTER TABLE leads ADD COLUMN consentimiento_el TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN consentimiento_origen TEXT;
ALTER TABLE leads ADD COLUMN consentimiento_texto TEXT;
ALTER TABLE leads ADD COLUMN baja_el TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN actualizado_el TIMESTAMPTZ NOT NULL DEFAULT now();

-- Todos los leads existentes llegaron por el formulario web, aceptando la Política de Privacidad.
UPDATE leads SET
  fuente = 'web',
  estado = 'respondio',
  consentimiento_el = created_at,
  consentimiento_origen = 'Formulario de Contacto de la web',
  consentimiento_texto = 'Acepto la Política de Privacidad',
  actualizado_el = created_at;

UPDATE leads SET email = NULL WHERE email = '';

-- Tamaño: del texto del formulario al rango normalizado.
UPDATE leads SET tamano = CASE tamano
  WHEN 'Hasta 10 empleados' THEN '1-10'
  WHEN '11 a 50 empleados' THEN '11-50'
  WHEN '51 a 200 empleados' THEN '51-200'
  WHEN '201 a 500 empleados' THEN '201-500'
  WHEN 'Más de 500 empleados' THEN '500+'
  ELSE 'desconocido'
END;

ALTER TABLE leads ALTER COLUMN tamano SET DEFAULT 'desconocido';
ALTER TABLE leads ALTER COLUMN tamano SET NOT NULL;
ALTER TABLE leads ALTER COLUMN fuente SET NOT NULL;
ALTER TABLE leads ALTER COLUMN estado SET NOT NULL;
ALTER TABLE leads ALTER COLUMN estado SET DEFAULT 'identificado';

ALTER TABLE leads ADD CONSTRAINT leads_tamano_check
  CHECK (tamano IN ('1-10', '11-50', '51-200', '201-500', '500+', 'desconocido'));
ALTER TABLE leads ADD CONSTRAINT leads_fuente_check
  CHECK (fuente IN ('linkedin', 'recomendacion', 'contenido_entrante', 'web', 'evento', 'otro'));
ALTER TABLE leads ADD CONSTRAINT leads_estado_check
  CHECK (estado IN ('identificado', 'contactado', 'respondio', 'agendo', 'sesion_realizada', 'propuesta', 'onboarding', 'perdido'));
ALTER TABLE leads ADD CONSTRAINT leads_motivo_perdido_check
  CHECK (motivo_perdido IS NULL OR motivo_perdido IN ('sin_presupuesto', 'sin_necesidad', 'eligio_otra', 'sin_respuesta', 'no_es_perfil', 'otro'));
ALTER TABLE leads ADD CONSTRAINT leads_perdido_con_motivo_check
  CHECK (estado <> 'perdido' OR motivo_perdido IS NOT NULL);

CREATE UNIQUE INDEX leads_email_unico ON leads (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX leads_estado_idx ON leads (estado, actualizado_el DESC);

-- Historial de estados: cada cambio, con fecha y usuario (admin_id nulo = lo hizo el sistema).
CREATE TABLE historial_estados (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  motivo_perdido TEXT,
  admin_id INTEGER REFERENCES admins (id) ON DELETE SET NULL,
  origen TEXT NOT NULL, -- 'panel' | 'formulario web'
  creado_el TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX historial_estados_lead_idx ON historial_estados (lead_id, creado_el DESC);

INSERT INTO historial_estados (lead_id, estado_anterior, estado_nuevo, origen, creado_el)
SELECT id, NULL, 'respondio', 'formulario web', created_at FROM leads;

-- Registro de auditoría de acciones sensibles. `detalle` no guarda datos personales
-- (por ejemplo, los nombres de los campos que cambiaron, no sus valores).
CREATE TABLE auditoria (
  id BIGSERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins (id) ON DELETE SET NULL,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id INTEGER,
  detalle JSONB,
  creado_el TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX auditoria_entidad_idx ON auditoria (entidad, entidad_id, creado_el DESC);

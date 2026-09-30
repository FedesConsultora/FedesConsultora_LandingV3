-- 002: usuarios del panel, sesiones y límite de intentos.
-- Reemplaza al usuario único que vivía en variables de entorno (ADMIN_USER / ADMIN_PASSWORD_HASH),
-- para que cada persona tenga su usuario y el historial registre quién hizo cada acción.

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  usuario TEXT NOT NULL UNIQUE, -- siempre en minúsculas
  nombre TEXT NOT NULL,
  password_hash TEXT NOT NULL, -- scrypt, "salt:hash" en hex. Nunca la contraseña en texto plano
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_el TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_acceso TIMESTAMPTZ
);

-- Sesiones del panel. La cookie lleva un token al azar; acá se guarda solo su hash (SHA-256),
-- así una copia de la base no permite entrar al panel. Se revocan al cerrar sesión.
CREATE TABLE IF NOT EXISTS sesiones_admin (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  creada_el TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_uso TIMESTAMPTZ NOT NULL DEFAULT now(), -- para el cierre por inactividad
  vence_el TIMESTAMPTZ NOT NULL, -- máximo absoluto de la sesión
  revocada_el TIMESTAMPTZ
);

-- Intentos fallidos, para limitar la tasa por IP (login del panel y tokens de landing).
-- La IP no se guarda en claro: `clave` es un HMAC de la IP con SESSION_SECRET.
CREATE TABLE IF NOT EXISTS intentos (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'login' | 'token'
  clave TEXT NOT NULL,
  creado_el TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intentos_tipo_clave_idx ON intentos (tipo, clave, creado_el DESC);

import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { baseDeCI } from './lib/guardia.mjs';

const requeridas = ['CI_NEON_POSTGRES_URL', 'CI_NEON_BRANCH_ID', 'CI_SESSION_SECRET', 'CI_LANDING_TOKEN_KEY', 'CI_RESEND_WEBHOOK_SECRET'];
const faltantes = requeridas.filter((key) => !process.env[key]);
if (faltantes.length) {
  console.error(`Faltan secretos de integración: ${faltantes.join(', ')}.`);
  process.exit(1);
}
if (process.env.DATABASE_ENV !== 'ci') {
  console.error('DATABASE_ENV debe estar configurada exactamente como ci.');
  process.exit(1);
}
if (process.env.RESEND_API_KEY) {
  console.error('La verificación de integración exige que RESEND_API_KEY esté vacío para impedir correos reales.');
  process.exit(1);
}

process.env.POSTGRES_URL = process.env.CI_NEON_POSTGRES_URL;
process.env.SESSION_SECRET = process.env.CI_SESSION_SECRET;
process.env.LANDING_TOKEN_KEY = process.env.CI_LANDING_TOKEN_KEY;
process.env.RESEND_WEBHOOK_SECRET = process.env.CI_RESEND_WEBHOOK_SECRET;
process.env.RESEND_API_KEY = '';
process.env.DATABASE_ENV = 'ci';

// Exige marca_ci(entorno='ci', branch_id=<CI_NEON_BRANCH_ID>) antes de migrar o tocar fixtures.
const sqlCI = await baseDeCI();

const correr = (cmd, args, env = process.env) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', env });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} falló.`);
};

let servidor;
let servidorParalelo;
let mockResend;
const base = 'http://127.0.0.1:4322';
process.env.SMOKE_BASE = base;
process.env.VERIFICAR_URL = base;

function arrancarServidor(port = 4322, overrides = {}) {
  const child = spawn(process.execPath, ['./dist/server/entry.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), NODE_ENV: 'production', ...overrides },
  });
  const timer = setTimeout(() => {
    if (child.exitCode === null) child.kill('SIGKILL');
  }, 240_000);
  return { child, timer };
}

async function esperarServidor(child, targetBase = base) {
  for (let i = 0; i < 40; i++) {
    if (child.exitCode !== null) throw new Error('El servidor terminó antes del healthcheck.');
    try {
      const response = await fetch(`${targetBase}/api/health`);
      if (response.ok) return;
    } catch {}
    await delay(500);
  }
  throw new Error('El servidor no quedó healthy dentro de 20 segundos.');
}

async function detenerServidor(instance) {
  if (!instance) return;
  clearTimeout(instance.timer);
  const child = instance.child;
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    let timeout;
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      new Promise((resolve) => {
        timeout = setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 20_000);
      }),
    ]);
    clearTimeout(timeout);
  }
}

function iniciarMockResend() {
  const intentos = new Map();
  const efectosAceptados = new Set();
  let fallosContacto = 0;
  let origin;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/raw' && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'message/rfc822' });
      response.end('From: release-test@example.test\r\nTo: info@fedesconsultora.com\r\nSubject: Resend CI mock test\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nSynthetic integration message.');
      return;
    }
    if (request.headers.authorization !== 'Bearer re_ci_fake_only') {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end('{"message":"unauthorized"}');
      return;
    }
    if (request.method === 'GET' && /^\/emails\/receiving\//.test(url.pathname)) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        id: url.pathname.split('/').at(-1),
        from: 'release-test@example.test',
        to: ['info@fedesconsultora.com'],
        subject: 'Resend CI mock test',
        text: 'Synthetic integration message.',
        message_id: '<release-test@example.test>',
        raw: { download_url: `${origin}/raw` },
      }));
      return;
    }
    if (request.method === 'POST' && url.pathname === '/emails') {
      for await (const _chunk of request) { /* consume the SDK request without logging its body */ }
      const key = request.headers['idempotency-key'];
      if (typeof key !== 'string') {
        fallosContacto++;
        response.writeHead(500, { 'content-type': 'application/json' });
        response.end('{"message":"synthetic contact delivery failure"}');
        return;
      }
      if (!key.startsWith('resend-webhook:')) {
        response.writeHead(400, { 'content-type': 'application/json' });
        response.end('{"message":"missing idempotency key"}');
        return;
      }
      const count = (intentos.get(key) || 0) + 1;
      intentos.set(key, count);
      efectosAceptados.add(key);
      response.writeHead(count === 1 ? 500 : 200, { 'content-type': 'application/json' });
      response.end(count === 1 ? '{"message":"ambiguous provider response"}' : '{"id":"re_ci_mock_sent"}');
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end('{"message":"not found"}');
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      origin = `http://127.0.0.1:${port}`;
      resolve({ server, origin, intentos, efectosAceptados, get fallosContacto() { return fallosContacto; } });
    });
  });
}

try {
  correr('npm', ['run', 'db:migrate']);
  const buildEnv = { ...process.env };
  for (const name of ['POSTGRES_URL', 'SESSION_SECRET', 'LANDING_TOKEN_KEY', 'RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET', 'CI_NEON_POSTGRES_URL', 'CI_NEON_BRANCH_ID', 'CI_SESSION_SECRET', 'CI_LANDING_TOKEN_KEY', 'CI_RESEND_WEBHOOK_SECRET']) {
    delete buildEnv[name];
  }
  correr('npm', ['run', 'build'], buildEnv);
  correr('npm', ['run', 'db:migrate']);
  const [eventTable] = await sqlCI`SELECT to_regclass('public.resend_webhook_events') IS NOT NULL AS table_present`;
  if (!eventTable.table_present) throw new Error('No se confirmó la tabla de migración 008.');
  const primaryKey = await sqlCI`SELECT conname FROM pg_constraint WHERE conrelid = 'public.resend_webhook_events'::regclass AND contype = 'p'`;
  const leaseIndex = await sqlCI`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'resend_webhook_events_lease_idx'`;
  if (primaryKey.length !== 1 || leaseIndex.length !== 1) {
    throw new Error('No se confirmó la tabla, clave primaria o índice de leases de migración 008.');
  }
  console.log('OK   migraciones: repetición idempotente, clave de evento e índice de leases presentes.');
  servidor = arrancarServidor();
  await esperarServidor(servidor.child);
  correr('npm', ['run', 'smoke']);
  correr(process.execPath, ['scripts/verificar-proxy-node.mjs'], {
    ...process.env,
    PROXY_NODE_TEST_BASE: base,
  });

  // El Node adapter debe usar la IP reenviada por el proxy sólo cuando el host está validado.
  // Si esto falla, todos los visitantes detrás de Nginx compartirían el mismo rate-limit.
  const loginDesde = (ip) =>
    fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: {
        Host: 'fedesconsultora.com',
        Origin: 'https://fedesconsultora.com',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Forwarded-For': ip,
        'X-Forwarded-Host': 'fedesconsultora.com',
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Port': '443',
      },
      body: new URLSearchParams({ username: 'ci-forwarded-ip-inexistente', password: 'incorrecta' }),
      redirect: 'manual',
    });
  await sqlCI`DELETE FROM intentos WHERE tipo = 'login'`;
  for (let i = 0; i < 5; i++) {
    const intento = await loginDesde('198.51.100.20');
    if (intento.status !== 401) throw new Error(`Rate-limit proxy: intento ${i + 1} debía devolver 401 y devolvió ${intento.status}.`);
  }
  const bloqueada = await loginDesde('198.51.100.20');
  if (bloqueada.status !== 429) throw new Error(`Rate-limit proxy: la sexta falla debía devolver 429 y devolvió ${bloqueada.status}.`);
  const otraIp = await loginDesde('198.51.100.21');
  if (otraIp.status !== 401) throw new Error(`Rate-limit proxy: otra IP debe conservar su cupo; devolvió ${otraIp.status}.`);
  await sqlCI`DELETE FROM intentos WHERE tipo = 'login'`;
  console.log('OK   proxy/clientAddress: X-Forwarded-For validado separa rate-limits por cliente.');

  correr('npm', ['run', 'verificar:fase1']);
  correr('npm', ['run', 'verificar:fase2']);

  await detenerServidor(servidor);
  servidor = undefined;
  mockResend = await iniciarMockResend();
  process.env.RESEND_API_KEY = 're_ci_fake_only';
  process.env.RESEND_TEST_BASE_URL = mockResend.origin;
  process.env.CONTACT_TO = 'ci-contact@example.test';
  process.env.CONTACT_FROM = 'Web Fedes CI <contacto@example.test>';
  process.env.MAIL_COPIA_RESPUESTAS = 'ci-release@example.test';
  servidor = arrancarServidor();
  servidorParalelo = arrancarServidor(4323);
  await esperarServidor(servidor.child);
  await esperarServidor(servidorParalelo.child, 'http://127.0.0.1:4323');
  correr(process.execPath, ['scripts/verificar-contacto-resend-fallido.mjs']);
  if (mockResend.fallosContacto !== 1) throw new Error('El mock local no observó exactamente un fallo de notificación del formulario.');
  correr(process.execPath, ['scripts/verificar-webhook-idempotencia.mjs'], {
    ...process.env,
    VERIFICAR_URLS: `${base},http://127.0.0.1:4323`,
  });
  const reintentosMock = [...mockResend.intentos.entries()];
  if (reintentosMock.length !== 1 || reintentosMock[0][1] !== 2 || mockResend.efectosAceptados.size !== 1) {
    throw new Error('El mock local de Resend no observó una única operación idempotente con retry.');
  }
  console.log('OK   mock local de Resend: respuesta ambigua, retry con la misma Idempotency-Key, un solo efecto aceptado.');

  await detenerServidor(servidor);
  await detenerServidor(servidorParalelo);
  servidor = undefined;
  servidorParalelo = undefined;
  servidor = arrancarServidor(4324, {
    POSTGRES_URL: 'postgresql://ci:ci@127.0.0.1:1/fedes_ci?sslmode=require',
    RESEND_API_KEY: '',
    RESEND_TEST_BASE_URL: '',
  });
  await esperarServidor(servidor.child, 'http://127.0.0.1:4324');
  correr(process.execPath, ['scripts/verificar-contacto-db-fallido.mjs'], {
    ...process.env,
    VERIFICAR_URL: 'http://127.0.0.1:4324',
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falló la verificación de integración.');
  process.exitCode = 1;
} finally {
  await detenerServidor(servidor);
  await detenerServidor(servidorParalelo);
  if (mockResend) await new Promise((resolve) => mockResend.server.close(resolve));
}

import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { baseDeDesarrollo } from './lib/guardia.mjs';

const requeridas = ['CI_NEON_POSTGRES_URL', 'CI_SESSION_SECRET', 'CI_LANDING_TOKEN_KEY', 'CI_RESEND_WEBHOOK_SECRET'];
const faltantes = requeridas.filter((key) => !process.env[key]);
if (faltantes.length) {
  console.error(`Faltan secretos de integración: ${faltantes.join(', ')}.`);
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

// Esta guardia prueba que la rama lleva marca_desarrollo antes de migrar o borrar fixtures.
await baseDeDesarrollo();

const correr = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} falló.`);
};

let servidor;
let timer;
const base = 'http://127.0.0.1:4322';
process.env.SMOKE_BASE = base;
process.env.VERIFICAR_URL = base;
try {
  correr('npm', ['run', 'db:migrate']);
  correr('npm', ['run', 'build']);
  servidor = spawn(process.execPath, ['./dist/server/entry.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, HOST: '127.0.0.1', PORT: '4322', NODE_ENV: 'production' },
  });
  timer = setTimeout(() => servidor.kill('SIGKILL'), 45_000);
  let listo = false;
  for (let i = 0; i < 40; i++) {
    if (servidor.exitCode !== null) throw new Error('El servidor terminó antes del healthcheck.');
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) {
        listo = true;
        break;
      }
    } catch {}
    await delay(500);
  }
  if (!listo) throw new Error('El servidor no quedó healthy dentro de 20 segundos.');
  correr('npm', ['run', 'smoke']);
  correr('npm', ['run', 'verificar:fase1']);
  correr('npm', ['run', 'verificar:fase2']);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falló la verificación de integración.');
  process.exitCode = 1;
} finally {
  if (timer) clearTimeout(timer);
  if (servidor && servidor.exitCode === null) {
    servidor.kill('SIGTERM');
    let timeout;
    await Promise.race([
      new Promise((resolve) => servidor.once('exit', resolve)),
      new Promise((resolve) => {
        timeout = setTimeout(() => {
          servidor.kill('SIGKILL');
          resolve();
        }, 20_000);
      }),
    ]);
    clearTimeout(timeout);
  }
}

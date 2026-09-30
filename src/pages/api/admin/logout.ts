import type { APIRoute } from 'astro';
import { SESSION_COOKIE, revokeSession } from '../../../lib/auth';

export const prerender = false;

// El middleware ya exige sesión válida y token CSRF para llegar acá.
export const POST: APIRoute = async ({ cookies }) => {
  await revokeSession(cookies.get(SESSION_COOKIE)?.value);
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

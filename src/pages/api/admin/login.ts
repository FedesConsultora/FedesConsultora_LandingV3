import type { APIRoute } from 'astro';
import { createSessionToken, isAdminConfigured, verifyPassword, SESSION_COOKIE, SESSION_MAX_AGE } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdminConfigured()) {
    return new Response(JSON.stringify({ ok: false, error: 'not_configured' }), { status: 500 });
  }

  const data = await request.formData();
  const username = String(data.get('username') ?? '').trim();
  const password = String(data.get('password') ?? '');

  if (!username || !password || !verifyPassword(username, password)) {
    // Mensaje genérico: no decir cuál de los dos campos falló.
    return new Response(JSON.stringify({ ok: false, error: 'invalid_credentials' }), { status: 401 });
  }

  cookies.set(SESSION_COOKIE, createSessionToken(username), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

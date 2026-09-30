import type { APIRoute } from 'astro';
import { SESSION_COOKIE, SESSION_MAX_AGE, checkCredentials, createSession, isAdminConfigured } from '../../../lib/auth';
import { clientIp, registrarFallo, superoLimite } from '../../../lib/limite';

export const prerender = false;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context;
  if (!isAdminConfigured()) return json({ ok: false, error: 'not_configured' }, 500);

  const ip = clientIp(context);
  if (await superoLimite('login', ip)) return json({ ok: false, error: 'too_many_attempts' }, 429);

  const data = await request.formData();
  const usuario = String(data.get('username') ?? '').trim();
  const password = String(data.get('password') ?? '');

  const adminId = usuario && password ? await checkCredentials(usuario, password) : null;
  if (!adminId) {
    await registrarFallo('login', ip);
    // Mensaje genérico: no decir cuál de los dos campos falló.
    return json({ ok: false, error: 'invalid_credentials' }, 401);
  }

  cookies.set(SESSION_COOKIE, await createSession(adminId), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return json({ ok: true });
};

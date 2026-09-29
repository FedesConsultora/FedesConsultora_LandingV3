import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, verifySessionToken } from './lib/auth';

// Protege todo lo que empieza con /admin (menos /admin/login) y /api/admin (menos /api/admin/login).
const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/api/admin/login']);

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;
  const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (!isAdminArea || PUBLIC_ADMIN_PATHS.has(pathname)) return next();

  const token = context.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionToken(token)) return next();

  if (pathname.startsWith('/api/admin')) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return context.redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
});

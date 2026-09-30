import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, csrfValid, getSession, isAdminConfigured } from './lib/auth';

// Protege todo lo que empieza con /admin (menos /admin/login) y /api/admin (menos /api/admin/login).
const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/api/admin/login']);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const json = (body: object, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// El token CSRF llega en el encabezado (pedidos con fetch) o en el campo "csrf" (formularios HTML).
async function csrfFrom(request: Request) {
  const header = request.headers.get('x-csrf-token');
  if (header) return header;
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await request.clone().formData();
    return String(form.get('csrf') ?? '');
  }
  return null;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (!isAdminArea) return next();

  const noStore = (res: Response) => {
    // Nada del panel se guarda en cachés intermedias ni en el historial del navegador.
    res.headers.set('Cache-Control', 'no-store');
    return res;
  };

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return noStore(await next());

  const token = context.cookies.get(SESSION_COOKIE)?.value;
  const admin = isAdminConfigured() ? await getSession(token) : null;

  if (!admin) {
    if (pathname.startsWith('/api/admin')) return json({ ok: false, error: 'unauthorized' }, 401);
    return context.redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }

  if (!SAFE_METHODS.has(context.request.method) && !csrfValid(token!, await csrfFrom(context.request))) {
    return json({ ok: false, error: 'csrf' }, 403);
  }

  context.locals.admin = admin;
  return noStore(await next());
});

import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, csrfValid, getSession, isAdminConfigured } from './lib/auth';

// Protege todo lo que empieza con /admin (menos /admin/login) y /api/admin (menos /api/admin/login).
const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/api/admin/login']);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const json = (body: object, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' } });

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

// Chequeo de origen de formularios: las mismas reglas que el de Astro (security.checkOrigin, que
// está desactivado en astro.config.mjs). Un POST/PUT/PATCH/DELETE con cuerpo de formulario (o sin
// tipo de contenido) tiene que venir del propio sitio. Única excepción: la baja de los mails, que
// el proveedor de correo envía sin Origin y que se valida con la firma del link (src/lib/mails.ts).
const TIPOS_FORMULARIO = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];
const EXENTAS_ORIGEN = [/^\/m\/[^/]+\/baja$/];

function origenProhibido(request: Request, url: URL) {
  if (SAFE_METHODS.has(request.method)) return false;
  if (EXENTAS_ORIGEN.some((r) => r.test(url.pathname))) return false;
  const mismoOrigen = request.headers.get('origin') === url.origin;
  const tipo = request.headers.get('content-type');
  if (tipo) return TIPOS_FORMULARIO.some((t) => tipo.toLowerCase().includes(t)) && !mismoOrigen;
  return !mismoOrigen;
}

// Landings privadas: no indexables, sin referrer y sin caché, también en la página genérica.
const PRIVADA_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'private, no-store',
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isPrivatePath = pathname === '/diagnostico' || pathname.startsWith('/diagnostico/') || pathname.startsWith('/m/');
  const isPrivateResponse = isAdminArea || isPrivatePath;
  const noStore = (res: Response) => {
    res.headers.set('Cache-Control', 'private, no-store');
    if (isAdminArea) res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return res;
  };

  try {
    if (origenProhibido(context.request, context.url)) {
      return noStore(new Response(`Cross-site ${context.request.method} form submissions are forbidden`, { status: 403 }));
    }

    // Landings privadas y links de los mails (/m/...): mismas cabeceras de privacidad.
    if (isPrivatePath) {
      const res = await next();
      for (const [k, v] of Object.entries(PRIVADA_HEADERS)) res.headers.set(k, v);
      return res;
    }

    if (!isAdminArea) return await next();

    if (PUBLIC_ADMIN_PATHS.has(pathname)) return noStore(await next());

    const token = context.cookies.get(SESSION_COOKIE)?.value;
    const admin = isAdminConfigured() ? await getSession(token) : null;

    if (!admin) {
      if (pathname.startsWith('/api/admin')) return json({ ok: false, error: 'unauthorized' }, 401);
      return noStore(context.redirect(`/admin/login?next=${encodeURIComponent(pathname)}`));
    }

    if (!SAFE_METHODS.has(context.request.method) && !csrfValid(token!, await csrfFrom(context.request))) {
      return json({ ok: false, error: 'csrf' }, 403);
    }

    context.locals.admin = admin;
    return noStore(await next());
  } catch (error) {
    // No propagar URLs privadas (que pueden incluir tokens) ni detalles del request al logger
    // interno de Astro Node, que imprime request.url junto con errores no controlados.
    const ruta = isAdminArea ? 'admin' : pathname.startsWith('/diagnostico/') ? 'landing_privada' : pathname.startsWith('/m/') ? 'mail_tracking' : pathname.startsWith('/api/') ? 'api' : 'public';
    const tipo = error instanceof Error ? error.name : 'UnknownError';
    console.error(JSON.stringify({ event: 'request_failed', route: ruta, error: tipo }));
    const headers = new Headers({ 'Content-Type': 'text/plain; charset=utf-8' });
    if (isPrivateResponse) headers.set('Cache-Control', 'private, no-store');
    if (isPrivatePath) {
      headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      headers.set('Referrer-Policy', 'no-referrer');
    }
    return new Response('Internal Server Error', { status: 500, headers });
  }
});

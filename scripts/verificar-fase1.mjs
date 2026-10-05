// Verificación de los criterios de aceptación de la Fase 1 (docs/09-portal-leads.md, sección 9),
// de punta a punta contra el servidor local y la base de desarrollo.
// Crea un admin temporal (contraseña al azar que no se muestra), un lead y una landing ficticios,
// recorre el flujo completo y al final borra todo lo que creó.
//
// Uso: con el servidor corriendo (npm run dev), en otra terminal: npm run verificar:fase1
// Solo corre sobre la rama de desarrollo (ver scripts/lib/guardia.mjs).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomBytes, scryptSync } from 'node:crypto';
import { baseDeDesarrollo } from './lib/guardia.mjs';

const sql = await baseDeDesarrollo();
const BASE = process.env.VERIFICAR_URL || 'http://localhost:4321';
const NAVEGADOR = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15';
const inicio = new Date();

try {
  await fetch(BASE);
} catch {
  console.error(`No responde ${BASE}. Levantá el servidor con "npm run dev" y volvé a correr este script.`);
  process.exit(1);
}

const resultados = [];
let criterio = '';
const seccion = (nombre) => {
  criterio = nombre;
  console.log(`\n${nombre}`);
};
const check = (nombre, ok, detalle = '') => {
  resultados.push({ criterio, ok });
  console.log(`  ${ok ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ` (${detalle})` : ''}`);
};

const USUARIO = `verificacion-${randomBytes(3).toString('hex')}`;
const PASS = randomBytes(24).toString('base64url');
const salt = randomBytes(16).toString('hex');
const [admin] = await sql`
  INSERT INTO admins (usuario, nombre, password_hash)
  VALUES (${USUARIO}, 'Verificación automática', ${`${salt}:${scryptSync(PASS, salt, 64).toString('hex')}`})
  RETURNING id
`;
const EMAILS = ['verif-manual@ejemplo.test', 'verif-web@ejemplo.test'];
const T = [1, 2, 3, 4].map((n) => `TESTIGO-ETAPA-${n}-${randomBytes(6).toString('hex')}`);

let cookie = '';
let csrf = '';
const conSesion = (extra = {}) => ({ Cookie: `fedes_admin_session=${cookie}`, ...extra });
const get = (path, headers = {}) => fetch(`${BASE}${path}`, { headers: { 'User-Agent': NAVEGADOR, ...headers }, redirect: 'manual' });
const post = (path, campos, { sesion = true, conCsrf = true, csrfValue = csrf, origen = BASE } = {}) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...(sesion ? conSesion() : {}), Origin: origen },
    body: new URLSearchParams([
      ...(conCsrf ? [['csrf', csrfValue]] : []),
      ...Object.entries(campos).flatMap(([k, v]) => [v].flat().map((x) => [k, String(x)])),
    ]),
    redirect: 'manual',
  });
const tokenDelEditor = async (landingId) =>
  /\/diagnostico\/([A-Za-z0-9_-]{43})"/.exec(await (await get(`/admin/landings/${landingId}`, conSesion())).text())?.[1];
const visitas = async (id) => (await sql`SELECT count(*)::int AS n FROM eventos WHERE landing_id = ${id} AND tipo = 'visita'`)[0].n;

try {
  // ------------------------------------------------------------------
  seccion('1. Un administrador inicia sesión y crea un lead');
  let r = await get('/admin');
  check('sin sesión, el panel redirige al login', r.status === 302);
  r = await post('/api/admin/login', { username: USUARIO, password: 'incorrecta' }, { sesion: false, conCsrf: false });
  check('contraseña incorrecta: rechazada', r.status === 401);
  r = await post('/api/admin/login', { username: USUARIO, password: PASS }, { sesion: false, conCsrf: false, origen: 'https://otro-sitio.com' });
  check('login desde otro sitio: rechazado', r.status === 403);
  r = await post('/api/admin/login', { username: USUARIO, password: PASS }, { sesion: false, conCsrf: false });
  const cookieHeader = r.headers.get('set-cookie') ?? '';
  cookie = /fedes_admin_session=([^;]+)/.exec(cookieHeader)?.[1] ?? '';
  check('login correcto, cookie HttpOnly, Secure, SameSite=Strict y Path=/', r.status === 200 && /HttpOnly/i.test(cookieHeader) && /Secure/i.test(cookieHeader) && /SameSite=Strict/i.test(cookieHeader) && /Path=\//i.test(cookieHeader));
  csrf = /name="csrf-token" content="([^"]+)"/.exec(await (await get('/admin', conSesion())).text())?.[1] ?? '';
  check('el panel abre con sesión', Boolean(csrf));

  const manual = { nombre: 'Lead Verificación', empresa: 'Empresa Verificación SA', fuente: 'linkedin', email: EMAILS[0] };
  r = await post('/admin/leads/nuevo', manual, { conCsrf: false });
  check('crear un lead sin token CSRF: rechazado', r.status === 403);
  r = await post('/admin/leads/nuevo', manual, { csrfValue: 'csrf-invalido' });
  check('crear un lead con token CSRF incorrecto: rechazado', r.status === 403);
  r = await post('/admin/leads/nuevo', manual);
  const leadId = Number(/\/admin\/leads\/(\d+)/.exec(r.headers.get('location') ?? '')?.[1]);
  const [lead] = await sql`SELECT estado FROM leads WHERE id = ${leadId}`;
  check('crea el lead como "Identificado"', r.status === 303 && lead?.estado === 'identificado');
  r = await post(`/admin/leads/${leadId}`, { accion: 'estado', estado: 'sesion_realizada' });
  check('cambia su estado, con historial', r.status === 303 && (await sql`SELECT count(*)::int AS n FROM historial_estados WHERE lead_id = ${leadId}`)[0].n === 2);

  r = await fetch(`${BASE}/api/contacto`, {
    method: 'POST',
    headers: { Origin: BASE },
    body: new URLSearchParams({ nombre: 'Lead Web Verificación', empresa: 'Web Verificación SA', email: EMAILS[1], tamano: 'Hasta 10 empleados', resolver: 'Oferta y comercial', privacidad: 'on' }),
  });
  const [web] = await sql`SELECT estado, fuente, consentimiento_el FROM leads WHERE email = ${EMAILS[1]}`;
  check('el formulario de Contacto entra al pipeline como "Respondió", con consentimiento', r.status === 200 && web?.estado === 'respondio' && web?.fuente === 'web' && Boolean(web?.consentimiento_el));

  // ------------------------------------------------------------------
  seccion('2. Crea una landing desde la plantilla, edita y aprueba etapas');
  r = await post(`/admin/leads/${leadId}`, { accion: 'crear_landing' });
  const landingId = Number(/\/admin\/landings\/(\d+)/.exec(r.headers.get('location') ?? '')?.[1]);
  const E = `/admin/landings/${landingId}`;
  const etapas = () => sql`SELECT * FROM etapas WHERE landing_id = ${landingId} ORDER BY orden`;
  let et = await etapas();
  check('la landing nace con las etapas de la plantilla', r.status === 303 && et.length >= 3 && et.every((e) => e.estado === 'bloqueada' && !e.aprobada), `${et.length} etapas`);

  for (const [i, e] of et.slice(0, 4).entries()) {
    await post(E, { accion: 'agregar_bloque', etapa_id: e.id, version: e.version, tipo: 'parrafo' });
    const [act] = await sql`SELECT version FROM etapas WHERE id = ${e.id}`;
    await post(E, { accion: 'guardar_bloque', etapa_id: e.id, version: act.version, indice: 0, tipo: 'parrafo', texto: `Contenido ficticio ${T[i]}` });
  }
  et = await etapas();
  check('edita el contenido de las etapas', et.slice(0, 4).every((e, i) => e.contenido[0]?.texto?.includes(T[i])));

  const [e1, e2, e3] = et;
  r = await post(E, { accion: 'desbloquear', etapa_id: e1.id });
  check('no se desbloquea una etapa sin aprobar', (await r.text()).includes('Solo se puede desbloquear una etapa aprobada'));
  for (const e of [e1, e2, e3]) await post(E, { accion: 'aprobar', etapa_id: e.id });
  et = await etapas();
  check('aprueba etapas, registrando quién', et.slice(0, 3).every((e) => e.aprobada && e.aprobada_por === admin.id));
  const [act3] = await sql`SELECT version FROM etapas WHERE id = ${e3.id}`;
  await post(E, { accion: 'guardar_bloque', etapa_id: e3.id, version: act3.version, indice: 0, tipo: 'parrafo', texto: `Precio: USD 5000 ${T[2]}` });
  r = await post(E, { accion: 'aprobar', etapa_id: e3.id });
  check('el control de contenido frena precios al aprobar', (await r.text()).includes('menciona montos o precios'));
  const [act3b] = await sql`SELECT version FROM etapas WHERE id = ${e3.id}`;
  await post(E, { accion: 'guardar_bloque', etapa_id: e3.id, version: act3b.version, indice: 0, tipo: 'parrafo', texto: `Contenido ficticio ${T[2]}` });
  await post(E, { accion: 'aprobar', etapa_id: e3.id });

  // ------------------------------------------------------------------
  seccion('3. Desbloquea etapas manualmente y copia el link');
  const token = await tokenDelEditor(landingId);
  check('el editor muestra el link para copiar (token de 256 bits)', Boolean(token));
  const [landing] = await sql`SELECT * FROM landings WHERE id = ${landingId}`;
  check('la base no guarda el token en claro', !JSON.stringify(landing).includes(token));
  r = await get(`/diagnostico/${token}`);
  check('antes de entregar, el link no abre', r.status === 404);
  await sql`DELETE FROM intentos WHERE creado_el >= ${inicio}`;
  r = await post(E, { accion: 'activar' });
  et = await etapas();
  check('al entregar se desbloquean las etapas "al entregar"', r.status === 303 && et.filter((e) => e.modo_desbloqueo === 'al_entregar').every((e) => e.estado === 'desbloqueada'));
  r = await post(E, { accion: 'desbloquear', etapa_id: e3.id });
  et = await etapas();
  check('desbloqueo manual de otra etapa', r.status === 303 && et.find((e) => e.id === e3.id).estado === 'desbloqueada');
  await post(E, { accion: 'bloquear', etapa_id: e3.id });

  // ------------------------------------------------------------------
  seccion('4 y 5. El lead ve solo las etapas desbloqueadas; el HTML de las bloqueadas no tiene su contenido');
  r = await get(`/diagnostico/${token}`);
  const html = await r.text();
  check('el lead abre su link', r.status === 200);
  check('ve el contenido de las etapas desbloqueadas', html.includes(T[0]) && html.includes(T[1]));
  check('el HTML no contiene el contenido de una etapa bloqueada y aprobada', !html.includes(T[2]));
  check('el HTML no contiene el contenido de una etapa sin aprobar', !html.includes(T[3]));
  check('las bloqueadas aparecen como próximas, con su título', html.includes(e3.titulo) && html.includes('Próximamente'));

  // ------------------------------------------------------------------
  seccion('6. Un token inválido, vencido o revocado muestra la página genérica');
  const pagina = async (t) => {
    const res = await get(`/diagnostico/${t}`);
    return { status: res.status, body: await res.text() };
  };
  const inexistente = await pagina(randomBytes(32).toString('base64url'));
  check('token inexistente: página genérica', inexistente.status === 404 && inexistente.body.includes('Este link no está disponible.'));
  check('token malformado: la misma página', (await pagina('no-es-un-token')).body === inexistente.body);
  await sql`UPDATE landings SET vence_el = now() - interval '1 minute' WHERE id = ${landingId}`;
  check('vencido: la misma página, sin revelar el motivo', (await pagina(token)).body === inexistente.body);
  await sql`UPDATE landings SET vence_el = NULL WHERE id = ${landingId}`;
  await post(E, { accion: 'revocar' });
  check('revocado: la misma página, sin revelar el motivo', (await pagina(token)).body === inexistente.body);
  await post(E, { accion: 'regenerar' });
  const nuevo = await tokenDelEditor(landingId);
  check('con un link nuevo vuelve a abrir; el viejo no', nuevo !== token && (await pagina(nuevo)).status === 200 && (await pagina(token)).status === 404);
  await sql`DELETE FROM intentos WHERE creado_el >= ${inicio}`;
  for (let i = 0; i < 20; i++) await get(`/diagnostico/${randomBytes(32).toString('base64url')}`);
  check('tras 20 intentos inválidos, la IP queda bloqueada', (await get(`/diagnostico/${nuevo}`)).status === 429);
  await sql`DELETE FROM intentos WHERE creado_el >= ${inicio}`;

  // ------------------------------------------------------------------
  seccion('7. La landing no es indexable (encabezados y metaetiquetas)');
  r = await get(`/diagnostico/${nuevo}`);
  const h2 = await r.text();
  check('X-Robots-Tag: noindex, nofollow, noarchive', r.headers.get('x-robots-tag') === 'noindex, nofollow, noarchive');
  check('Referrer-Policy: no-referrer', r.headers.get('referrer-policy') === 'no-referrer');
  check('Cache-Control: private, no-store', r.headers.get('cache-control') === 'private, no-store');
  check('metaetiqueta robots noindex', h2.includes('<meta name="robots" content="noindex, nofollow, noarchive">'));
  check('título genérico, sin Open Graph ni canonical', h2.includes('<title>Tu diagnóstico | Fedes Consultora</title>') && !/og:|rel="canonical"/.test(h2));
  check('sin analítica de terceros', !/googletagmanager|gtag\(|google-analytics/.test(h2));
  check('la página genérica también es no indexable', (await get('/diagnostico/x')).headers.get('x-robots-tag') === 'noindex, nofollow, noarchive');

  // ------------------------------------------------------------------
  seccion('8. Se registra una visita por acceso');
  await sql`DELETE FROM eventos WHERE landing_id = ${landingId}`;
  await get(`/diagnostico/${nuevo}`);
  check('una visita por acceso', (await visitas(landingId)) === 1);
  await get(`/diagnostico/${nuevo}`);
  check('recargar enseguida no la duplica', (await visitas(landingId)) === 1);
  await get(`/diagnostico/${nuevo}`, { 'User-Agent': 'WhatsApp/2.23.20.0 A' });
  await get(`/diagnostico/${nuevo}`, conSesion({ 'User-Agent': NAVEGADOR.replace('17.1', '17.2') }));
  check('no cuentan la vista previa de WhatsApp ni un administrador', (await visitas(landingId)) === 1);

  // ------------------------------------------------------------------
  seccion('9. Sin precios y sin emojis en ninguna pantalla ni plantilla');
  // ©, ® y ™ son símbolos tipográficos, no emojis (Unicode los agrupa con ellos).
  const EMOJI = /(?![\u00A9\u00AE\u2122])\p{Extended_Pictographic}/u;
  const PRECIO = /(\$|u\$s|usd|ars|€)\s?\d|\d\s?(\$|usd|ars|€)|\b(pesos|d[oó]lares|euros)\b/iu;
  const archivos = [];
  const recorrer = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) recorrer(p);
      else if (/\.(astro|ts|mjs)$/.test(f) && !/\.test\.ts$/.test(f)) archivos.push(p);
    }
  };
  recorrer(new URL('../src', import.meta.url).pathname);
  const conEmoji = archivos.filter((f) => EMOJI.test(readFileSync(f, 'utf8')));
  // bloques.ts define las reglas del control de contenido: contiene esas palabras a propósito.
  const conPrecio = archivos.filter((f) => !f.endsWith('lib/bloques.ts') && PRECIO.test(readFileSync(f, 'utf8')));
  check(`ningún archivo de pantallas o textos tiene emojis (${archivos.length} revisados)`, conEmoji.length === 0, conEmoji.join(', '));
  check('ningún archivo de pantallas o textos menciona montos', conPrecio.length === 0, conPrecio.join(', '));
  const plantilla = await sql`SELECT titulo, contenido::text AS contenido FROM plantilla_etapas`;
  check('la plantilla de etapas no tiene emojis ni montos', plantilla.every((p) => !EMOJI.test(p.titulo + p.contenido) && !PRECIO.test(p.titulo + p.contenido)));

  const expiredHash = createHash('sha256').update(cookie).digest('hex');
  await sql`UPDATE sesiones_admin SET vence_el = now() - interval '1 minute' WHERE token_hash = ${expiredHash}`;
  const expiredSession = await get('/admin', conSesion());
  check('una sesión expirada se rechaza', [302, 303, 307, 308].includes(expiredSession.status) && new URL(expiredSession.headers.get('location') || '/', BASE).pathname === '/admin/login');

  const revokedToken = randomBytes(32).toString('base64url');
  const revokedHash = createHash('sha256').update(revokedToken).digest('hex');
  await sql`INSERT INTO sesiones_admin (admin_id, token_hash, vence_el) VALUES (${admin.id}, ${revokedHash}, now() + interval '1 hour')`;
  const activeSession = await get('/admin', { Cookie: `fedes_admin_session=${revokedToken}` });
  await sql`UPDATE sesiones_admin SET revocada_el = now() WHERE token_hash = ${revokedHash}`;
  const revokedSession = await get('/admin', { Cookie: `fedes_admin_session=${revokedToken}` });
  check('una sesión revocada se rechaza', activeSession.status === 200 && [302, 303, 307, 308].includes(revokedSession.status));
} finally {
  await sql`DELETE FROM leads WHERE email = ANY(${EMAILS})`;
  await sql`DELETE FROM intentos WHERE creado_el >= ${inicio}`;
  await sql`DELETE FROM auditoria WHERE admin_id = ${admin.id}`;
  await sql`DELETE FROM admins WHERE id = ${admin.id}`;
}

const porCriterio = new Map();
for (const { criterio: c, ok } of resultados) porCriterio.set(c, (porCriterio.get(c) ?? true) && ok);
const fallas = resultados.filter((r) => !r.ok).length;
console.log('\nResumen por criterio');
for (const [c, ok] of porCriterio) console.log(`  ${ok ? 'CUMPLE   ' : 'NO CUMPLE'} ${c}`);
console.log(`\n${resultados.length - fallas} de ${resultados.length} verificaciones pasaron. Se borraron los datos de prueba y el admin temporal.`);
process.exit(fallas ? 1 : 0);

// Verificación de los criterios de aceptación de la Fase 2 (mails, docs/09-portal-leads.md sección 9)
// contra el servidor local y la base de desarrollo, en modo simulado (sin clave de Resend).
// Crea un admin temporal, leads y landings ficticios; al final restaura las plantillas y borra todo.
//
// Uso: con el servidor corriendo (npm run dev), en otra terminal: npm run verificar:fase2
// Solo corre sobre la rama de desarrollo (ver scripts/lib/guardia.mjs).
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { Webhook } from 'standardwebhooks';
import { baseDeDesarrollo } from './lib/guardia.mjs';

const sql = await baseDeDesarrollo();
const BASE = process.env.VERIFICAR_URL || 'http://localhost:4321';
if (!process.env.RESEND_WEBHOOK_SECRET) {
  console.error('Falta RESEND_WEBHOOK_SECRET en el .env (un secreto de prueba alcanza).');
  process.exit(1);
}
if (process.env.RESEND_API_KEY) {
  console.error('Este script verifica el modo simulado: quitá RESEND_API_KEY del .env para correrlo (no se envía ningún mail real).');
  process.exit(1);
}
try {
  await fetch(BASE);
} catch {
  console.error(`No responde ${BASE}. Levantá el servidor con "npm run dev".`);
  process.exit(1);
}

const resultados = [];
let criterio = '';
const seccion = (n) => {
  criterio = n;
  console.log(`\n${n}`);
};
const check = (nombre, ok, detalle = '') => {
  resultados.push({ criterio, ok });
  console.log(`  ${ok ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? ` (${detalle})` : ''}`);
};

const inicio = new Date();
const sesion = randomBytes(32).toString('base64url');
const [admin] = await sql`INSERT INTO admins (usuario, nombre, password_hash) VALUES (${`verif-${randomBytes(3).toString('hex')}`}, 'Verificación', 'x:x') RETURNING id`;
await sql`INSERT INTO sesiones_admin (admin_id, token_hash, vence_el) VALUES (${admin.id}, ${createHash('sha256').update(sesion).digest('hex')}, now() + interval '1 hour')`;
const plantillasOriginales = await sql`SELECT id, asunto, cuerpo, aprobada, aprobada_por, aprobada_el FROM plantillas_mail`;
const EMAILS = ['verif-mail-1@ejemplo.test', 'verif-mail-2@ejemplo.test'];
const [lead] = await sql`INSERT INTO leads (nombre, empresa, email, fuente, estado) VALUES ('Paula Ficticia', 'Mails de Prueba SA', ${EMAILS[0]}, 'linkedin', 'sesion_realizada') RETURNING id`;
const leadsPrueba = [lead.id];

const ADMIN = { Cookie: `fedes_admin_session=${sesion}` };
const csrf = /name="csrf-token" content="([^"]+)"/.exec(await (await fetch(`${BASE}/admin`, { headers: ADMIN })).text())[1];
const post = (path, campos) =>
  fetch(`${BASE}${path}`, { method: 'POST', headers: { ...ADMIN, Origin: BASE }, body: new URLSearchParams({ csrf, ...campos }), redirect: 'manual' });
const get = (path, headers = ADMIN) => fetch(`${BASE}${path}`, { headers, redirect: 'manual' });
const envios = (leadId) => sql`SELECT * FROM envios WHERE lead_id = ${leadId} ORDER BY id`;
const plantilla = async (clave) => (await sql`SELECT * FROM plantillas_mail WHERE clave = ${clave}`)[0];
const texto = async (r) => r.text();
const firmar = (tipo, data) => {
  const payload = JSON.stringify({ type: tipo, created_at: new Date().toISOString(), data });
  const id = `msg_${randomBytes(8).toString('hex')}`;
  const ts = new Date();
  const firma = new Webhook(process.env.RESEND_WEBHOOK_SECRET).sign(id, ts, payload);
  return fetch(`${BASE}/api/webhooks/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'svix-id': id, 'svix-timestamp': String(Math.floor(ts / 1000)), 'svix-signature': firma },
    body: payload,
  });
};
// Crea una landing entregable (etapas 1 y 2 aprobadas) para un lead. Devuelve el id.
async function landingLista(leadId) {
  const r = await post(`/admin/leads/${leadId}`, { accion: 'crear_landing' });
  const id = Number(/\/admin\/landings\/(\d+)/.exec(r.headers.get('location'))[1]);
  await sql`UPDATE etapas SET contenido = '[{"tipo":"parrafo","texto":"Contenido ficticio."}]'::jsonb, aprobada = true WHERE landing_id = ${id}`;
  return id;
}

try {
  // ------------------------------------------------------------------
  seccion('1. Consentimiento: sin consentimiento registrado no se envían mails');
  let html = await texto(await get(`/admin/leads/${lead.id}/mail`));
  check('el redactor avisa que no se le puede escribir', html.includes('no tiene consentimiento registrado'));
  let r = await post(`/admin/leads/${lead.id}/mail`, { accion: 'enviar', asunto: 'Hola', cuerpo: 'Texto.' });
  check('enviar sin consentimiento se rechaza', (await texto(r)).includes('consentimiento'));
  r = await post(`/admin/leads/${lead.id}`, { accion: 'consentimiento', origen: 'Respondió por LinkedIn y compartió su mail (prueba).' });
  const [conCons] = await sql`SELECT consentimiento_el, consentimiento_origen, consentimiento_texto FROM leads WHERE id = ${lead.id}`;
  check('registrar consentimiento desde la ficha', r.status === 303 && Boolean(conCons.consentimiento_el) && conCons.consentimiento_texto === '[TEXTO LEGAL PENDIENTE]');

  // ------------------------------------------------------------------
  seccion('2. Envío manual con plantillas, vista previa y bloqueo de emojis y montos');
  r = await post(`/admin/leads/${lead.id}/mail`, { accion: 'enviar', asunto: 'Hola', cuerpo: 'Excelente noticia 🚀' });
  check('bloquea emojis', (await texto(r)).includes('tiene emojis'));
  r = await post(`/admin/leads/${lead.id}/mail`, { accion: 'enviar', asunto: 'Propuesta', cuerpo: 'El onboarding cuesta USD 3000.' });
  check('bloquea montos', (await texto(r)).includes('menciona montos'));
  r = await post(`/admin/leads/${lead.id}/mail`, { accion: 'enviar', asunto: 'Hola', cuerpo: 'Hola {{apodo}}' });
  check('rechaza variables que no existen', (await texto(r)).includes('{{apodo}}'));
  r = await post(`/admin/leads/${lead.id}/mail`, { accion: 'enviar', asunto: 'Diagnóstico', cuerpo: 'Tu diagnóstico: {{link_landing}}' });
  check('{{link_landing}} exige una landing entregada', (await texto(r)).includes('no tiene una landing entregada'));
  r = await post(`/admin/leads/${lead.id}/mail`, { accion: 'previa', asunto: 'Hola {{nombre}}', cuerpo: 'Hola, {{nombre}} de {{empresa}}:\n\n<b>texto</b>\n\n{{link_agendar}}' });
  html = await texto(r);
  check('vista previa en un marco aislado, con el texto escapado', html.includes('sandbox=""') && html.includes('Hola Paula') && html.includes('&amp;lt;b&amp;gt;texto'));
  r = await post(`/admin/leads/${lead.id}/mail`, { accion: 'enviar', asunto: 'Seguimiento de tu diagnóstico', cuerpo: 'Hola, {{nombre}}:\n\nQuedamos a disposición.\n\n{{link_agendar}}' });
  let e = (await envios(lead.id)).at(-1);
  check('envío manual registrado (simulado, sin clave de Resend)', r.status === 303 && e?.estado === 'simulado' && e?.tipo === 'manual' && e?.error.includes('RESEND_API_KEY'));
  check('el historial guarda el texto final, sin URLs de seguimiento', e?.cuerpo.startsWith('Hola, Paula:') && e?.cuerpo.includes('[link para agendar]') && !e?.cuerpo.includes('/m/'));
  html = await texto(await get(`/admin/leads/${lead.id}`));
  check('la ficha muestra el mail enviado y el aviso del modo simulado', html.includes('Seguimiento de tu diagnóstico') && html.includes('falta la clave de Resend'));
  html = await texto(await get('/admin/mails/enviados'));
  check('Mails > Enviados lo lista', html.includes('Seguimiento de tu diagnóstico') && html.includes('Mails de Prueba SA'));

  // ------------------------------------------------------------------
  seccion('3. Plantillas: aprobación antes de usarse en mails automáticos');
  const entrega = await plantilla('entrega');
  r = await post(`/admin/mails/plantillas/${entrega.id}`, { accion: 'aprobar', asunto: entrega.asunto, cuerpo: entrega.cuerpo });
  check('una plantilla con [PENDIENTE] no se aprueba', (await texto(r)).includes('[PENDIENTE]'));
  await post(`/admin/mails/plantillas/${entrega.id}`, { accion: 'guardar', asunto: 'Tu diagnóstico', cuerpo: 'Hola, {{nombre}}: texto de prueba.' });
  r = await post(`/admin/mails/plantillas/${entrega.id}`, { accion: 'aprobar', asunto: 'Tu diagnóstico', cuerpo: 'Hola, {{nombre}}: texto de prueba.' });
  check('la plantilla de entrega exige {{link_landing}}', (await texto(r)).includes('{{link_landing}}'));

  const leadLanding = await landingLista(lead.id);
  r = await post(`/admin/landings/${leadLanding}`, { accion: 'activar' });
  let avisoHtml = await texto(await get(`/admin/landings/${leadLanding}`, { ...ADMIN, Cookie: `${ADMIN.Cookie}; ${r.headers.get('set-cookie')?.split(';')[0] ?? ''}` }));
  check('con la plantilla sin aprobar, entregar no envía mail y avisa por qué', (await envios(lead.id)).length === 1 && avisoHtml.includes('no está aprobada'));

  const cuerpoEntrega = 'Hola, {{nombre}}:\n\nTexto de prueba de la entrega.\n\n{{link_landing}}';
  await post(`/admin/mails/plantillas/${entrega.id}`, { accion: 'guardar', asunto: 'Tu diagnóstico, {{nombre}}', cuerpo: cuerpoEntrega });
  r = await post(`/admin/mails/plantillas/${entrega.id}`, { accion: 'aprobar', asunto: 'Tu diagnóstico, {{nombre}}', cuerpo: cuerpoEntrega + ' cambio sin guardar' });
  check('no se aprueba con cambios sin guardar', (await texto(r)).includes('cambios sin guardar'));
  r = await post(`/admin/mails/plantillas/${entrega.id}`, { accion: 'aprobar', asunto: 'Tu diagnóstico, {{nombre}}', cuerpo: cuerpoEntrega });
  check('aprobar la plantilla corregida', r.status === 303 && (await plantilla('entrega')).aprobada);
  const nueva = await plantilla('nueva_etapa');
  const cuerpoNueva = 'Hola, {{nombre}}:\n\nYa podés ver: {{etapas}}.\n\n{{link_landing}}';
  await post(`/admin/mails/plantillas/${nueva.id}`, { accion: 'guardar', asunto: 'Nueva etapa disponible', cuerpo: cuerpoNueva });
  await post(`/admin/mails/plantillas/${nueva.id}`, { accion: 'aprobar', asunto: 'Nueva etapa disponible', cuerpo: cuerpoNueva });
  await post(`/admin/mails/plantillas/${nueva.id}`, { accion: 'guardar', asunto: 'Nueva etapa disponible', cuerpo: cuerpoNueva + '\n\nSaludos.' });
  check('editar una plantilla aprobada le quita la aprobación', !(await plantilla('nueva_etapa')).aprobada);
  await post(`/admin/mails/plantillas/${nueva.id}`, { accion: 'aprobar', asunto: 'Nueva etapa disponible', cuerpo: cuerpoNueva + '\n\nSaludos.' });

  // ------------------------------------------------------------------
  seccion('4. Mail automático al desbloquear una etapa');
  const [et3] = await sql`SELECT id FROM etapas WHERE landing_id = ${leadLanding} AND orden = 3`;
  r = await post(`/admin/landings/${leadLanding}`, { accion: 'desbloquear', etapa_id: et3.id });
  e = (await envios(lead.id)).at(-1);
  check('desbloquear una etapa envía el mail de nueva etapa', e?.tipo === 'automatico' && e?.asunto === 'Nueva etapa disponible' && e?.cuerpo.includes('Caso anónimo del sector'));
  check('el mail automático queda asociado a la landing y a su link', e?.landing_id === leadLanding && Boolean(e?.landing_token_hash));
  const [et4] = await sql`SELECT id, version FROM etapas WHERE landing_id = ${leadLanding} AND orden = 4`;
  await post(`/admin/landings/${leadLanding}`, { accion: 'mail_etapa', etapa_id: et4.id, version: et4.version, enviar_mail: '0' });
  const antes = (await envios(lead.id)).length;
  await post(`/admin/landings/${leadLanding}`, { accion: 'desbloquear', etapa_id: et4.id });
  check('con "enviar mail" desactivado, desbloquear no envía', (await envios(lead.id)).length === antes);

  const [lead2] = await sql`INSERT INTO leads (nombre, empresa, email, fuente, estado, consentimiento_el) VALUES ('Raúl Ficticio', 'Entrega de Prueba SRL', ${EMAILS[1]}, 'web', 'sesion_realizada', now()) RETURNING id`;
  leadsPrueba.push(lead2.id);
  const landing2 = await landingLista(lead2.id);
  await post(`/admin/leads/${lead2.id}`, { accion: 'entregar_landing', landing_id: landing2 });
  e = (await envios(lead2.id)).at(-1);
  check('entregar la landing envía el mail de entrega (uno solo por las etapas juntas)', (await envios(lead2.id)).length === 1 && e?.asunto === 'Tu diagnóstico, Raúl');

  // ------------------------------------------------------------------
  seccion('5. Aperturas y clics propios (sin trackers de terceros)');
  // El token firmado se calcula igual que en src/lib/mails-core.ts (HMAC con SESSION_SECRET).
  const tk = (id) => `${id}.${createHmac('sha256', process.env.SESSION_SECRET).update(`mail:${id}`).digest('hex').slice(0, 32)}`;
  r = await get(`/m/${tk(e.id)}/a.gif`, {});
  let [e2] = await sql`SELECT abierto_el FROM envios WHERE id = ${e.id}`;
  check('la imagen de apertura registra la apertura', r.headers.get('content-type') === 'image/gif' && Boolean(e2.abierto_el));
  r = await get(`/m/${e.id}.${'0'.repeat(32)}/a.gif`, {});
  check('con una firma falsa no registra nada (y responde igual)', r.status === 200);
  r = await get(`/m/${tk(e.id)}/ir/landing`, {});
  const destino = r.headers.get('location') ?? '';
  [e2] = await sql`SELECT clic_el FROM envios WHERE id = ${e.id}`;
  check('el clic registra y lleva a la landing', /^\/diagnostico\/[A-Za-z0-9_-]{43}$/.test(destino) && Boolean(e2.clic_el));
  check('el mail no lleva el token de la landing, solo el link firmado', !(await sql`SELECT cuerpo FROM envios WHERE id = ${e.id}`)[0].cuerpo.includes(destino.split('/').pop()));
  r = await get(`/m/${tk(e.id)}/ir/https:%2F%2Fotro-sitio.com`, {});
  check('no redirige a destinos que no son fijos', r.headers.get('location') === '/diagnostico/no-disponible');
  await post(`/admin/landings/${landing2}`, { accion: 'regenerar' });
  r = await get(`/m/${tk(e.id)}/ir/landing`, {});
  check('con el link de la landing regenerado, el mail viejo ya no la abre', r.headers.get('location') === '/diagnostico/no-disponible');
  r = await get(`/m/${tk(e.id)}/ir/agendar`, {});
  check('el botón de agendar lleva a la agenda', (r.headers.get('location') ?? '').includes('calendar.google.com'));
  const eventos = await sql`SELECT tipo FROM eventos WHERE landing_id = ${landing2} AND tipo IN ('apertura_mail', 'clic_mail')`;
  check('aperturas y clics quedan en los eventos de la landing', eventos.some((x) => x.tipo === 'apertura_mail') && eventos.some((x) => x.tipo === 'clic_mail'));

  // ------------------------------------------------------------------
  seccion('6. Enlace de baja y exclusión automática');
  r = await get(`/m/${tk(e.id)}/baja`, {});
  html = await texto(r);
  let [l2] = await sql`SELECT baja_el FROM leads WHERE id = ${lead2.id}`;
  check('abrir el link de baja no da de baja: pide confirmar', html.includes('Confirmar') && !l2.baja_el);
  check('la página de baja no es indexable', r.headers.get('x-robots-tag') === 'noindex, nofollow, noarchive');
  r = await fetch(`${BASE}/m/${tk(e.id)}/baja`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' });
  [l2] = await sql`SELECT baja_el FROM leads WHERE id = ${lead2.id}`;
  check('baja en un clic del programa de correo (sin Origin) funciona', r.status === 200 && Boolean(l2.baja_el));
  r = await fetch(`${BASE}/admin/leads/${lead2.id}`, { method: 'POST', headers: { ...ADMIN, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `csrf=${csrf}&accion=estado&estado=propuesta` });
  check('la excepción es solo para la baja: otros formularios sin Origin se rechazan', r.status === 403);
  r = await post(`/admin/leads/${lead2.id}/mail`, { accion: 'enviar', asunto: 'Hola', cuerpo: 'Texto.' });
  check('a un lead dado de baja no se le puede enviar', (await texto(r)).includes('no recibir más comunicaciones'));
  const [et3b] = await sql`SELECT id FROM etapas WHERE landing_id = ${landing2} AND orden = 3`;
  const n2 = (await envios(lead2.id)).length;
  await post(`/admin/landings/${landing2}`, { accion: 'desbloquear', etapa_id: et3b.id });
  check('ni automáticamente al desbloquear una etapa', (await envios(lead2.id)).length === n2);

  // ------------------------------------------------------------------
  seccion('7. Estados de entrega y respuestas por webhook (firma verificada)');
  const manual = (await envios(lead.id))[0];
  await sql`UPDATE envios SET resend_id = ${`re_prueba_${manual.id}`} WHERE id = ${manual.id}`;
  r = await fetch(`${BASE}/api/webhooks/resend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'email.delivered', data: { email_id: `re_prueba_${manual.id}` } }) });
  check('un webhook sin firma se rechaza', r.status === 401);
  r = await firmar('email.delivered', { email_id: `re_prueba_${manual.id}` });
  let [m1] = await sql`SELECT estado, entregado_el FROM envios WHERE id = ${manual.id}`;
  check('entregado', r.status === 200 && m1.estado === 'entregado' && Boolean(m1.entregado_el));
  r = await firmar('email.bounced', { email_id: `re_prueba_${manual.id}`, bounce: { type: 'Permanent', subType: 'General', message: 'x' } });
  const [lr] = await sql`SELECT rebote_el FROM leads WHERE id = ${lead.id}`;
  check('rebote permanente: el lead no recibe más mails', Boolean(lr.rebote_el));
  await sql`UPDATE leads SET rebote_el = NULL WHERE id = ${lead.id}`;

  const recibido = { email_id: `rcv_${randomBytes(6).toString('hex')}`, from: `Paula Ficticia <${EMAILS[0]}>`, to: [`respuestas+${manual.id}@r.ejemplo.test`], received_for: [], subject: 'Re: Seguimiento', message_id: '<prueba@ejemplo.test>', attachments: [{ filename: 'nota.pdf', size: 2048 }] };
  r = await firmar('email.received', recibido);
  await firmar('email.received', recibido); // el mismo aviso dos veces
  const recibidos = await sql`SELECT * FROM mensajes_recibidos WHERE resend_id = ${recibido.email_id}`;
  check('la respuesta queda asociada al lead y al mail que responde', recibidos.length === 1 && recibidos[0].lead_id === lead.id && recibidos[0].envio_id === manual.id);
  check('adjuntos: solo nombre y tamaño', JSON.stringify(recibidos[0]?.adjuntos) === JSON.stringify([{ nombre: 'nota.pdf', tamano: 2048 }]));
  html = await texto(await get('/admin/mails'));
  check('aparece en la bandeja como no leída, con el contador en el menú', html.includes('Re: Seguimiento') && html.includes('aria-label="Sin leer"') && /aria-label="\d+ sin leer"/.test(html));
  html = await texto(await get(`/admin/mails/${recibidos[0].id}`));
  const [leido] = await sql`SELECT leido_el FROM mensajes_recibidos WHERE id = ${recibidos[0].id}`;
  check('abrirla la marca como leída y ofrece responder', Boolean(leido.leido_el) && html.includes(`/admin/leads/${lead.id}/mail?responde=${recibidos[0].id}`));
  r = await post(`/admin/leads/${lead.id}/mail`, { accion: 'enviar', responde: String(recibidos[0].id), asunto: 'Re: Seguimiento', cuerpo: 'Gracias, {{nombre}}.' });
  e = (await envios(lead.id)).at(-1);
  check('responder queda registrado como respuesta', e?.tipo === 'respuesta' && e?.responde_a === recibidos[0].id);
  r = await firmar('email.complained', { email_id: `re_prueba_${manual.id}` });
  const [lc] = await sql`SELECT baja_el FROM leads WHERE id = ${lead.id}`;
  check('marcado como spam cuenta como baja', Boolean(lc.baja_el));
} finally {
  for (const p of plantillasOriginales) {
    await sql`UPDATE plantillas_mail SET asunto = ${p.asunto}, cuerpo = ${p.cuerpo}, aprobada = ${p.aprobada}, aprobada_por = ${p.aprobada_por}, aprobada_el = ${p.aprobada_el} WHERE id = ${p.id}`;
  }
  await sql`DELETE FROM leads WHERE email = ANY(${EMAILS})`;
  await sql`DELETE FROM intentos WHERE creado_el >= ${inicio}`;
  await sql`DELETE FROM auditoria WHERE admin_id = ${admin.id} OR (entidad = 'lead' AND entidad_id = ANY(${leadsPrueba}))`;
  await sql`DELETE FROM admins WHERE id = ${admin.id}`;
}

const porCriterio = new Map();
for (const { criterio: c, ok } of resultados) porCriterio.set(c, (porCriterio.get(c) ?? true) && ok);
const fallas = resultados.filter((x) => !x.ok).length;
console.log('\nResumen por criterio');
for (const [c, ok] of porCriterio) console.log(`  ${ok ? 'CUMPLE   ' : 'NO CUMPLE'} ${c}`);
console.log(`\n${resultados.length - fallas} de ${resultados.length} verificaciones pasaron. Se restauraron las plantillas y se borraron los datos de prueba.`);
process.exit(fallas ? 1 : 0);

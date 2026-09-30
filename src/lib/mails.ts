// Mails desde el panel (fase 2, docs/09-portal-leads.md sección 7): envío, seguimiento de
// aperturas y clics, bajas, rebotes, respuestas y plantillas.
//
// Reglas que se hacen cumplir en enviarMail (un solo lugar para todos los envíos):
// - Solo a leads con email, consentimiento, sin baja y sin rebote.
// - Sin emojis ni montos (mismo control que las landings).
// - Ningún mail REAL sale si algún texto tiene "[PENDIENTE]" (incluido el pie legal): queda como
//   simulado, con el motivo. Tampoco sale real sin RESEND_API_KEY, ni (si MAIL_PERMITIDOS está
//   definido, en desarrollo) a direcciones fuera de esa lista.
import { Resend } from 'resend';
import { contacto } from '../content/contacto';
import { mails as M } from '../content/mails';
import { contactChannels, site } from '../content/site';
import { revisarTextos } from './bloques';
import { db } from './db';
import { motivoNoEnviable, renderHtml, renderTexto, tienePendientes, tokenEnvio, usaLanding, variablesDe } from './mails-core';
import { descifrarToken, rutaLanding } from './tokens';

export class MailError extends Error {}

const ENV = import.meta.env;
const baseLinks = () => (ENV.MAIL_LINKS_URL || ENV.PUBLIC_SITE_URL || site.url).replace(/\/$/, '');
const permitidos = () =>
  (ENV.MAIL_PERMITIDOS ?? '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

export const modoMails = () => ({
  real: Boolean(ENV.RESEND_API_KEY),
  permitidos: permitidos(),
  pieConPendientes: tienePendientes(M.pieLegal),
});

const auditar = (adminId: number | null, accion: string, entidad: string, id: number, detalle?: object) =>
  db()`INSERT INTO auditoria (admin_id, accion, entidad, entidad_id, detalle)
       VALUES (${adminId}, ${accion}, ${entidad}, ${id}, ${detalle ? JSON.stringify(detalle) : null}::jsonb)`;

type Envio = {
  leadId: number;
  asunto: string;
  cuerpo: string;
  tipo: 'manual' | 'automatico' | 'respuesta';
  plantillaId?: number | null;
  adminId?: number | null;
  respondeA?: number | null; // mensajes_recibidos.id
  etapas?: string; // para {{etapas}}
};

export type ResultadoEnvio = { envioId: number; estado: 'simulado' | 'enviado' | 'fallido'; motivo?: string };

// Landing entregada y activa más reciente del lead (para {{link_landing}}).
async function landingActiva(leadId: number) {
  const [l] = await db()`
    SELECT id, token_hash, token_cifrado FROM landings
    WHERE lead_id = ${leadId} AND estado = 'activa' AND entregada_el IS NOT NULL AND (vence_el IS NULL OR vence_el > now())
    ORDER BY entregada_el DESC LIMIT 1
  `;
  return l as { id: number; token_hash: string; token_cifrado: string } | undefined;
}

// Revisa todo lo que se puede revisar antes de crear el envío. Lanza MailError con el motivo.
export async function prepararEnvio(e: Pick<Envio, 'leadId' | 'asunto' | 'cuerpo'>) {
  const [lead] = await db()`SELECT id, nombre, empresa, email, consentimiento_el, baja_el, rebote_el FROM leads WHERE id = ${e.leadId}`;
  if (!lead) throw new MailError('El lead no existe.');
  const motivo = motivoNoEnviable(lead as never);
  if (motivo) throw new MailError(motivo);
  if (!e.asunto.trim() || !e.cuerpo.trim()) throw new MailError('Completá el asunto y el texto del mail.');
  const { desconocidas } = variablesDe(`${e.asunto}\n${e.cuerpo}`);
  if (desconocidas.length) throw new MailError(`Variables que no existen: ${desconocidas.map((v) => `{{${v}}}`).join(', ')}.`);
  const problemas = revisarTextos([e.asunto, e.cuerpo]);
  if (problemas.length) throw new MailError(`No se puede enviar: el texto ${problemas.join(', ')}.`);
  const landing = usaLanding(`${e.asunto}\n${e.cuerpo}`) ? await landingActiva(e.leadId) : undefined;
  if (usaLanding(`${e.asunto}\n${e.cuerpo}`) && !landing) {
    throw new MailError('El mail usa {{link_landing}}, pero el lead no tiene una landing entregada y activa.');
  }
  return { lead: lead as { id: number; nombre: string; empresa: string; email: string }, landing };
}

// Contexto con los links de seguimiento de un envío.
function contexto(lead: { nombre: string; empresa: string }, envioId: number | null, etapas?: string, conLanding = false) {
  const base = baseLinks();
  const t = envioId ? tokenEnvio(envioId) : 'vista-previa';
  return {
    nombre: lead.nombre,
    empresa: lead.empresa,
    etapas,
    links: { landing: conLanding ? `${base}/m/${t}/ir/landing` : undefined, agendar: `${base}/m/${t}/ir/agendar` },
  };
}

const marco = (envioId: number | null) => {
  const base = baseLinks();
  const t = envioId ? tokenEnvio(envioId) : 'vista-previa';
  return {
    botonLanding: M.botonLanding,
    botonAgendar: M.botonAgendar,
    pie: M.pieLegal,
    bajaTexto: M.bajaEnlace,
    bajaUrl: `${base}/m/${t}/baja`,
    pixelUrl: envioId ? `${base}/m/${t}/a.gif` : undefined,
  };
};

// Vista previa (sin crear el envío): HTML con links de ejemplo que no llevan a ningún lado.
export async function vistaPrevia(e: Pick<Envio, 'leadId' | 'asunto' | 'cuerpo' | 'etapas'>) {
  const { lead, landing } = await prepararEnvio(e);
  const c = contexto(lead, null, e.etapas, Boolean(landing));
  return { asunto: renderTexto(e.asunto, c), html: renderHtml(e.cuerpo, c, marco(null)), para: lead.email };
}

export async function enviarMail(e: Envio): Promise<ResultadoEnvio> {
  const { lead, landing } = await prepararEnvio(e);
  const [creado] = await db()`
    INSERT INTO envios (lead_id, landing_id, landing_token_hash, tipo, plantilla_id, responde_a, para, asunto, cuerpo, admin_id)
    VALUES (${lead.id}, ${landing?.id ?? null}, ${landing?.token_hash ?? null}, ${e.tipo}, ${e.plantillaId ?? null},
            ${e.respondeA ?? null}, ${lead.email}, ${e.asunto}, ${e.cuerpo}, ${e.adminId ?? null})
    RETURNING id
  `;
  const envioId = creado.id as number;
  const c = contexto(lead, envioId, e.etapas, Boolean(landing));
  const asunto = renderTexto(e.asunto, c);
  const texto = `${renderTexto(e.cuerpo, c)}\n\n--\n${M.pieLegal}\n${M.bajaEnlace}: ${marco(envioId).bajaUrl}`;
  const html = renderHtml(e.cuerpo, c, marco(envioId));
  // Para el historial: el texto final, con los links descriptos (sin las URLs de seguimiento).
  const cuerpoHistorial = renderTexto(e.cuerpo, {
    ...c,
    links: { landing: landing ? '[link a la landing]' : undefined, agendar: '[link para agendar]' },
  });

  // ¿Sale de verdad o queda simulado?
  const modo = modoMails();
  let simulado: string | null = null;
  if (!modo.real) simulado = 'Simulado: falta la clave de Resend (RESEND_API_KEY).';
  else if (tienePendientes(asunto, e.cuerpo, M.pieLegal)) simulado = 'No salió: hay textos [PENDIENTE] (en el mail o en el pie legal).';
  else if (modo.permitidos.length && !modo.permitidos.includes(lead.email.toLowerCase())) {
    simulado = 'Simulado: el destinatario no está en la lista de prueba (MAIL_PERMITIDOS).';
  }

  let resultado: ResultadoEnvio;
  if (simulado) {
    await db()`UPDATE envios SET estado = 'simulado', error = ${simulado}, asunto = ${asunto}, cuerpo = ${cuerpoHistorial} WHERE id = ${envioId}`;
    resultado = { envioId, estado: 'simulado', motivo: simulado };
  } else {
    const respuesta = e.respondeA
      ? ((await db()`SELECT message_id FROM mensajes_recibidos WHERE id = ${e.respondeA}`)[0]?.message_id as string | undefined)
      : undefined;
    const dominioRespuestas = ENV.MAIL_RESPUESTAS_DOMINIO;
    const bajaUrl = marco(envioId).bajaUrl;
    try {
      const { data, error } = await new Resend(ENV.RESEND_API_KEY).emails.send({
        from: ENV.MAIL_FROM || M.remitente,
        to: lead.email,
        subject: asunto,
        html,
        text: texto,
        replyTo: dominioRespuestas ? `respuestas+${envioId}@${dominioRespuestas}` : undefined,
        headers: {
          'List-Unsubscribe': `<${bajaUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          ...(respuesta ? { 'In-Reply-To': respuesta, References: respuesta } : {}),
        },
      });
      if (error || !data) throw new Error(error?.message ?? 'Sin respuesta de Resend');
      await db()`UPDATE envios SET estado = 'enviado', resend_id = ${data.id}, asunto = ${asunto}, cuerpo = ${cuerpoHistorial} WHERE id = ${envioId}`;
      resultado = { envioId, estado: 'enviado' };
    } catch (err) {
      const motivo = `Falló el envío: ${(err as Error).message}`.slice(0, 500);
      await db()`UPDATE envios SET estado = 'fallido', error = ${motivo}, asunto = ${asunto}, cuerpo = ${cuerpoHistorial} WHERE id = ${envioId}`;
      resultado = { envioId, estado: 'fallido', motivo };
    }
  }
  await auditar(e.adminId ?? null, 'enviar_mail', 'lead', lead.id, { envio_id: envioId, tipo: e.tipo, estado: resultado.estado });
  return resultado;
}

// Mail automático al desbloquear etapas (al entregar la landing o después). Solo las etapas con
// "enviar mail" activo, con la plantilla aprobada. Nunca bloquea el desbloqueo: devuelve el motivo
// si no se envió, para mostrarlo en el editor.
export async function enviarPorDesbloqueo(landingId: number, etapaIds: number[], esEntrega: boolean, adminId: number) {
  if (etapaIds.length === 0) return null;
  // Solo si el lead ya puede abrir la landing.
  const [activa] = await db()`SELECT 1 FROM landings WHERE id = ${landingId} AND estado = 'activa' AND entregada_el IS NOT NULL`;
  if (!activa) return null;
  const etapas = await db()`SELECT titulo FROM etapas WHERE id = ANY(${etapaIds}) AND landing_id = ${landingId} AND enviar_mail ORDER BY orden`;
  if (etapas.length === 0) return null;
  const clave = esEntrega ? 'entrega' : 'nueva_etapa';
  const [p] = await db()`SELECT id, nombre, asunto, cuerpo, aprobada FROM plantillas_mail WHERE clave = ${clave}`;
  if (!p?.aprobada) return { enviado: false, motivo: `No se envió el mail: la plantilla «${p?.nombre ?? clave}» no está aprobada.` };
  const [l] = await db()`SELECT lead_id FROM landings WHERE id = ${landingId}`;
  try {
    const r = await enviarMail({
      leadId: l.lead_id,
      asunto: p.asunto,
      cuerpo: p.cuerpo,
      tipo: 'automatico',
      plantillaId: p.id,
      adminId,
      etapas: etapas.map((e) => e.titulo).join(', '),
    });
    return r.estado === 'enviado' ? { enviado: true } : { enviado: false, motivo: r.motivo };
  } catch (err) {
    if (err instanceof MailError) return { enviado: false, motivo: `No se envió el mail: ${err.message}` };
    throw err;
  }
}

// ---------- Seguimiento: aperturas, clics y baja (links /m/...) ----------

export async function registrarApertura(envioId: number) {
  await db()`
    WITH e AS (UPDATE envios SET abierto_el = COALESCE(abierto_el, now()) WHERE id = ${envioId} RETURNING landing_id)
    INSERT INTO eventos (landing_id, tipo) SELECT landing_id, 'apertura_mail' FROM e WHERE landing_id IS NOT NULL
  `;
}

// Destino de un clic. La landing solo si el link de la landing sigue siendo el del mail.
export async function destinoClic(envioId: number, destino: string) {
  const [e] = await db()`
    WITH e AS (UPDATE envios SET clic_el = COALESCE(clic_el, now()) WHERE id = ${envioId} RETURNING landing_id, landing_token_hash)
    SELECT e.landing_id, e.landing_token_hash, l.token_hash, l.token_cifrado, l.estado FROM e LEFT JOIN landings l ON l.id = e.landing_id
  `;
  if (!e) return null;
  if (e.landing_id) await db()`INSERT INTO eventos (landing_id, tipo) VALUES (${e.landing_id}, 'clic_mail')`;
  if (destino === 'agendar') return contacto.calendario.embedUrl;
  if (destino === 'whatsapp') return contactChannels.whatsapp.href;
  if (destino === 'landing') {
    // Link regenerado o revocado: se manda a la página genérica, igual que un link viejo.
    if (!e.token_cifrado || e.token_hash !== e.landing_token_hash || e.estado !== 'activa') return '/diagnostico/no-disponible';
    return rutaLanding(descifrarToken(e.token_cifrado));
  }
  return null;
}

export async function bajaPorEnvio(envioId: number) {
  const [e] = await db()`SELECT lead_id, landing_id FROM envios WHERE id = ${envioId}`;
  if (!e) return false;
  await db().transaction([
    db()`UPDATE leads SET baja_el = COALESCE(baja_el, now()), actualizado_el = now() WHERE id = ${e.lead_id}`,
    db()`INSERT INTO auditoria (accion, entidad, entidad_id, detalle) VALUES ('baja', 'lead', ${e.lead_id}, jsonb_build_object('origen', 'mail', 'envio_id', ${envioId}::int))`,
  ]);
  return true;
}

// ---------- Webhooks de Resend ----------

export async function actualizarEntrega(resendId: string, tipo: string, rebotePermanente: boolean) {
  const cambios: Record<string, string> = { 'email.delivered': 'entregado', 'email.bounced': 'rebotado', 'email.complained': 'spam', 'email.failed': 'fallido' };
  const estado = cambios[tipo];
  if (!estado) return;
  const [e] = await db()`
    UPDATE envios SET estado = ${estado}, entregado_el = CASE WHEN ${estado} = 'entregado' THEN now() ELSE entregado_el END
    WHERE resend_id = ${resendId} RETURNING id, lead_id
  `;
  if (!e) return;
  // Rebote permanente: no se le escribe más. Marcado como spam: cuenta como baja.
  if (estado === 'rebotado' && rebotePermanente) await db()`UPDATE leads SET rebote_el = COALESCE(rebote_el, now()) WHERE id = ${e.lead_id}`;
  if (estado === 'spam') await bajaPorEnvio(e.id);
}

// Respuesta recibida. Se asocia al envío por la dirección respuestas+ID@... y, si no, al lead por el remitente.
export async function registrarRecibido(r: {
  resendId: string;
  messageId: string | null;
  de: string;
  para: string[];
  asunto: string;
  cuerpo: string;
  adjuntos: { nombre: string | null; tamano: number | null }[];
}) {
  const envioId = r.para.map((d) => /respuestas\+(\d+)@/i.exec(d)?.[1]).find(Boolean);
  const email = /<([^>]+)>/.exec(r.de)?.[1] ?? r.de.trim();
  const [asoc] = envioId
    ? await db()`SELECT id AS envio_id, lead_id FROM envios WHERE id = ${Number(envioId)}`
    : await db()`SELECT NULL::int AS envio_id, id AS lead_id FROM leads WHERE lower(email) = lower(${email})`;
  const [m] = await db()`
    INSERT INTO mensajes_recibidos (lead_id, envio_id, resend_id, message_id, de, asunto, cuerpo, adjuntos)
    VALUES (${asoc?.lead_id ?? null}, ${asoc?.envio_id ?? null}, ${r.resendId}, ${r.messageId}, ${r.de}, ${r.asunto || '(sin asunto)'},
            ${r.cuerpo.slice(0, 100000)}, ${JSON.stringify(r.adjuntos)}::jsonb)
    ON CONFLICT (resend_id) DO NOTHING
    RETURNING id, lead_id
  `;
  if (m?.lead_id) {
    await db()`UPDATE leads SET actualizado_el = now() WHERE id = ${m.lead_id}`;
  }
  return m ?? null;
}

// ---------- Listados del panel ----------

export async function contarNoLeidos() {
  const [r] = await db()`SELECT count(*)::int AS n FROM mensajes_recibidos WHERE leido_el IS NULL`;
  return r.n as number;
}

export async function listarRecibidos() {
  return (await db()`
    SELECT m.id, m.de, m.asunto, left(m.cuerpo, 180) AS extracto, m.recibido_el, m.leido_el, m.lead_id, l.empresa
    FROM mensajes_recibidos m LEFT JOIN leads l ON l.id = m.lead_id
    ORDER BY (m.leido_el IS NULL) DESC, m.recibido_el DESC LIMIT 200
  `) as { id: number; de: string; asunto: string; extracto: string; recibido_el: Date; leido_el: Date | null; lead_id: number | null; empresa: string | null }[];
}

export async function obtenerRecibido(id: number, adminId: number) {
  const [m] = await db()`
    UPDATE mensajes_recibidos SET leido_el = COALESCE(leido_el, now()), leido_por = COALESCE(leido_por, ${adminId})
    WHERE id = ${id}
    RETURNING *
  `;
  if (!m) return null;
  const [lead] = m.lead_id ? await db()`SELECT id, empresa, nombre FROM leads WHERE id = ${m.lead_id}` : [];
  return { mensaje: m, lead: lead ?? null };
}

export type EnvioListado = {
  id: number;
  lead_id: number;
  empresa: string;
  para: string;
  asunto: string;
  tipo: string;
  estado: string;
  error: string | null;
  creado_el: Date;
  abierto_el: Date | null;
  clic_el: Date | null;
  admin: string | null;
};

export async function listarEnvios(leadId?: number) {
  return (leadId
    ? await db()`
        SELECT e.*, l.empresa, a.nombre AS admin FROM envios e JOIN leads l ON l.id = e.lead_id LEFT JOIN admins a ON a.id = e.admin_id
        WHERE e.lead_id = ${leadId} ORDER BY e.creado_el DESC`
    : await db()`
        SELECT e.*, l.empresa, a.nombre AS admin FROM envios e JOIN leads l ON l.id = e.lead_id LEFT JOIN admins a ON a.id = e.admin_id
        ORDER BY e.creado_el DESC LIMIT 300`) as EnvioListado[];
}

export async function recibidosDeLead(leadId: number) {
  return (await db()`
    SELECT id, asunto, left(cuerpo, 140) AS extracto, recibido_el, leido_el FROM mensajes_recibidos WHERE lead_id = ${leadId} ORDER BY recibido_el DESC
  `) as { id: number; asunto: string; extracto: string; recibido_el: Date; leido_el: Date | null }[];
}

// ---------- Plantillas ----------

export type Plantilla = { id: number; clave: string; nombre: string; uso: string; asunto: string; cuerpo: string; aprobada: boolean; aprobada_el: Date | null; aprobada_por_nombre: string | null };

export async function listarPlantillas() {
  return (await db()`
    SELECT p.*, a.nombre AS aprobada_por_nombre FROM plantillas_mail p LEFT JOIN admins a ON a.id = p.aprobada_por ORDER BY p.id
  `) as Plantilla[];
}

export async function guardarPlantilla(id: number, asunto: string, cuerpo: string, adminId: number) {
  if (!asunto.trim() || !cuerpo.trim()) throw new MailError('Completá el asunto y el texto.');
  const { desconocidas } = variablesDe(`${asunto}\n${cuerpo}`);
  if (desconocidas.length) throw new MailError(`Variables que no existen: ${desconocidas.map((v) => `{{${v}}}`).join(', ')}.`);
  // Editar le quita la aprobación.
  await db().transaction([
    db()`UPDATE plantillas_mail SET asunto = ${asunto.trim().slice(0, 200)}, cuerpo = ${cuerpo.trim().replace(/\r\n/g, '\n').slice(0, 10000)},
           aprobada = false, aprobada_por = NULL, aprobada_el = NULL, actualizada_el = now() WHERE id = ${id}`,
    auditar(adminId, 'editar', 'plantilla_mail', id),
  ]);
}

export async function aprobarPlantilla(id: number, adminId: number) {
  const [p] = await db()`SELECT asunto, cuerpo, clave FROM plantillas_mail WHERE id = ${id}`;
  if (!p) throw new MailError('La plantilla no existe.');
  const problemas = revisarTextos([p.asunto, p.cuerpo]);
  if (problemas.length) throw new MailError(`No se puede aprobar: el texto ${problemas.join(', ')}.`);
  if (tienePendientes(p.asunto, p.cuerpo)) throw new MailError('No se puede aprobar: todavía tiene textos [PENDIENTE].');
  if (p.clave !== 'seguimiento' && !usaLanding(p.cuerpo)) throw new MailError('Esta plantilla tiene que incluir {{link_landing}}.');
  await db().transaction([
    db()`UPDATE plantillas_mail SET aprobada = true, aprobada_por = ${adminId}, aprobada_el = now() WHERE id = ${id}`,
    auditar(adminId, 'aprobar', 'plantilla_mail', id),
  ]);
}

// Consentimiento para leads cargados a mano (por ejemplo, respondió por LinkedIn y compartió su mail).
export async function registrarConsentimiento(leadId: number, origen: string, adminId: number) {
  if (origen.trim().length < 5) throw new MailError('Contá cómo y cuándo dio su consentimiento.');
  await db().transaction([
    db()`UPDATE leads SET consentimiento_el = now(), consentimiento_origen = ${origen.trim().slice(0, 500)},
           consentimiento_texto = '[TEXTO LEGAL PENDIENTE]', actualizado_el = now() WHERE id = ${leadId}`,
    auditar(adminId, 'registrar_consentimiento', 'lead', leadId),
  ]);
}

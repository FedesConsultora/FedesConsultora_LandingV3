import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { Webhook } from 'standardwebhooks';
import { mails as M } from '../../../content/mails';
import { actualizarEntrega, registrarRecibido } from '../../../lib/mails';

// Webhook de Resend: estados de entrega de los mails enviados y mails recibidos (respuestas).
// Se verifica la firma con RESEND_WEBHOOK_SECRET; sin firma válida no se procesa nada.
export const prerender = false;

const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const secreto = import.meta.env.RESEND_WEBHOOK_SECRET;
  if (!secreto) return json({ ok: false, error: 'not_configured' }, 500);

  const payload = await request.text();
  let evento: { type: string; data: Record<string, any> };
  try {
    evento = new Webhook(secreto).verify(payload, {
      'webhook-id': request.headers.get('svix-id') ?? request.headers.get('webhook-id') ?? '',
      'webhook-timestamp': request.headers.get('svix-timestamp') ?? request.headers.get('webhook-timestamp') ?? '',
      'webhook-signature': request.headers.get('svix-signature') ?? request.headers.get('webhook-signature') ?? '',
    }) as typeof evento;
  } catch {
    return json({ ok: false, error: 'invalid_signature' }, 401);
  }

  const d = evento.data ?? {};
  if (evento.type === 'email.received') {
    // El aviso no trae el cuerpo: se pide a la API. Se guarda solo el texto (el HTML recibido nunca se muestra).
    let cuerpo = '';
    let messageId: string | null = d.message_id ?? null;
    const clave = import.meta.env.RESEND_API_KEY;
    if (clave) {
      const resend = new Resend(clave);
      const { data } = await resend.emails.receiving.get(d.email_id);
      cuerpo = data?.text ?? '';
      messageId = data?.message_id ?? messageId;
      // Copia a info@ como respaldo (decidido el 29/09).
      const copia = import.meta.env.MAIL_COPIA_RESPUESTAS;
      if (copia) await resend.emails.receiving.forward({ emailId: d.email_id, to: copia, from: import.meta.env.MAIL_FROM || M.remitente });
    }
    await registrarRecibido({
      resendId: d.email_id,
      messageId,
      de: d.from ?? '',
      para: [...(d.to ?? []), ...(d.received_for ?? [])],
      asunto: d.subject ?? '',
      cuerpo,
      adjuntos: (d.attachments ?? []).map((a: { filename?: string | null; size?: number | null }) => ({ nombre: a.filename ?? null, tamano: a.size ?? null })),
    });
  } else if (d.email_id) {
    // Rebote permanente: el tipo que informa Resend ("Permanent") o, si no viene, cualquier rebote.
    const tipoRebote = String(d.bounce?.type ?? '').toLowerCase();
    await actualizarEntrega(d.email_id, evento.type, !tipoRebote || tipoRebote.includes('permanent'));
  }
  return json({ ok: true });
};

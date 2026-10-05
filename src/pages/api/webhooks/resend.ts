import type { APIRoute } from 'astro';
import { Webhook } from 'standardwebhooks';
import { mails as M } from '../../../content/mails';
import { actualizarEntrega, registrarRecibido } from '../../../lib/mails';
import { runtimeEnv } from '../../../lib/runtime-env';
import { crearClienteResend } from '../../../lib/resend-client';
import { claimResendEvent, completeResendEvent, failResendEvent } from '../../../lib/resend-events';

// Webhook de Resend: estados de entrega de los mails enviados y mails recibidos (respuestas).
// Se verifica la firma con RESEND_WEBHOOK_SECRET; sin firma válida no se procesa nada.
export const prerender = false;

const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') return json({ ok: false, error: 'unsupported_content_type' }, 415);

  const secreto = runtimeEnv('RESEND_WEBHOOK_SECRET');
  if (!secreto) return json({ ok: false, error: 'not_configured' }, 500);

  let payload: string;
  try {
    payload = await request.text();
  } catch (error) {
    if (error instanceof Error && (error.name === 'BodySizeLimitError' || error.message.startsWith('Body size limit exceeded:'))) {
      return json({ ok: false, error: 'body_too_large' }, 413);
    }
    return json({ ok: false, error: 'invalid_body' }, 400);
  }
  let evento: { type: string; data: Record<string, any> };
  const eventId = request.headers.get('svix-id') ?? request.headers.get('webhook-id') ?? '';
  try {
    evento = new Webhook(secreto).verify(payload, {
      'webhook-id': request.headers.get('svix-id') ?? request.headers.get('webhook-id') ?? '',
      'webhook-timestamp': request.headers.get('svix-timestamp') ?? request.headers.get('webhook-timestamp') ?? '',
      'webhook-signature': request.headers.get('svix-signature') ?? request.headers.get('webhook-signature') ?? '',
    }) as typeof evento;
  } catch {
    return json({ ok: false, error: 'invalid_signature' }, 401);
  }

  if (!eventId || eventId.length > 200 || /[\r\n\0]/.test(eventId) || !evento?.type || evento.type.length > 120) {
    return json({ ok: false, error: 'invalid_event' }, 400);
  }

  const d = evento.data ?? {};
  const emailId = typeof d.email_id === 'string' ? d.email_id : null;
  let claimed: Awaited<ReturnType<typeof claimResendEvent>>;
  try {
    claimed = await claimResendEvent(eventId, evento.type, emailId);
  } catch {
    console.error(JSON.stringify({ event: 'resend_webhook_claim_failed' }));
    return json({ ok: false, error: 'temporarily_unavailable' }, 503);
  }
  if (claimed === 'done') return json({ ok: true, duplicate: true });
  if (claimed === 'busy') return json({ ok: false, error: 'event_in_progress' }, 503);

  try {
    if (evento.type === 'email.received') {
      if (!emailId) throw new Error('processing');
      // El aviso no trae el cuerpo: se pide a la API. Se guarda solo el texto (el HTML recibido nunca se muestra).
      let cuerpo = '';
      let messageId: string | null = d.message_id ?? null;
      const clave = runtimeEnv('RESEND_API_KEY');
      if (!clave) throw new Error('provider');
      const resend = crearClienteResend(clave, runtimeEnv('RESEND_TEST_BASE_URL'));
      const { data, error } = await resend.emails.receiving.get(emailId);
      if (error || !data) throw new Error('provider');
      cuerpo = data.text ?? '';
      messageId = data.message_id ?? messageId;
      // Persistir y deduplicar el recibido antes de cualquier efecto externo.
      await registrarRecibido({
        resendId: emailId,
        messageId,
        de: typeof d.from === 'string' ? d.from : '',
        para: [...(Array.isArray(d.to) ? d.to : []), ...(Array.isArray(d.received_for) ? d.received_for : [])].filter((v): v is string => typeof v === 'string'),
        asunto: typeof d.subject === 'string' ? d.subject : '',
        cuerpo,
        adjuntos: (Array.isArray(d.attachments) ? d.attachments : []).map((a: { filename?: string | null; size?: number | null }) => ({ nombre: a.filename ?? null, tamano: a.size ?? null })),
      });

      const copia = runtimeEnv('MAIL_COPIA_RESPUESTAS');
      if (resend && copia) {
        const { error } = await resend.emails.receiving.forward(
          { emailId, to: copia, from: runtimeEnv('MAIL_FROM') || M.remitente },
          { idempotencyKey: `resend-webhook:${eventId}` },
        );
        if (error) throw new Error('provider');
      }
    } else if (emailId) {
      // Rebote permanente: el tipo que informa Resend ("Permanent") o, si no viene, cualquier rebote.
      const tipoRebote = String(d.bounce?.type ?? '').toLowerCase();
      await actualizarEntrega(emailId, evento.type, !tipoRebote || tipoRebote.includes('permanent'));
    }
    await completeResendEvent(eventId);
  } catch (error) {
    const code = error instanceof Error && error.message === 'provider' ? 'provider' : 'processing';
    try {
      await failResendEvent(eventId, code);
    } catch {
      // Un fallo al guardar estado también se recupera cuando venza el lease.
    }
    console.error(JSON.stringify({ event: 'resend_webhook_failed', type: evento.type, error: code }));
    return json({ ok: false, error: 'temporarily_unavailable' }, 503);
  }
  return json({ ok: true });
};

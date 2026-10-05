import type { APIRoute } from 'astro';
import { hasDb as dbConfigured } from '../../lib/db';
import { honeypotCompleto, parseContactoForm } from '../../lib/contacto-form';
import { actualizarEstadoFormulario, registrarFormulario } from '../../lib/leads';
import { crearClienteResend } from '../../lib/resend-client';
import { runtimeEnv } from '../../lib/runtime-env';

// Único endpoint del formulario de Contacto. Guarda el lead en la base (fuente de verdad
// para el panel /admin) y, además, intenta avisar por mail con Resend. Si el mail falla,
// el lead no se pierde: sigue en la base.
export const prerender = false;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'multipart/form-data' && contentType !== 'application/x-www-form-urlencoded') {
    return json({ ok: false, error: 'unsupported_content_type' }, 415);
  }
  const reader = request.body?.getReader();
  if (!reader) return json({ ok: false, error: 'invalid_body' }, 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256 * 1024) {
        await reader.cancel();
        return json({ ok: false, error: 'body_too_large' }, 413);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof Error && (error.name === 'BodySizeLimitError' || error.message.startsWith('Body size limit exceeded:'))) {
      return json({ ok: false, error: 'body_too_large' }, 413);
    }
    return json({ ok: false, error: 'invalid_body' }, 400);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let data: FormData;
  try {
    data = await new Response(bytes, { headers: { 'content-type': request.headers.get('content-type')! } }).formData();
  } catch {
    return json({ ok: false, error: 'invalid_body' }, 400);
  }
  // Campo señuelo: si viene completo es un bot. Respondemos ok sin persistir ni enviar nada.
  if (honeypotCompleto(data)) return json({ ok: true });

  const parsed = parseContactoForm(data);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);
  const fields = parsed.fields;

  const hasDb = dbConfigured();
  const apiKey = runtimeEnv('RESEND_API_KEY');
  const contactTo = runtimeEnv('CONTACT_TO');
  const contactFrom = runtimeEnv('CONTACT_FROM');
  const remitentePrueba = /@resend\.dev(?:>|$)/i.test(contactFrom ?? '');
  const aviso = apiKey && contactTo && contactFrom && !remitentePrueba
    ? { apiKey, to: contactTo, from: contactFrom }
    : null;

  if (!hasDb) {
    // Local sin servicios: permite revisar el formulario, pero nunca imprime datos personales.
    if (!apiKey && import.meta.env.DEV) return json({ ok: true, dev: true });
    return json({ ok: false, error: 'not_configured' }, 500);
  }

  // Primero persistir el contacto. Un fallo de Neon debe impedir el aviso externo para que no
  // haya un éxito aparente sin lead en el pipeline.
  let formulario: { leadId: number; formId: number };
  try {
    formulario = await registrarFormulario({ ...fields, resend_status: aviso ? 'pending' : 'skipped' });
  } catch {
    console.error(JSON.stringify({ event: 'contact_persist_failed' }));
    return json({ ok: false, error: 'save_failed' }, 500);
  }

  // El correo es un aviso best-effort; la solicitud ya quedó guardada.
  let resendStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
  if (apiKey && !aviso) {
    console.error(JSON.stringify({ event: 'contact_mail_skipped', error: 'missing_or_test_sender_config' }));
  }
  if (aviso) {
    const { apiKey: contactApiKey, to, from } = aviso;
    const rows: [string, string][] = [
      ['Nombre y apellido', fields.nombre],
      ['Empresa', fields.empresa],
      ['Email', fields.email],
      ['Tamaño de la empresa', fields.tamano || '-'],
      ['¿Qué querés resolver?', fields.resolver],
      // Cargo, WhatsApp y Comentarios ya no los pide el formulario; se incluyen solo si algún día llegan igual.
      ...(fields.cargo ? ([['Cargo', fields.cargo]] as [string, string][]) : []),
      ...(fields.whatsapp ? ([['WhatsApp', fields.whatsapp]] as [string, string][]) : []),
      ...(fields.comentarios ? ([['Comentarios', fields.comentarios]] as [string, string][]) : []),
    ];
    const html =
      '<h2>Nueva solicitud de sesión de diagnóstico</h2><table cellpadding="8">' +
      rows.map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`).join('') +
      '</table>';
    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    try {
      const { error } = await crearClienteResend(contactApiKey, runtimeEnv('RESEND_TEST_BASE_URL')).emails.send({
        from,
        to,
        replyTo: fields.email,
        subject: `Sesión de diagnóstico: ${fields.empresa}`,
        html,
        text,
      });
      if (error) {
        console.error(JSON.stringify({ event: 'contact_mail_failed', error: 'provider_error' }));
        resendStatus = 'failed';
      } else {
        resendStatus = 'sent';
      }
    } catch {
      console.error(JSON.stringify({ event: 'contact_mail_failed', error: 'provider_exception' }));
      resendStatus = 'failed';
    }
  }

  if (aviso) {
    try {
      await actualizarEstadoFormulario(formulario.formId, resendStatus);
    } catch {
      console.error(JSON.stringify({ event: 'contact_status_update_failed', form_id: formulario.formId }));
    }
  }
  return json({ ok: true });
};

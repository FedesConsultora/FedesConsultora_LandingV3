import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { hasDb as dbConfigured } from '../../lib/db';
import { registrarFormulario } from '../../lib/leads';

// Único endpoint del formulario de Contacto. Guarda el lead en la base (fuente de verdad
// para el panel /admin) y, además, intenta avisar por mail con Resend. Si el mail falla,
// el lead no se pierde: sigue en la base.
export const prerender = false;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const REQUIRED = ['nombre', 'empresa', 'email', 'tamano', 'resolver'] as const;

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  const get = (k: string) => String(data.get(k) ?? '').trim().slice(0, 2000);

  // Campo señuelo: si viene completo es un bot. Respondemos ok sin enviar nada.
  if (get('web')) return json({ ok: true });

  for (const k of REQUIRED) if (!get(k)) return json({ ok: false, error: 'missing_' + k }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get('email'))) return json({ ok: false, error: 'invalid_email' }, 400);
  if (!data.get('privacidad')) return json({ ok: false, error: 'privacy' }, 400);

  const fields = {
    nombre: get('nombre'),
    empresa: get('empresa'),
    // Cargo y WhatsApp se sacaron del formulario (29/09): quedan null salvo que se agreguen de nuevo.
    cargo: get('cargo') || null,
    email: get('email'),
    whatsapp: get('whatsapp') || null,
    tamano: get('tamano') || null,
    resolver: get('resolver'),
    // Si llegó con "?ruta=" desde Onboardings o Consultoría (puede diferir de lo que terminó eligiendo).
    ruta_referido: get('ruta_referido') || null,
    comentarios: get('comentarios') || null,
  };

  const apiKey = import.meta.env.RESEND_API_KEY;
  const hasDb = dbConfigured();

  // 1. Intentar el mail (best-effort: si falla, no se corta el flujo).
  let resendStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
  let resendOk = false;
  if (apiKey) {
    const to = import.meta.env.CONTACT_TO || 'info@fedesconsultora.com';
    const from = import.meta.env.CONTACT_FROM || 'Web Fedes <onboarding@resend.dev>';
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
      const { error } = await new Resend(apiKey).emails.send({
        from,
        to,
        replyTo: fields.email,
        subject: `Sesión de diagnóstico: ${fields.empresa}`,
        html,
        text,
      });
      if (error) {
        console.error('[contacto] Resend error', error);
        resendStatus = 'failed';
      } else {
        resendStatus = 'sent';
        resendOk = true;
      }
    } catch (e) {
      console.error('[contacto] Resend exception', e);
      resendStatus = 'failed';
    }
  }

  // 2. Guardar el lead en el pipeline, sea cual sea el resultado del mail. Si el email ya existe,
  // el envío se suma a ese lead en lugar de duplicarlo (ver registrarFormulario).
  let dbOk = false;
  if (hasDb) {
    try {
      await registrarFormulario({ ...fields, resend_status: resendStatus });
      dbOk = true;
    } catch (e) {
      console.error('[contacto] Error al guardar el lead en la base', e);
    }
  }

  if (!hasDb && !apiKey) {
    // Ni base ni mail configurados: solo se acepta en desarrollo local, para poder probar el formulario.
    if (import.meta.env.DEV) {
      console.log('[contacto] (sin POSTGRES_URL ni RESEND_API_KEY)', fields);
      return json({ ok: true, dev: true });
    }
    return json({ ok: false, error: 'not_configured' }, 500);
  }

  if (!dbOk && !resendOk) {
    return json({ ok: false, error: 'send_failed' }, 502);
  }
  return json({ ok: true });
};

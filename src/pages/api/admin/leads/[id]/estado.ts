import type { APIRoute } from 'astro';
import { cambiarEstado } from '../../../../../lib/leads';
import { parseCambioEstado } from '../../../../../lib/pipeline';

// Cambio de estado desde el tablero del pipeline (arrastrar y soltar). Responde JSON.
// El middleware ya validó la sesión y el token CSRF (encabezado x-csrf-token).
export const prerender = false;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: 'El lead no existe.' }, 404);
  const cambio = parseCambioEstado(await request.formData());
  if (cambio.error) return json({ ok: false, error: cambio.error }, 400);
  await cambiarEstado(id, cambio.estado!, cambio.motivo ?? null, locals.admin!.id);
  return json({ ok: true, estado: cambio.estado });
};

import type { APIRoute } from 'astro';
import { envioDesdeToken } from '../../../../lib/mails-core';
import { destinoClic } from '../../../../lib/mails';

// Clic en un link de un mail: registra el clic y redirige. Solo a destinos fijos (landing,
// agenda, WhatsApp), así el link no se puede usar para mandar a otro sitio.
export const prerender = false;
const DESTINOS = new Set(['landing', 'agendar', 'whatsapp']);

export const GET: APIRoute = async ({ params, redirect }) => {
  const id = envioDesdeToken(params.token);
  if (!id || !DESTINOS.has(params.destino ?? '')) return redirect('/diagnostico/no-disponible', 302);
  const destino = await destinoClic(id, params.destino!);
  return redirect(destino ?? '/diagnostico/no-disponible', 302);
};

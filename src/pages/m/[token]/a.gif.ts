import type { APIRoute } from 'astro';
import { envioDesdeToken } from '../../../lib/mails-core';
import { registrarApertura } from '../../../lib/mails';

// Imagen de 1x1 que registra la apertura de un mail. Es un dato aproximado: algunos clientes
// precargan las imágenes (aperturas que no ocurrieron) y otros las bloquean.
export const prerender = false;

const GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0));

export const GET: APIRoute = async ({ params }) => {
  const id = envioDesdeToken(params.token);
  if (id) await registrarApertura(id);
  return new Response(GIF, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0' } });
};

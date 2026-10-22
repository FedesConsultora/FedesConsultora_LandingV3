import type { APIRoute } from 'astro';
import { REDIRECCIONES } from '../../content/campo';

// Redirecciones de los QR impresos (docs/10-landing-campo.md). Siempre 302 y sin caché, para poder
// cambiar el destino después de imprimir: el navegador no la guarda como permanente.
export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const destino = REDIRECCIONES[(params.origen ?? '').toLowerCase()];
  if (!destino) return new Response('Not Found', { status: 404 });
  return new Response(null, { status: 302, headers: { Location: destino, 'Cache-Control': 'no-store' } });
};

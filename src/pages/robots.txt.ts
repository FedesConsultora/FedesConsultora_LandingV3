import type { APIRoute } from 'astro';
import { renderRobotsTxt } from '../lib/robots-policy';

// Vista previa bloqueada. Producción indexable preserva exclusiones para todos los crawlers.
const indexable = import.meta.env.PUBLIC_INDEXABLE === 'true';

export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL('https://fedesconsultora.com')).origin;
  return new Response(renderRobotsTxt(indexable, origin), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

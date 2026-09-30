import type { APIRoute } from 'astro';

// Mientras el sitio esté en vista previa (PUBLIC_INDEXABLE distinto de "true") se bloquea todo.
// Al lanzar el dominio definitivo se habilita, incluidos los rastreadores de buscadores con IA.
const indexable = import.meta.env.PUBLIC_INDEXABLE === 'true';

export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL('https://fedesconsultora.com')).origin;
  const body = indexable
    ? [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        'Disallow: /admin',
        'Disallow: /diagnostico/',
        'Disallow: /m/',
        '',
        '# Buscadores y asistentes con IA: permitidos',
        'User-agent: GPTBot',
        'User-agent: OAI-SearchBot',
        'User-agent: ChatGPT-User',
        'User-agent: ClaudeBot',
        'User-agent: Claude-User',
        'User-agent: PerplexityBot',
        'User-agent: Google-Extended',
        'Allow: /',
        '',
        `Sitemap: ${base}/sitemap-index.xml`,
        '',
      ].join('\n')
    : ['User-agent: *', 'Disallow: /', ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

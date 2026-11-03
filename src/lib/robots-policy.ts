// Robots policy shared by generic and named AI crawlers.
// Named user-agent groups do not inherit Disallow directives from the * group.
export const privateCrawlerPaths = Object.freeze([
  '/api/',
  '/admin',
  '/diagnostico/',
  '/m/',
  '/r/',
]);

export function renderRobotsTxt(indexable: boolean, siteOrigin: string): string {
  if (!indexable) return 'User-agent: *\nDisallow: /\n';

  const origin = new URL(siteOrigin).origin;
  const publicRules = [
    'Allow: /',
    ...privateCrawlerPaths.map((path) => `Disallow: ${path}`),
  ];

  return [
    'User-agent: *',
    ...publicRules,
    '',
    '# Los asistentes y buscadores con IA pueden rastrear contenido público, nunca las rutas privadas.',
    'User-agent: GPTBot',
    'User-agent: OAI-SearchBot',
    'User-agent: ChatGPT-User',
    'User-agent: ClaudeBot',
    'User-agent: Claude-User',
    'User-agent: PerplexityBot',
    'User-agent: Google-Extended',
    ...publicRules,
    '',
    `Sitemap: ${origin}/sitemap-index.xml`,
    '',
  ].join('\n');
}

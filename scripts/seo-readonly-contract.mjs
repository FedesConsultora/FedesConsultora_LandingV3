// Read-only HTTP SEO/GEO contracts for the public Fedes site.
export const publicRoutes = Object.freeze(['/', '/consultoria', '/onboardings', '/casos', '/contacto']);
export const privateRobotsPaths = Object.freeze(['/api/', '/admin', '/diagnostico/', '/m/', '/r/']);
export const aiCrawlers = Object.freeze(['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Google-Extended']);
const hasRule = (group, rule) => group.split(/\r?\n/).some(line => line.trim() === rule);
const getGroups = text => text.split(/\r?\n\s*\r?\n/).filter(Boolean);
export function checkRobots(body, indexable, origin) {
  const errors = [];
  if (!indexable) {
    if (!/User-agent:\s*\*\s*\nDisallow:\s*\/(?:\s|$)/i.test(body)) errors.push('preview must disallow all');
    if (/Sitemap:/i.test(body)) errors.push('preview exposes sitemap');
    return errors;
  }
  const groups = getGroups(body);
  const general = groups.find(g => /^User-agent:\s*\*\s*$/m.test(g));
  const ai = groups.find(g => /^User-agent:\s*OAI-SearchBot\s*$/m.test(g));
  for (const [name, group] of [['generic', general], ['AI', ai]]) {
    if (!group) { errors.push('missing ' + name + ' group'); continue; }
    if (!hasRule(group, 'Allow: /')) errors.push(name + ' group lacks Allow: /');
    for (const path of privateRobotsPaths) {
      if (!hasRule(group, 'Disallow: ' + path)) errors.push(name + ' group lacks Disallow: ' + path);
    }
  }
  for (const bot of aiCrawlers) {
    if (!ai || !hasRule(ai, 'User-agent: ' + bot)) errors.push('missing AI bot ' + bot);
  }
  if (!body.includes('Sitemap: ' + origin + '/sitemap-index.xml')) errors.push('wrong sitemap origin');
  return errors;
}
export function checkPublicHtml(body, path, origin, indexable) {
  const errors = [];
  const h1Count = [...body.matchAll(/<h1(?:\s|>)/gi)].length;
  if (h1Count !== 1) errors.push('expected one H1, found ' + h1Count);
  if (!/<meta\b[^>]*name=["']description["'][^>]*>/i.test(body)) errors.push('missing meta description');
  const canonical = [...body.matchAll(/<link\b[^>]*>/gi)]
    .map(m => m[0]).find(tag => /\brel=["']canonical["']/i.test(tag));
  if (!canonical || !canonical.includes('href="' + origin + path + '"')) errors.push('wrong canonical');
  const noindex = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(body);
  if (indexable && noindex) errors.push('unexpected public noindex');
  if (!indexable && !noindex) errors.push('preview missing noindex');
  return errors;
}
export function checkQrRedirect(status, location, cacheControl, origin, source) {
  if (status !== 302) return ['expected HTTP 302'];
  let url;
  try { url = new URL(location || '', origin); }
  catch { return ['invalid Location']; }
  const errors = [];
  if (url.origin !== origin || url.pathname !== '/campo') errors.push('redirect must stay on /campo of same origin');
  if (url.searchParams.get('utm_source') !== source) errors.push('wrong utm_source');
  if (!cacheControl?.includes('no-store')) errors.push('missing no-store');
  return errors;
}
export function checkPrivateResponse(headers) {
  const errors = [];
  const cache = headers.get('cache-control') || '';
  const robots = headers.get('x-robots-tag') || '';
  const referrer = (headers.get('referrer-policy') || '').split(',').map(s => s.trim());
  if (!cache.includes('no-store')) errors.push('missing no-store');
  if (!robots.includes('noindex')) errors.push('missing X-Robots-Tag noindex');
  if (!referrer.length || referrer.some(v => v !== 'no-referrer')) errors.push('unsafe Referrer-Policy');
  return errors;
}

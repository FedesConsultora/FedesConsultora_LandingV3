import { test } from 'vitest';
import assert from 'node:assert/strict';
import { checkRobots, checkPublicHtml, checkQrRedirect, checkPrivateResponse, checkSitemapIndex, checkChildSitemap, aiCrawlers, privateRobotsPaths } from './seo-readonly-contract.mjs';

const origin = 'https://fedesconsultora.com';
const group = agents => [...agents.map(a => 'User-agent: ' + a), 'Allow: /', ...privateRobotsPaths.map(p => 'Disallow: ' + p)].join('\n');
const robots = () => group(['*']) + '\n\n' + group(aiCrawlers) + '\n\nSitemap: ' + origin + '/sitemap-index.xml\n';
test('robots protects routes in generic and AI-specific groups', () => {
  assert.deepEqual(checkRobots(robots(), true, origin), []);
  const broken = group(['*']) + '\n\nUser-agent: OAI-SearchBot\nAllow: /\nSitemap: ' + origin + '/sitemap-index.xml';
  assert.match(checkRobots(broken, true, origin).join(' '), /AI group lacks Disallow/);
});
test('preview blocks crawlers and removes sitemap', () => {
  assert.deepEqual(checkRobots('User-agent: *\nDisallow: /\n', false, origin), []);
  assert.ok(checkRobots('User-agent: *\nAllow: /\n', false, origin).length);
});
test('public SSR requires one H1, canonical, description and indexing', () => {
  const html = '<html><head><meta name="description" content="Descripción" /><link rel="canonical" href="' + origin + '/consultoria" /></head><body><h1>Consultoría</h1></body></html>';
  assert.deepEqual(checkPublicHtml(html, '/consultoria', origin, true), []);
  assert.ok(checkPublicHtml(html.replace('<h1>', '<h1>Duplicate</h1><h1>'), '/consultoria', origin, true).some(e => e.includes('H1')));
  assert.ok(checkPublicHtml(html, '/contacto', origin, true).some(e => e.includes('canonical')));
  assert.ok(checkPublicHtml(html, '/consultoria', origin, false).some(e => e.includes('noindex')));
});
test('QR remains 302 same-origin with UTM and no-store', () => {
  assert.deepEqual(checkQrRedirect(302, '/campo?utm_source=angus', 'no-store', origin, 'angus'), []);
  assert.ok(checkQrRedirect(301, '/campo?utm_source=angus', 'no-store', origin, 'angus').length);
  assert.ok(checkQrRedirect(302, 'https://evil.example/campo?utm_source=angus', 'no-store', origin, 'angus').length);
});
test('private Referrer-Policy allows safe duplicate and rejects weakened values', () => {
  const headers = new Headers({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer, no-referrer' });
  assert.deepEqual(checkPrivateResponse(headers), []);
  headers.set('referrer-policy', 'no-referrer, origin');
  assert.ok(checkPrivateResponse(headers).includes('unsafe Referrer-Policy'));
});

// Positive and negative fixtures: the index alone cannot prove page exclusions.
test('every same-origin sitemap child is required and only public pages may be listed', () => {
  const index = '<sitemapindex><sitemap><loc>' + origin + '/sitemap-0.xml</loc></sitemap></sitemapindex>';
  const result = checkSitemapIndex(index, origin);
  assert.deepEqual(result, { errors: [], paths: ['/sitemap-0.xml'] });
  assert.ok(checkSitemapIndex(index.replace(origin, 'https://external.example'), origin).errors.length);
  const good = '<urlset><url><loc>' + origin + '/consultoria</loc></url></urlset>';
  assert.deepEqual(checkChildSitemap(good, origin), []);
  assert.match(checkChildSitemap(good.replace('/consultoria', '/campo'), origin).join(' '), /excluded page/);
  assert.match(checkChildSitemap(good.replace('/consultoria', '/admin'), origin).join(' '), /excluded page/);
  assert.ok(checkChildSitemap('<urlset></urlset>', origin).length);
});

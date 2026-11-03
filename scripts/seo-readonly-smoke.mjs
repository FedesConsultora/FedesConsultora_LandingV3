// GET-only public site acceptance. Never sends forms/webhooks or credentials.
import { checkRobots, checkPublicHtml, checkQrRedirect, checkPrivateResponse, checkSitemapIndex, checkChildSitemap, publicRoutes } from './seo-readonly-contract.mjs';

const input = process.env.SEO_SMOKE_ORIGIN;
const expected = process.env.SEO_EXPECT_INDEXABLE;
if (!input || !['true', 'false'].includes(expected)) {
  console.error('Set SEO_SMOKE_ORIGIN=https://host and SEO_EXPECT_INDEXABLE=true|false.');
  process.exit(2);
}
let url;
try { url = new URL(input); }
catch { console.error('Invalid SEO_SMOKE_ORIGIN'); process.exit(2); }
if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
  console.error('SEO_SMOKE_ORIGIN must be an HTTPS origin without path/query/credentials.');
  process.exit(2);
}
const origin = url.origin, indexable = expected === 'true', failures = [];
const check = (name, problems) => {
  if (problems.length) { failures.push(name); console.error('FAIL ' + name + ': ' + problems.join('; ')); }
  else console.log('PASS ' + name);
};
const get = async path => {
  const response = await fetch(origin + path, {
    redirect: 'manual',
    signal: AbortSignal.timeout(12000),
    headers: { Accept: 'text/html,application/xml,text/plain' },
  });
  return { response, body: await response.text() };
};
const run = async (name, fn) => {
  try { await fn(); } catch (e) { check(name, [String(e?.message || e)]); }
};

await run('GET /robots.txt', async () => {
  const { response, body } = await get('/robots.txt');
  check('GET /robots.txt', [
    ...(response.status === 200 ? [] : ['HTTP ' + response.status]),
    ...checkRobots(body, indexable, origin),
  ]);
});
for (const path of publicRoutes) {
  await run('GET ' + path, async () => {
    const { response, body } = await get(path);
    check('GET ' + path, [
      ...(response.status === 200 ? [] : ['HTTP ' + response.status]),
      ...checkPublicHtml(body, path, origin, indexable),
    ]);
  });
}
await run('GET /campo', async () => {
  const { response, body } = await get('/campo');
  check('GET /campo', [
    ...(response.status === 200 ? [] : ['HTTP ' + response.status]),
    ...(!body.includes('CONSULTORÍA PARA EL AGRO') ? ['campaign markup missing'] : []),
    ...(!body.includes('rel="canonical"') ? ['campaign canonical missing'] : []),
  ]);
});
for (const source of ['larural', 'angus']) {
  await run('QR ' + source, async () => {
    const { response } = await get('/r/' + source);
    check('QR ' + source, checkQrRedirect(response.status, response.headers.get('location'), response.headers.get('cache-control'), origin, source));
  });
}
for (const path of ['/privacidad', '/terminos-y-condiciones']) {
  await run('legal ' + path, async () => {
    const { response, body } = await get(path);
    check('legal ' + path, [
      ...(response.status === 200 ? [] : ['HTTP ' + response.status]),
      ...(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(body) ? [] : ['legal draft must remain noindex']),
    ]);
  });
}
await run('GET /sitemap-index.xml', async () => {
  const { response, body } = await get('/sitemap-index.xml');
  const { errors, paths } = checkSitemapIndex(body, origin);
  check('GET /sitemap-index.xml', [
    ...(response.status === 200 ? [] : ['HTTP ' + response.status]),
    ...errors,
  ]);
  // Never follow arbitrary URLs supplied by an untrusted XML document.
  // Only bounded, same-origin /sitemap-N.xml paths are accepted above.
  for (const path of paths) {
    await run('GET ' + path, async () => {
      const child = await get(path);
      check('GET ' + path, [
        ...(child.response.status === 200 ? [] : ['HTTP ' + child.response.status]),
        ...checkChildSitemap(child.body, origin),
      ]);
    });
  }
});
await run('GET /llms.txt', async () => {
  const { response, body } = await get('/llms.txt');
  check('GET /llms.txt', [
    ...(response.status === 200 ? [] : ['HTTP ' + response.status]),
    ...(body.includes('Fedes Consultora') ? [] : ['wrong publisher']),
  ]);
});
for (const path of ['/diagnostico/token-invalido', '/m/token-invalido/baja']) {
  await run('private ' + path, async () => {
    const { response } = await get(path);
    check('private ' + path, checkPrivateResponse(response.headers));
  });
}
if (process.env.SEO_EXPECT_BUILD_SHA) {
  await run('GET /api/health', async () => {
    const { response, body } = await get('/api/health');
    let data;
    try { data = JSON.parse(body); } catch { data = {}; }
    check('GET /api/health', [
      ...(response.status === 200 ? [] : ['HTTP ' + response.status]),
      ...(data.service === 'fedesconsultora-web' ? [] : ['wrong service']),
      ...(data.build === process.env.SEO_EXPECT_BUILD_SHA ? [] : ['wrong deployed SHA']),
    ]);
  });
}
console.log('SEO read-only smoke: ' + (failures.length ? failures.length + ' checks failed' : 'all checks passed'));
if (failures.length) process.exitCode = 1;

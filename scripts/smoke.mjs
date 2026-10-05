const base = (process.env.SMOKE_BASE || 'http://127.0.0.1:4321').replace(/\/$/, '');
const origin = new URL(base).origin;
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push(ok);
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${name}${detail ? ` (${detail})` : ''}`);
};

for (const path of [
  '/', '/consultoria', '/onboardings', '/casos', '/contacto', '/privacidad',
  '/terminos-y-condiciones', '/robots.txt', '/sitemap-index.xml',
]) {
  try {
    const response = await fetch(`${base}${path}`, { redirect: 'manual' });
    check(`GET ${path}`, response.status === 200, `HTTP ${response.status}`);
    if (path === '/sitemap-index.xml') {
      const body = await response.text();
      check('sitemap excluye admin y landings privadas', !/\/admin|\/diagnostico\//.test(body));
    }
  } catch {
    check(`GET ${path}`, false, 'sin respuesta');
  }
}

try {
  const health = await fetch(`${base}/api/health`, { redirect: 'manual' });
  const json = await health.json();
  check('GET /api/health', health.status === 200 && json.ok === true && json.service === 'fedesconsultora-web');
} catch {
  check('GET /api/health', false, 'sin respuesta JSON válida');
}

try {
  const unsupported = await fetch(`${base}/api/contacto`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prueba: true }),
  });
  check('contacto rechaza Content-Type inesperado', unsupported.status === 415, `HTTP ${unsupported.status}`);

  const crossSite = await fetch(`${base}/api/contacto`, {
    method: 'POST',
    headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'prueba=1',
  });
  check('contacto rechaza Origin cross-site', crossSite.status === 403, `HTTP ${crossSite.status}`);

  const oversized = await fetch(`${base}/api/contacto`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `x=${'a'.repeat(300 * 1024)}`,
  });
  check('contacto rechaza cuerpos mayores a 256 KiB', oversized.status === 413, `HTTP ${oversized.status}`);
} catch {
  check('validaciones de contacto', false, 'sin respuesta');
}

try {
  const admin = await fetch(`${base}/admin`, { redirect: 'manual' });
  check('GET /admin sin sesión redirige', [302, 303, 307, 308].includes(admin.status) && (admin.headers.get('cache-control') || '').includes('no-store'));
} catch {
  check('GET /admin sin sesión redirige', false, 'sin respuesta');
}

for (const path of ['/diagnostico/token-invalido', '/m/token-invalido/baja']) {
  try {
    const response = await fetch(`${base}${path}`, { redirect: 'manual' });
    check(`${path} no indexable y no cacheable`,
      (response.headers.get('cache-control') || '').includes('no-store') &&
      (response.headers.get('x-robots-tag') || '').includes('noindex') &&
      response.headers.get('referrer-policy') === 'no-referrer');
  } catch {
    check(`${path} no indexable y no cacheable`, false, 'sin respuesta');
  }
}

try {
  const missing = await fetch(`${base}/ruta-que-no-existe`, { redirect: 'manual' });
  check('GET ruta inexistente devuelve 404', missing.status === 404, `HTTP ${missing.status}`);
} catch {
  check('GET ruta inexistente devuelve 404', false, 'sin respuesta');
}

if (checks.some((ok) => !ok)) process.exitCode = 1;

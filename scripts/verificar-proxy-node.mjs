const base = (process.env.PROXY_NODE_TEST_BASE || 'http://127.0.0.1:4322').replace(/\/$/, '');
const url = `${base}/api/contacto`;
const body = new URLSearchParams({ incomplete: 'test' });
const proxyHeaders = {
  Host: 'fedesconsultora.com',
  Origin: 'https://fedesconsultora.com',
  'Content-Type': 'application/x-www-form-urlencoded',
  'X-Real-IP': '198.51.100.20',
  'X-Forwarded-For': '198.51.100.20',
  'X-Forwarded-Host': 'fedesconsultora.com',
  'X-Forwarded-Proto': 'https',
  'X-Forwarded-Port': '443',
};
const send = (headers) => fetch(url, { method: 'POST', headers, body, redirect: 'manual' });

const trusted = await send(proxyHeaders);
if (trusted.status !== 400) {
  console.error(`FALLA: Origin HTTPS con headers del proxy debe pasar el control de origen y llegar a validación del formulario (400); llegó ${trusted.status}.`);
  process.exit(1);
}

const crossSite = await send({ ...proxyHeaders, Origin: 'https://attacker.example' });
if (crossSite.status !== 403) {
  console.error(`FALLA: Origin externo debe rechazarse (403); llegó ${crossSite.status}.`);
  process.exit(1);
}

const forgedForwarded = await send({ ...proxyHeaders, 'X-Forwarded-Host': 'attacker.example', 'X-Forwarded-Proto': 'http', 'X-Forwarded-Port': '80' });
if (forgedForwarded.status !== 403) {
  console.error(`FALLA: forwarded host/proto arbitrarios no deben hacer pasar un Origin HTTPS canónico; llegó ${forgedForwarded.status}.`);
  process.exit(1);
}

console.log('OK: Astro acepta Origin HTTPS con forwarded canónicos y rechaza Origin y forwarded spoofeados.');

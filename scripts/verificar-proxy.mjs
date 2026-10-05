const base = (process.env.PROXY_TEST_BASE || 'https://fedesconsultora.com').replace(/\/$/, '');
const url = `${base}/api/contacto`;
const form = new URLSearchParams({ campo_inexistente: 'prueba' });
const send = (headers) => fetch(url, { method: 'POST', headers, body: form, redirect: 'manual' });
const headers = {
  Origin: 'https://fedesconsultora.com',
  'X-Forwarded-Host': 'attacker.example',
  'X-Forwarded-Proto': 'http',
  'X-Forwarded-Port': '80',
  'X-Forwarded-For': '198.51.100.99',
};

const trustedOrigin = await send(headers);
if (trustedOrigin.status === 403) {
  console.error('FALLA: el proxy no reconstruyó el origen HTTPS canónico o aceptó forwarded spoofing.');
  process.exit(1);
}
if (trustedOrigin.status !== 400) {
  console.error(`FALLA: se esperaba HTTP 400 por formulario incompleto; se recibió ${trustedOrigin.status}.`);
  process.exit(1);
}

const crossSite = await send({ ...headers, Origin: 'https://attacker.example' });
if (crossSite.status !== 403) {
  console.error(`FALLA: se esperaba HTTP 403 para Origin externo; se recibió ${crossSite.status}.`);
  process.exit(1);
}

console.log('OK: HTTPS público pasa el chequeo de origen tras proxy y Origin externo se rechaza.');

const base = (process.env.SMOKE_BASE || 'http://127.0.0.1:4321').replace(/\/$/, '');
const origin = new URL(base).origin;
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push(ok);
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${name}${detail ? ` (${detail})` : ''}`);
};

for (const path of [
  '/', '/consultoria', '/onboardings', '/casos', '/contacto', '/privacidad',
  '/terminos-y-condiciones', '/robots.txt', '/sitemap-index.xml', '/campo',
]) {
  try {
    const response = await fetch(`${base}${path}`, { redirect: 'manual' });
    check(`GET ${path}`, response.status === 200, `HTTP ${response.status}`);
    if (path === '/sitemap-index.xml') {
      const body = await response.text();
      check(
        'sitemap excluye admin, landings privadas y páginas provisionales',
        !/\/admin|\/diagnostico\/|\/nosotros|\/privacidad|\/terminos-y-condiciones|\/campo/.test(body),
      );
    }
  } catch {
    check(`GET ${path}`, false, 'sin respuesta');
  }
}

for (const [legacy, target] of [
  ['/agencia', '/consultoria'],
  ['/consultora', '/consultoria'],
  ['/hablemos', '/contacto'],
  ['/onboarding-empresas', '/onboardings'],
]) {
  try {
    const response = await fetch(`${base}${legacy}`, { redirect: 'manual' });
    check(`${legacy} redirige a ${target}`,
      [301, 302, 307, 308].includes(response.status) &&
      new URL(response.headers.get('location') || '/', base).pathname === target,
      `HTTP ${response.status}`);
  } catch {
    check(`${legacy} redirige a ${target}`, false, 'sin respuesta');
  }
}

// QR de los avisos en revistas: 302 (temporal) hacia /campo con sus UTM, y textos según el origen.
for (const origen of ['larural', 'angus']) {
  try {
    const response = await fetch(`${base}/r/${origen}`, { redirect: 'manual' });
    const location = new URL(response.headers.get('location') || '/', base);
    check(`/r/${origen} redirige con 302 a /campo`,
      response.status === 302 && location.pathname === '/campo' && location.searchParams.get('utm_source') === origen,
      `HTTP ${response.status}`);
  } catch {
    check(`/r/${origen} redirige con 302 a /campo`, false, 'sin respuesta');
  }
}

for (const [query, esperado, etiqueta] of [
  ['?utm_source=larural', 'Marketing', true],
  ['?utm_source=angus', 'El rodeo lo manejás vos.', true],
  ['', 'Que tu empresa funcione aunque estés en el campo.', false],
]) {
  try {
    const body = await (await fetch(`${base}/campo${query}`)).text();
    check(`/campo${query || ' (general)'} muestra sus textos`,
      body.includes(esperado) && body.includes('Viste nuestro aviso en') === etiqueta);
  } catch {
    check(`/campo${query || ' (general)'} muestra sus textos`, false, 'sin respuesta');
  }
}

try {
  const health = await fetch(`${base}/api/health`, { redirect: 'manual' });
  const json = await health.json();
  check('GET /api/health', health.status === 200 && json.status === 'ok' && json.service === 'fedesconsultora-web' && typeof json.build === 'string');
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

  const baseForm = {
    nombre: 'Release Test',
    empresa: 'Synthetic SA',
    email: 'release@example.test',
    tamano: 'Hasta 10 empleados',
    resolver: 'Tecnología',
  };
  const invalidPrivacy = await fetch(`${base}/api/contacto`, {
    method: 'POST',
    headers: { Origin: origin },
    body: new URLSearchParams({ ...baseForm, privacidad: 'off' }),
  });
  check('contacto exige consentimiento exacto', invalidPrivacy.status === 400, `HTTP ${invalidPrivacy.status}`);

  const invalidChoice = await fetch(`${base}/api/contacto`, {
    method: 'POST',
    headers: { Origin: origin },
    body: new URLSearchParams({ ...baseForm, resolver: 'Opción inventada', privacidad: 'on' }),
  });
  check('contacto rechaza opciones fuera de lista', invalidChoice.status === 400, `HTTP ${invalidChoice.status}`);

  const duplicateFields = new URLSearchParams({ ...baseForm, privacidad: 'on' });
  duplicateFields.append('email', 'otro@example.test');
  const duplicated = await fetch(`${base}/api/contacto`, {
    method: 'POST',
    headers: { Origin: origin },
    body: duplicateFields,
  });
  check('contacto rechaza campos controlados repetidos', duplicated.status === 400, `HTTP ${duplicated.status}`);
} catch {
  check('validaciones de contacto', false, 'sin respuesta');
}

try {
  const wrongType = await fetch(`${base}/api/webhooks/resend`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'text/plain' },
    body: 'not-json',
  });
  check('webhook rechaza Content-Type inesperado', wrongType.status === 415, `HTTP ${wrongType.status}`);

  const invalidSignature = await fetch(`${base}/api/webhooks/resend`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'email.delivered', data: { email_id: 're_invalid_signature' } }),
  });
  check('webhook rechaza firma ausente', invalidSignature.status === 401, `HTTP ${invalidSignature.status}`);

  const oversizedWebhook = await fetch(`${base}/api/webhooks/resend`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ padding: 'x'.repeat(1024 * 1024) }),
  });
  check('webhook rechaza cuerpos mayores a 1 MiB', oversizedWebhook.status === 413, `HTTP ${oversizedWebhook.status}`);
} catch {
  check('validaciones del webhook', false, 'sin respuesta');
}

try {
  const admin = await fetch(`${base}/admin`, { redirect: 'manual' });
  check('GET /admin sin sesión redirige', [302, 303, 307, 308].includes(admin.status) && (admin.headers.get('cache-control') || '').includes('no-store'));
} catch {
  check('GET /admin sin sesión redirige', false, 'sin respuesta');
}

// En producción Nginx y la app agregan Referrer-Policy con el mismo valor, y fetch los une como
// "no-referrer, no-referrer". Vale si todas las copias dicen no-referrer; cualquier otro valor falla.
const soloNoReferrer = (valor) => {
  const copias = (valor || '').split(',').map((v) => v.trim());
  return copias.length > 0 && copias.every((v) => v === 'no-referrer');
};

for (const path of ['/diagnostico/token-invalido', '/m/token-invalido/baja']) {
  try {
    const response = await fetch(`${base}${path}`, { redirect: 'manual' });
    check(`${path} no indexable y no cacheable`,
      (response.headers.get('cache-control') || '').includes('no-store') &&
      (response.headers.get('x-robots-tag') || '').includes('noindex') &&
      soloNoReferrer(response.headers.get('referrer-policy')),
      `Referrer-Policy: ${response.headers.get('referrer-policy') ?? 'ausente'}`);
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

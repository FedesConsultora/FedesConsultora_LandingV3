import { beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(() => vi.stubEnv('SESSION_SECRET', 'secreto-de-prueba'));

const { envioDesdeToken, motivoNoEnviable, renderHtml, renderTexto, tienePendientes, tokenEnvio, usaLanding, variablesDe } = await import('./mails-core');

const ctx = {
  nombre: 'Ana María Ejemplo',
  empresa: 'Empresa <Ficticia> & Cía',
  etapas: 'Caso anónimo del sector',
  links: { landing: 'https://sitio.test/m/1.abc/ir/landing', agendar: 'https://sitio.test/m/1.abc/ir/agendar' },
};
const marco = { botonLanding: 'Ver mi diagnóstico', botonAgendar: 'Agendar reunión', pie: '[TEXTO LEGAL PENDIENTE]', bajaTexto: 'No quiero recibir más comunicaciones', bajaUrl: 'https://sitio.test/m/1.abc/baja', pixelUrl: 'https://sitio.test/m/1.abc/a.gif' };

describe('variables', () => {
  it('detecta las usadas y las desconocidas', () => {
    expect(variablesDe('Hola {{nombre}}, {{ empresa }} y {{precio}}')).toEqual({ usadas: ['nombre', 'empresa', 'precio'], desconocidas: ['precio'] });
    expect(usaLanding('Mirá {{link_landing}}')).toBe(true);
    expect(usaLanding('Hola {{nombre}}')).toBe(false);
  });

  it('reemplaza en texto plano, con el primer nombre para el saludo', () => {
    expect(renderTexto('Hola, {{nombre}}: {{etapas}}. {{link_landing}}', ctx)).toBe(
      'Hola, Ana: Caso anónimo del sector. https://sitio.test/m/1.abc/ir/landing',
    );
  });
});

describe('HTML', () => {
  const html = renderHtml('Hola, {{nombre}} de {{empresa}}:\n<script>alert(1)</script>\n\n{{link_landing}}\n\nO agendá acá: {{link_agendar}}', ctx, marco);

  it('escapa todo el texto (nombres, empresa y lo escrito en la plantilla)', () => {
    expect(html).toContain('Empresa &lt;Ficticia&gt; &amp; Cía');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('un link solo en su párrafo es un botón; dentro de una frase, un enlace', () => {
    expect(html).toContain('>Ver mi diagnóstico</a>');
    expect(html).toContain('O agendá acá: <a href="https://sitio.test/m/1.abc/ir/agendar"');
  });

  it('lleva el pie, el enlace de baja y la imagen de apertura', () => {
    expect(html).toContain('[TEXTO LEGAL PENDIENTE]');
    expect(html).toContain('href="https://sitio.test/m/1.abc/baja"');
    expect(html).toContain('src="https://sitio.test/m/1.abc/a.gif"');
  });

  it('sin landing, el botón de la landing no se dibuja', () => {
    expect(renderHtml('{{link_landing}}', { ...ctx, links: { agendar: 'x' } }, marco)).not.toContain('Ver mi diagnóstico');
  });
});

describe('marcadores pendientes', () => {
  it('detecta [PENDIENTE], [TEXTO LEGAL PENDIENTE] y [CONFIRMAR]', () => {
    expect(tienePendientes('Hola', '[PENDIENTE] Asunto')).toBe(true);
    expect(tienePendientes('[TEXTO LEGAL PENDIENTE]')).toBe(true);
    expect(tienePendientes('dato [CONFIRMAR]')).toBe(true);
    expect(tienePendientes('Texto listo, sin marcadores.')).toBe(false);
  });
});

describe('links firmados', () => {
  it('el token lleva el id y una firma que no se puede alterar', () => {
    const t = tokenEnvio(42);
    expect(envioDesdeToken(t)).toBe(42);
    expect(envioDesdeToken(t.replace(/^42/, '43'))).toBeNull();
    expect(envioDesdeToken(`42.${'0'.repeat(32)}`)).toBeNull();
    expect(envioDesdeToken('42')).toBeNull();
    expect(envioDesdeToken(undefined)).toBeNull();
  });
});

describe('a quién se le puede escribir', () => {
  const ok = { email: 'a@ejemplo.test', consentimiento_el: new Date(), baja_el: null, rebote_el: null };
  it('solo con email, consentimiento, sin baja y sin rebote', () => {
    expect(motivoNoEnviable(ok)).toBeNull();
    expect(motivoNoEnviable({ ...ok, email: null })).toMatch(/email/);
    expect(motivoNoEnviable({ ...ok, consentimiento_el: null })).toMatch(/consentimiento/);
    expect(motivoNoEnviable({ ...ok, baja_el: new Date() })).toMatch(/no recibir/);
    expect(motivoNoEnviable({ ...ok, rebote_el: new Date() })).toMatch(/rebotó/);
  });
});

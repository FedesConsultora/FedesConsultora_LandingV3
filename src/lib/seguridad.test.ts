import { beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  vi.stubEnv('SESSION_SECRET', 'secreto-de-prueba');
});

const { hashPassword, randomToken, safeEqual, sha256, verifyPassword } = await import('./seguridad');
const { csrfToken, csrfValid, safeNext } = await import('./auth');

describe('contraseñas', () => {
  it('verifica la contraseña correcta y rechaza otra', () => {
    const stored = hashPassword('una contraseña larga');
    expect(verifyPassword('una contraseña larga', stored)).toBe(true);
    expect(verifyPassword('otra contraseña', stored)).toBe(false);
  });

  it('usa una sal distinta cada vez', () => {
    expect(hashPassword('igual')).not.toBe(hashPassword('igual'));
  });

  it('rechaza cuando el usuario no existe (sin hash guardado)', () => {
    expect(verifyPassword('cualquiera', null)).toBe(false);
    expect(verifyPassword('cualquiera', undefined)).toBe(false);
  });

  it('rechaza un hash mal formado', () => {
    expect(verifyPassword('x', 'sin-separador')).toBe(false);
  });
});

describe('tokens', () => {
  it('genera 256 bits en base64url, sin repetirse', () => {
    const a = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(a);
  });

  it('sha256 es determinístico', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).toHaveLength(64);
  });

  it('safeEqual compara contenido y largo', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('CSRF', () => {
  it('acepta el token de la propia sesión y rechaza el de otra', () => {
    const sesion = randomToken();
    expect(csrfValid(sesion, csrfToken(sesion))).toBe(true);
    expect(csrfValid(sesion, csrfToken(randomToken()))).toBe(false);
  });

  it('rechaza un token vacío o ausente', () => {
    const sesion = randomToken();
    expect(csrfValid(sesion, '')).toBe(false);
    expect(csrfValid(sesion, null)).toBe(false);
  });
});

describe('safeNext', () => {
  it('deja pasar rutas del panel', () => {
    expect(safeNext('/admin')).toBe('/admin');
    expect(safeNext('/admin/leads/3')).toBe('/admin/leads/3');
  });

  it('bloquea destinos externos o fuera del panel', () => {
    for (const next of ['https://otro-sitio.com', '//otro-sitio.com', '/\\otro-sitio.com', '/contacto', '', null]) {
      expect(safeNext(next)).toBe('/admin');
    }
  });
});

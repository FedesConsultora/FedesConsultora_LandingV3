import { randomBytes } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  vi.stubEnv('SESSION_SECRET', 'secreto-de-prueba');
  vi.stubEnv('LANDING_TOKEN_KEY', randomBytes(32).toString('base64'));
});

const { cifrarToken, descifrarToken, formatoTokenValido, hashToken, nuevoToken } = await import('./tokens');
const { bloqueDesdeForm, problemasParaAprobar, revisarTextos } = await import('./bloques');

const form = (campos: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const x of [v].flat()) f.append(k, x);
  return f;
};

describe('tokens de landing', () => {
  it('genera 256 bits, con hash y copia cifrada que se puede descifrar', () => {
    const { token, hash, cifrado } = nuevoToken();
    expect(formatoTokenValido(token)).toBe(true);
    expect(hash).toBe(hashToken(token));
    expect(cifrado).not.toContain(token);
    expect(descifrarToken(cifrado)).toBe(token);
  });

  it('cada cifrado usa un vector distinto', () => {
    const { token } = nuevoToken();
    expect(cifrarToken(token)).not.toBe(cifrarToken(token));
  });

  it('detecta una copia cifrada adulterada', () => {
    const [v, iv, tag, datos] = cifrarToken(nuevoToken().token).split(':');
    const alterado = [v, iv, tag, datos.slice(0, -2) + (datos.endsWith('AA') ? 'BB' : 'AA')].join(':');
    expect(() => descifrarToken(alterado)).toThrow();
  });

  it('no descifra con otra clave', () => {
    const cifrado = cifrarToken(nuevoToken().token);
    vi.stubEnv('LANDING_TOKEN_KEY', randomBytes(32).toString('base64'));
    expect(() => descifrarToken(cifrado)).toThrow();
  });

  it('descarta formatos inválidos antes de consultar la base', () => {
    for (const t of [undefined, '', 'corto', 'x'.repeat(44), `${'a'.repeat(42)}/`, "a'; DROP TABLE landings;--"]) {
      expect(formatoTokenValido(t)).toBe(false);
    }
  });
});

describe('bloques', () => {
  it('arma cada tipo desde el formulario del editor', () => {
    expect(bloqueDesdeForm('parrafo', form({ texto: '  Hola  ' })).bloque).toEqual({ tipo: 'parrafo', texto: 'Hola' });
    expect(bloqueDesdeForm('lista', form({ items: 'uno\n\n dos \n' })).bloque).toEqual({ tipo: 'lista', items: ['uno', 'dos'] });
    expect(bloqueDesdeForm('separador', form({})).bloque).toEqual({ tipo: 'separador' });
    expect(bloqueDesdeForm('cta', form({ texto: 'Agendar', destino: 'agendar' })).bloque?.tipo).toBe('cta');
  });

  it('arma tablas con el ancho del encabezado', () => {
    const { bloque } = bloqueDesdeForm('tabla', form({ tabla: 'Área | Prioridad\nVentas | Alta | extra\nMarca' }));
    expect(bloque).toEqual({ tipo: 'tabla', encabezados: ['Área', 'Prioridad'], filas: [['Ventas', 'Alta'], ['Marca', '']] });
  });

  it('rechaza bloques vacíos y devuelve lo escrito para volver a mostrarlo', () => {
    const r = bloqueDesdeForm('parrafo', form({ texto: '   ' }));
    expect(r.bloque).toBeUndefined();
    expect(r.error).toBeDefined();
    expect(r.crudo).toEqual({ tipo: 'parrafo', texto: '   ' });
  });

  it('solo acepta rutas y onboardings vigentes, y de la misma ruta', () => {
    const ok = bloqueDesdeForm('ruta', form({ ruta: 'Mercado y marca', onboardings: ['Onboarding Digital'], porque: 'Motivo' }));
    expect(ok.bloque).toBeDefined();
    const otraRuta = bloqueDesdeForm('ruta', form({ ruta: 'Mercado y marca', onboardings: ['Onboarding Financiero'], porque: 'x' }));
    expect(otraRuta.error).toMatch(/de la ruta elegida/);
    const inexistente = bloqueDesdeForm('ruta', form({ ruta: 'Full Fedes', onboardings: ['Onboarding Digital'], porque: 'x' }));
    expect(inexistente.bloque).toBeUndefined();
  });

  it('rechaza tipos desconocidos y destinos de botón no permitidos', () => {
    expect(bloqueDesdeForm('html', form({ texto: '<script>' })).error).toBeDefined();
    expect(bloqueDesdeForm('cta', form({ texto: 'Ir', destino: 'https://otro-sitio.com' })).error).toBeDefined();
  });
});

describe('control de contenido antes de aprobar', () => {
  it('detecta cada regla de CLAUDE.md', () => {
    expect(revisarTextos(['Muy buen resultado 🚀'])).toContain('tiene emojis');
    expect(revisarTextos(['© Fedes Consultora ® ™'])).toEqual([]);
    for (const t of ['Cuesta $ 1.500.000', 'USD 3000', 'son 500 dólares', '2000 pesos por mes', '1.200 USD']) {
      expect(revisarTextos([t]), t).toContain('menciona montos o precios');
    }
    expect(revisarTextos(['Somos una agencia'])).toContain('usa la palabra «agencia»');
    expect(revisarTextos(['Más posteos y likes'])).toContain('habla de posteos o likes');
    expect(revisarTextos(['Empresa B certificada'])).toContain('menciona la certificación Empresa B');
    expect(revisarTextos(['Te sugerimos Full Fedes'])).toContain('usa el nombre de un combo discontinuado');
  });

  it('no marca textos válidos con cifras y plazos', () => {
    expect(revisarTextos(['Una reducción de hasta el 50% en 60 días, y cerca del 16% de la facturación.'])).toEqual([]);
    expect(revisarTextos(['Evaluamos pricing, oferta y oportunidades de expansión.'])).toEqual([]);
  });

  it('no deja aprobar una etapa vacía o con bloques incompletos', () => {
    expect(problemasParaAprobar('Resultados', [])).toEqual(['no tiene contenido']);
    expect(problemasParaAprobar('Resultados', [{ tipo: 'parrafo', texto: '' }])).toEqual(['hay bloques incompletos o con errores']);
    expect(problemasParaAprobar('Resultados', [{ tipo: 'parrafo', texto: 'Hallazgo principal.' }])).toEqual([]);
  });

  it('revisa también el título de la etapa', () => {
    expect(problemasParaAprobar('Tu plan de 🚀', [{ tipo: 'parrafo', texto: 'Texto.' }])).toContain('tiene emojis');
  });
});

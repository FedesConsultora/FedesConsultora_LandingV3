import { describe, expect, it } from 'vitest';
import { completarSemanas, embudo, etiquetaSemana, maximoEje, porcentaje, ultimasSemanas } from './graficos';

describe('embudo', () => {
  it('calcula el paso respecto de la etapa anterior', () => {
    const e = embudo([
      { clave: 'a', etiqueta: 'A', n: 40 },
      { clave: 'b', etiqueta: 'B', n: 22 },
      { clave: 'c', etiqueta: 'C', n: 0 },
      { clave: 'd', etiqueta: 'D', n: 0 },
    ]);
    expect(e.map((x) => x.paso)).toEqual([null, 55, 0, null]);
  });
});

describe('porcentaje', () => {
  it('redondea y no divide por cero', () => {
    expect(porcentaje(3, 12)).toBe(25);
    expect(porcentaje(1, 3)).toBe(33);
    expect(porcentaje(0, 0)).toBeNull();
  });
});

describe('semanas', () => {
  it('arma las últimas semanas empezando en lunes', () => {
    // 29/09/2026 es martes: la semana arranca el lunes 28.
    expect(ultimasSemanas('2026-09-29', 3)).toEqual(['2026-09-14', '2026-09-21', '2026-09-28']);
    expect(ultimasSemanas('2026-09-28', 1)).toEqual(['2026-09-28']);
    expect(ultimasSemanas('2026-10-04', 1)).toEqual(['2026-09-28']); // domingo
  });

  it('completa con ceros y suma el total', () => {
    const r = completarSemanas(
      ['2026-09-21', '2026-09-28'],
      [
        { semana: '2026-09-28', serie: 'web', n: 2 },
        { semana: '2026-09-28', serie: 'linkedin', n: 1 },
      ],
      ['web', 'linkedin', 'otras'] as const,
    );
    expect(r).toEqual([
      { semana: '2026-09-21', valores: { web: 0, linkedin: 0, otras: 0 }, total: 0 },
      { semana: '2026-09-28', valores: { web: 2, linkedin: 1, otras: 0 }, total: 3 },
    ]);
  });

  it('etiqueta corta', () => {
    expect(etiquetaSemana('2026-09-07')).toBe('7/9');
  });
});

describe('maximoEje', () => {
  it('redondea hacia arriba a 1, 2, 5 o 10', () => {
    expect([0, 1, 3, 7, 12, 40, 51].map(maximoEje)).toEqual([1, 1, 5, 10, 20, 50, 100]);
  });
});

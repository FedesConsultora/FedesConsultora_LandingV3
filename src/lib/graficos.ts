// Cálculos de los gráficos del inicio (sin acceso a la base: se prueban aislados).

export type PasoEmbudo = { clave: string; etiqueta: string; n: number; paso: number | null };

// Porcentaje de paso respecto de la etapa anterior (null en la primera o si la anterior es 0).
export function embudo(etapas: { clave: string; etiqueta: string; n: number }[]): PasoEmbudo[] {
  return etapas.map((e, i) => {
    const anterior = i > 0 ? etapas[i - 1].n : 0;
    return { ...e, paso: i === 0 || anterior === 0 ? null : Math.round((e.n / anterior) * 100) };
  });
}

export const porcentaje = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : null);

// Semanas (lunes, AAAA-MM-DD) de las últimas `cantidad`, terminando en la semana de `hoy`.
export function ultimasSemanas(hoy: string, cantidad: number) {
  const [a, m, d] = hoy.split('-').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  const diaSemana = (fecha.getUTCDay() + 6) % 7; // lunes = 0
  fecha.setUTCDate(fecha.getUTCDate() - diaSemana);
  return Array.from({ length: cantidad }, (_, i) => {
    const s = new Date(fecha);
    s.setUTCDate(fecha.getUTCDate() - (cantidad - 1 - i) * 7);
    return s.toISOString().slice(0, 10);
  });
}

// Completa las semanas sin datos con ceros, para que el eje sea continuo.
export function completarSemanas<S extends string>(
  semanas: string[],
  filas: { semana: string; serie: S; n: number }[],
  series: readonly S[],
) {
  return semanas.map((semana) => {
    const valores = Object.fromEntries(series.map((s) => [s, 0])) as Record<S, number>;
    for (const f of filas) if (f.semana === semana && f.serie in valores) valores[f.serie] += f.n;
    const total = series.reduce((acc, s) => acc + valores[s], 0);
    return { semana, valores, total };
  });
}

// Máximo "redondo" para el eje: 1, 2, 5, 10, 20, 50... por encima del valor.
export function maximoEje(valor: number) {
  if (valor <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(valor));
  return ([1, 2, 5, 10].map((f) => f * base).find((m) => m >= valor) ?? 10 * base);
}

// Etiqueta corta de una semana: "22/9".
export const etiquetaSemana = (lunes: string) => {
  const [, m, d] = lunes.split('-').map(Number);
  return `${d}/${m}`;
};

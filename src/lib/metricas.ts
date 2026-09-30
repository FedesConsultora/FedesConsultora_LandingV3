// Métricas del inicio del panel: indicadores, embudo del pipeline y leads nuevos por semana.
// Fechas en hora de Buenos Aires.
import { db } from './db';
import { completarSemanas, embudo, porcentaje, ultimasSemanas } from './graficos';

const TZ = 'America/Argentina/Buenos_Aires';
export const DIAS_EMBUDO = 90;

// Hasta qué etapa llegó cada lead: el máximo de su historial (y de su estado actual), sin contar
// "Perdido". Así un lead perdido después de la sesión cuenta como que llegó a la sesión.
// Es SQL fijo de este archivo (sin datos del usuario): se inserta con unsafe().
const NIVEL = `CASE h.estado
  WHEN 'identificado' THEN 0 WHEN 'contactado' THEN 1 WHEN 'respondio' THEN 2 WHEN 'agendo' THEN 3
  WHEN 'sesion_realizada' THEN 4 WHEN 'propuesta' THEN 5 WHEN 'onboarding' THEN 6 END`;

export async function indicadores() {
  const [[leads], [sesiones], [landings], [cohorte]] = await Promise.all([
    db()`
      SELECT count(*) FILTER (WHERE estado NOT IN ('onboarding', 'perdido'))::int AS activos,
             count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS nuevos_semana
      FROM leads
    `,
    db()`
      SELECT count(*) FILTER (WHERE fecha_sesion >= now() AND fecha_sesion < now() + interval '7 days')::int AS proximas,
             count(*) FILTER (WHERE fecha_sesion < now())::int AS sin_marcar
      FROM leads WHERE estado = 'agendo'
    `,
    db()`
      SELECT count(*)::int AS entregadas,
             count(*) FILTER (WHERE EXISTS (SELECT 1 FROM eventos v WHERE v.landing_id = l.id AND v.tipo = 'visita'))::int AS con_visitas
      FROM landings l WHERE l.entregada_el IS NOT NULL AND l.estado <> 'revocada'
    `,
    db()`
      WITH niveles AS (
        SELECT l.id, max(${db().unsafe(NIVEL)}) AS nivel
        FROM leads l
        LEFT JOIN (SELECT lead_id, estado_nuevo AS estado FROM historial_estados UNION ALL SELECT id, estado FROM leads) h
          ON h.lead_id = l.id AND h.estado <> 'perdido'
        WHERE l.created_at > now() - make_interval(days => ${DIAS_EMBUDO})
        GROUP BY l.id
      )
      SELECT count(*) FILTER (WHERE nivel >= 4)::int AS con_sesion, count(*) FILTER (WHERE nivel >= 6)::int AS clientes FROM niveles
    `,
  ]);
  return {
    activos: leads.activos as number,
    nuevosSemana: leads.nuevos_semana as number,
    sesionesProximas: sesiones.proximas as number,
    sesionesSinMarcar: sesiones.sin_marcar as number,
    landingsEntregadas: landings.entregadas as number,
    landingsConVisitas: landings.con_visitas as number,
    conSesion: cohorte.con_sesion as number,
    clientes: cohorte.clientes as number,
    conversion: porcentaje(cohorte.clientes, cohorte.con_sesion),
  };
}

// Embudo de los leads creados en los últimos DIAS_EMBUDO días: cuántos llegaron a cada etapa.
export async function embudoPipeline() {
  const [r] = await db()`
    WITH niveles AS (
      SELECT l.id, COALESCE(max(${db().unsafe(NIVEL)}), 0) AS nivel
      FROM leads l
      LEFT JOIN (SELECT lead_id, estado_nuevo AS estado FROM historial_estados UNION ALL SELECT id, estado FROM leads) h
        ON h.lead_id = l.id AND h.estado <> 'perdido'
      WHERE l.created_at > now() - make_interval(days => ${DIAS_EMBUDO})
      GROUP BY l.id
    )
    SELECT count(*)::int AS contacto,
           count(*) FILTER (WHERE nivel >= 3)::int AS agendo,
           count(*) FILTER (WHERE nivel >= 4)::int AS sesion,
           count(*) FILTER (WHERE id IN (SELECT lead_id FROM landings WHERE entregada_el IS NOT NULL))::int AS landing,
           count(*) FILTER (WHERE nivel >= 5)::int AS propuesta,
           count(*) FILTER (WHERE nivel >= 6)::int AS cliente
    FROM niveles
  `;
  return embudo([
    { clave: 'contacto', etiqueta: 'Contacto', n: r.contacto },
    { clave: 'agendo', etiqueta: 'Sesión agendada', n: r.agendo },
    { clave: 'sesion', etiqueta: 'Sesión realizada', n: r.sesion },
    { clave: 'landing', etiqueta: 'Landing entregada', n: r.landing },
    { clave: 'propuesta', etiqueta: 'Propuesta', n: r.propuesta },
    { clave: 'cliente', etiqueta: 'Cliente', n: r.cliente },
  ]);
}

// Series del gráfico por fuente: en orden fijo (el color sigue a la serie, no a su tamaño).
export const SERIES_FUENTE = [
  { clave: 'web', etiqueta: 'Web' },
  { clave: 'linkedin', etiqueta: 'LinkedIn' },
  { clave: 'otras', etiqueta: 'Otras' },
] as const;
type Serie = (typeof SERIES_FUENTE)[number]['clave'];

export async function leadsPorSemana(semanas = 12) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const lista = ultimasSemanas(hoy, semanas);
  const filas = await db()`
    SELECT date_trunc('week', created_at AT TIME ZONE ${TZ})::date::text AS semana,
           CASE WHEN fuente IN ('web', 'linkedin') THEN fuente ELSE 'otras' END AS serie,
           count(*)::int AS n
    FROM leads
    WHERE (created_at AT TIME ZONE ${TZ})::date >= ${lista[0]}::date
    GROUP BY 1, 2
  `;
  return completarSemanas(lista, filas as { semana: string; serie: Serie; n: number }[], SERIES_FUENTE.map((s) => s.clave));
}

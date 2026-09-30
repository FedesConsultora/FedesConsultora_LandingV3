// Lo que requiere acción, para el inicio del panel (/admin). Todas las fechas "de hoy" se
// calculan en hora de Buenos Aires, aunque el servidor corra en UTC.
import { db } from './db';

const TZ = 'America/Argentina/Buenos_Aires';

type LeadCorto = { id: number; empresa: string; nombre: string; estado: string };

export async function pendientes() {
  const [pasos, proximas, sinMarcar, nuevosWeb, enArmado, sinVisitas] = await Promise.all([
    // Próximos pasos vencidos o de hoy, de leads que siguen abiertos.
    db()`
      SELECT id, empresa, nombre, estado, proximo_paso, fecha_proximo_paso::text AS fecha
      FROM leads
      WHERE fecha_proximo_paso <= (now() AT TIME ZONE ${TZ})::date
        AND estado NOT IN ('onboarding', 'perdido')
      ORDER BY fecha_proximo_paso, id
    `,
    // Sesiones de los próximos 7 días.
    db()`
      SELECT id, empresa, nombre, estado, fecha_sesion
      FROM leads
      WHERE estado = 'agendo' AND fecha_sesion >= now() AND fecha_sesion < now() + interval '7 days'
      ORDER BY fecha_sesion
    `,
    // Sesiones cuya fecha ya pasó y siguen en "Agendó".
    db()`
      SELECT id, empresa, nombre, estado, fecha_sesion
      FROM leads
      WHERE estado = 'agendo' AND fecha_sesion < now()
      ORDER BY fecha_sesion
    `,
    // Leads del formulario web que nadie tocó todavía (sin acciones del equipo en la auditoría).
    db()`
      SELECT l.id, l.empresa, l.nombre, l.estado, l.created_at, l.resolver
      FROM leads l
      WHERE l.fuente = 'web' AND l.estado = 'respondio'
        AND NOT EXISTS (
          SELECT 1 FROM auditoria a WHERE a.entidad = 'lead' AND a.entidad_id = l.id AND a.admin_id IS NOT NULL
        )
      ORDER BY l.created_at DESC
    `,
    // Landings en armado de leads abiertos, con su avance.
    db()`
      SELECT la.id, la.titulo, le.id AS lead_id, le.empresa,
             count(e.id)::int AS etapas, count(e.id) FILTER (WHERE e.aprobada)::int AS aprobadas,
             count(e.id) FILTER (WHERE e.modo_desbloqueo = 'al_entregar')::int AS al_entregar,
             count(e.id) FILTER (WHERE e.modo_desbloqueo = 'al_entregar' AND NOT e.aprobada)::int AS al_entregar_sin_aprobar
      FROM landings la JOIN leads le ON le.id = la.lead_id LEFT JOIN etapas e ON e.landing_id = la.id
      WHERE la.estado = 'borrador' AND le.estado NOT IN ('onboarding', 'perdido')
      GROUP BY la.id, le.id ORDER BY la.creada_el
    `,
    // Landings entregadas y activas sin ninguna visita, cuyo aviso nadie descartó. Sin plazo:
    // aparecen desde la entrega (decidido el 29/09).
    db()`
      SELECT la.id, la.titulo, la.entregada_el, le.id AS lead_id, le.empresa
      FROM landings la JOIN leads le ON le.id = la.lead_id
      WHERE la.estado = 'activa' AND la.entregada_el IS NOT NULL
        AND (la.vence_el IS NULL OR la.vence_el > now())
        AND la.aviso_sin_visitas_descartado_el IS NULL
        AND le.estado NOT IN ('onboarding', 'perdido')
        AND NOT EXISTS (SELECT 1 FROM eventos v WHERE v.landing_id = la.id AND v.tipo = 'visita')
      ORDER BY la.entregada_el
    `,
  ]);
  return {
    pasos: pasos as (LeadCorto & { proximo_paso: string | null; fecha: string })[],
    proximas: proximas as (LeadCorto & { fecha_sesion: Date })[],
    sinMarcar: sinMarcar as (LeadCorto & { fecha_sesion: Date })[],
    nuevosWeb: nuevosWeb as (LeadCorto & { created_at: Date; resolver: string | null })[],
    enArmado: enArmado as { id: number; titulo: string; lead_id: number; empresa: string; etapas: number; aprobadas: number; al_entregar: number; al_entregar_sin_aprobar: number }[],
    sinVisitas: sinVisitas as { id: number; titulo: string; entregada_el: Date; lead_id: number; empresa: string }[],
  };
}

export async function descartarAvisoSinVisitas(landingId: number, adminId: number) {
  await db().transaction([
    db()`UPDATE landings SET aviso_sin_visitas_descartado_el = now() WHERE id = ${landingId}`,
    db()`INSERT INTO auditoria (admin_id, accion, entidad, entidad_id) VALUES (${adminId}, 'descartar_aviso_sin_visitas', 'landing', ${landingId})`,
  ]);
}

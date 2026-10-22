// Depuración de datos personales según la Política de Privacidad (src/content/legales.ts, sección 8):
// - Prospectos que no avanzaron (todo estado salvo 'onboarding'): se borran a los 24 meses de su
//   última actividad, con sus envíos del formulario, historial, landings, mails y mensajes (ON DELETE CASCADE).
// - Clientes ('onboarding'): no se tocan. Su plazo (relación comercial + 10 años) se gestiona a mano.
// - Registro de visitas, aperturas y clics: se borra a los 24 meses, también el de los clientes.
// - Mensajes sin lead asociado, eventos de webhooks e intentos fallidos: se borran a los 24 meses.
// La auditoría conserva qué se hizo, pero sin el detalle de los leads, landings y etapas borrados.

export const MESES = 24;

// Última actividad de un lead: el dato más reciente entre su alta, sus cambios, formularios,
// cambios de estado, mails enviados y recibidos, y visitas a sus landings.
const ULTIMA_ACTIVIDAD = `GREATEST(
  l.created_at, l.actualizado_el,
  (SELECT max(f.created_at) FROM formularios f WHERE f.lead_id = l.id),
  (SELECT max(h.creado_el) FROM historial_estados h WHERE h.lead_id = l.id),
  (SELECT max(e.creado_el) FROM envios e WHERE e.lead_id = l.id),
  (SELECT max(m.recibido_el) FROM mensajes_recibidos m WHERE m.lead_id = l.id),
  (SELECT max(ev.creado_el) FROM eventos ev JOIN landings la ON la.id = ev.landing_id WHERE la.lead_id = l.id)
)`;

const LEADS_VENCIDOS = `SELECT l.id FROM leads l
  WHERE l.estado IS DISTINCT FROM 'onboarding' AND ${ULTIMA_ACTIVIDAD} < now() - make_interval(months => $1)`;

// Cada paso: cómo contar lo que afectaría (para --dry-run) y cómo aplicarlo. Todo con $1 = meses.
export const PASOS = [
  {
    nombre: 'leads',
    contar: `SELECT count(*)::int AS n FROM (${LEADS_VENCIDOS}) v`,
    aplicar: `WITH b AS (DELETE FROM leads WHERE id IN (${LEADS_VENCIDOS}) RETURNING id) SELECT count(*)::int AS n FROM b`,
  },
  {
    nombre: 'eventos',
    contar: `SELECT count(*)::int AS n FROM eventos WHERE creado_el < now() - make_interval(months => $1)`,
    aplicar: `WITH b AS (DELETE FROM eventos WHERE creado_el < now() - make_interval(months => $1) RETURNING 1) SELECT count(*)::int AS n FROM b`,
  },
  {
    nombre: 'aperturas_y_clics',
    contar: `SELECT count(*)::int AS n FROM envios
      WHERE creado_el < now() - make_interval(months => $1) AND (abierto_el IS NOT NULL OR clic_el IS NOT NULL)`,
    aplicar: `WITH b AS (UPDATE envios SET abierto_el = NULL, clic_el = NULL
      WHERE creado_el < now() - make_interval(months => $1) AND (abierto_el IS NOT NULL OR clic_el IS NOT NULL)
      RETURNING 1) SELECT count(*)::int AS n FROM b`,
  },
  {
    nombre: 'mensajes_sin_lead',
    contar: `SELECT count(*)::int AS n FROM mensajes_recibidos
      WHERE lead_id IS NULL AND recibido_el < now() - make_interval(months => $1)`,
    aplicar: `WITH b AS (DELETE FROM mensajes_recibidos
      WHERE lead_id IS NULL AND recibido_el < now() - make_interval(months => $1) RETURNING 1) SELECT count(*)::int AS n FROM b`,
  },
  {
    nombre: 'webhooks',
    contar: `SELECT count(*)::int AS n FROM resend_webhook_events WHERE recibido_el < now() - make_interval(months => $1)`,
    aplicar: `WITH b AS (DELETE FROM resend_webhook_events
      WHERE recibido_el < now() - make_interval(months => $1) RETURNING 1) SELECT count(*)::int AS n FROM b`,
  },
  {
    nombre: 'intentos',
    contar: `SELECT count(*)::int AS n FROM intentos WHERE creado_el < now() - make_interval(months => $1)`,
    aplicar: `WITH b AS (DELETE FROM intentos WHERE creado_el < now() - make_interval(months => $1) RETURNING 1) SELECT count(*)::int AS n FROM b`,
  },
  {
    // Va después de borrar los leads: limpia el detalle de la auditoría de lo que ya no existe.
    nombre: 'auditoria_sin_detalle',
    contar: `SELECT count(*)::int AS n FROM auditoria a WHERE a.detalle IS NOT NULL AND (
        (a.entidad = 'lead' AND a.entidad_id IN (${LEADS_VENCIDOS}))
        OR (a.entidad = 'lead' AND NOT EXISTS (SELECT 1 FROM leads WHERE id = a.entidad_id))
        OR (a.entidad = 'landing' AND NOT EXISTS (SELECT 1 FROM landings WHERE id = a.entidad_id))
        OR (a.entidad = 'etapa' AND NOT EXISTS (SELECT 1 FROM etapas WHERE id = a.entidad_id)))`,
    aplicar: `WITH b AS (UPDATE auditoria a SET detalle = NULL WHERE a.detalle IS NOT NULL AND (
        (a.entidad = 'lead' AND NOT EXISTS (SELECT 1 FROM leads WHERE id = a.entidad_id))
        OR (a.entidad = 'landing' AND NOT EXISTS (SELECT 1 FROM landings WHERE id = a.entidad_id))
        OR (a.entidad = 'etapa' AND NOT EXISTS (SELECT 1 FROM etapas WHERE id = a.entidad_id)))
      RETURNING 1) SELECT count(*)::int AS n FROM b`,
  },
];

// Corre la depuración con un cliente Neon (`neon(url)`). Con dryRun solo cuenta, sin escribir.
// Sin dryRun aplica todos los pasos en una sola transacción y después deja el resumen (solo
// cantidades) en la auditoría.
export async function depurar(sql, { dryRun = false, meses = MESES } = {}) {
  // Postgres rechaza parámetros que la consulta no usa: solo se pasa $1 a las que lo tienen.
  const consulta = (texto) => sql.query(texto, texto.includes('$1') ? [meses] : []);
  const filas = await sql.transaction(PASOS.map((p) => consulta(dryRun ? p.contar : p.aplicar)));
  const resumen = Object.fromEntries(PASOS.map((p, i) => [p.nombre, filas[i][0].n]));
  if (!dryRun) {
    await sql.query(
      `INSERT INTO auditoria (admin_id, accion, entidad, entidad_id, detalle) VALUES (NULL, 'depurar', 'sistema', NULL, $1::jsonb)`,
      [JSON.stringify({ meses, ...resumen })],
    );
  }
  return resumen;
}

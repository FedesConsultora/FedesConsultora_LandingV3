// Acceso a datos del pipeline de leads. Cada escritura registra su historial y su auditoría en
// la misma sentencia (CTE con varias escrituras): o se guarda todo o no se guarda nada.
import { db } from './db';
import { CONSENTIMIENTO_WEB, fechaISO, tamanoDesdeFormulario, type Estado, type LeadInput } from './pipeline';

export type LeadFila = {
  id: number;
  created_at: Date;
  actualizado_el: Date;
  nombre: string;
  empresa: string;
  cargo: string | null;
  email: string | null;
  whatsapp: string | null;
  linkedin_url: string | null;
  sitio_web: string | null;
  pais: string | null;
  ciudad: string | null;
  tamano: string;
  sector_id: number | null;
  sector: string | null;
  fuente: string;
  estado: Estado;
  motivo_perdido: string | null;
  resolver: string | null;
  ruta_referido: string | null;
  comentarios: string | null;
  fecha_sesion: Date | null;
  proximo_paso: string | null;
  fecha_proximo_paso: Date | null;
  notas: string | null;
  consentimiento_el: Date | null;
  consentimiento_origen: string | null;
  consentimiento_texto: string | null;
  baja_el: Date | null;
};

export type Sector = { id: number; nombre: string };

// Error de negocio que la página muestra tal cual (por ejemplo, email duplicado).
export class LeadError extends Error {}

const esEmailDuplicado = (e: unknown) =>
  (e as { code?: string })?.code === '23505' && String((e as Error).message).includes('leads_email_unico');

export async function listarSectores() {
  return (await db()`SELECT id, nombre FROM sectores WHERE activo ORDER BY orden, nombre`) as Sector[];
}

export async function listarLeads(estado?: string) {
  const rows = estado
    ? await db()`
        SELECT l.*, s.nombre AS sector FROM leads l LEFT JOIN sectores s ON s.id = l.sector_id
        WHERE l.estado = ${estado} ORDER BY l.actualizado_el DESC`
    : await db()`
        SELECT l.*, s.nombre AS sector FROM leads l LEFT JOIN sectores s ON s.id = l.sector_id
        ORDER BY l.actualizado_el DESC`;
  return rows as LeadFila[];
}

export async function contarPorEstado() {
  const rows = await db()`SELECT estado, count(*)::int AS n FROM leads GROUP BY estado`;
  return Object.fromEntries(rows.map((r) => [r.estado, r.n])) as Record<string, number>;
}

export async function obtenerLead(id: number) {
  const [lead] = (await db()`
    SELECT l.*, s.nombre AS sector FROM leads l LEFT JOIN sectores s ON s.id = l.sector_id WHERE l.id = ${id}
  `) as LeadFila[];
  if (!lead) return null;
  const [historial, formularios] = await Promise.all([
    db()`
      SELECT h.estado_anterior, h.estado_nuevo, h.motivo_perdido, h.origen, h.creado_el, a.nombre AS admin
      FROM historial_estados h LEFT JOIN admins a ON a.id = h.admin_id
      WHERE h.lead_id = ${id} ORDER BY h.creado_el DESC, h.id DESC
    `,
    db()`
      SELECT created_at, tamano, resolver, ruta_referido, comentarios, resend_status
      FROM formularios WHERE lead_id = ${id} ORDER BY created_at DESC
    `,
  ]);
  return { lead, historial, formularios };
}

export async function crearLead(d: LeadInput, adminId: number) {
  try {
    const [{ id }] = await db()`
      WITH nuevo AS (
        INSERT INTO leads (nombre, empresa, cargo, email, whatsapp, linkedin_url, sitio_web, pais, ciudad, tamano,
                           sector_id, fuente, resolver, fecha_sesion, proximo_paso, fecha_proximo_paso, notas, estado)
        VALUES (${d.nombre}, ${d.empresa}, ${d.cargo}, ${d.email}, ${d.whatsapp}, ${d.linkedin_url}, ${d.sitio_web},
                ${d.pais}, ${d.ciudad}, ${d.tamano}, ${d.sector_id}, ${d.fuente}, ${d.resolver}, ${d.fecha_sesion},
                ${d.proximo_paso}, ${d.fecha_proximo_paso}, ${d.notas}, 'identificado')
        RETURNING id
      ),
      historial AS (
        INSERT INTO historial_estados (lead_id, estado_nuevo, admin_id, origen)
        SELECT id, 'identificado', ${adminId}, 'panel' FROM nuevo
      )
      INSERT INTO auditoria (admin_id, accion, entidad, entidad_id)
      SELECT ${adminId}, 'crear', 'lead', id FROM nuevo
      RETURNING entidad_id AS id
    `;
    return id as number;
  } catch (e) {
    if (esEmailDuplicado(e)) throw new LeadError('Ya existe un lead con ese email.');
    throw e;
  }
}

const CAMPOS_EDITABLES = [
  'nombre', 'empresa', 'cargo', 'email', 'whatsapp', 'linkedin_url', 'sitio_web', 'pais', 'ciudad', 'tamano',
  'sector_id', 'fuente', 'resolver', 'fecha_sesion', 'proximo_paso', 'fecha_proximo_paso', 'notas',
] as const satisfies readonly (keyof LeadInput)[];

// Compara como texto normalizado (las fechas llegan de la base como Date y del formulario como string).
function normalizar(campo: keyof LeadInput, valor: unknown) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (campo === 'fecha_sesion') return new Date(valor as string).toISOString();
  if (campo === 'fecha_proximo_paso') return fechaISO(valor as Date | string);
  return String(valor);
}

export async function actualizarLead(id: number, d: LeadInput, adminId: number) {
  const [actual] = await db()`SELECT * FROM leads WHERE id = ${id}`;
  if (!actual) throw new LeadError('El lead no existe.');
  // En la auditoría quedan los nombres de los campos que cambiaron, no sus valores (datos personales).
  const cambios = CAMPOS_EDITABLES.filter((c) => normalizar(c, actual[c]) !== normalizar(c, d[c]));
  if (cambios.length === 0) return;
  try {
    await db()`
      WITH cambio AS (
        UPDATE leads SET
          nombre = ${d.nombre}, empresa = ${d.empresa}, cargo = ${d.cargo}, email = ${d.email},
          whatsapp = ${d.whatsapp}, linkedin_url = ${d.linkedin_url}, sitio_web = ${d.sitio_web}, pais = ${d.pais},
          ciudad = ${d.ciudad}, tamano = ${d.tamano}, sector_id = ${d.sector_id}, fuente = ${d.fuente},
          resolver = ${d.resolver}, fecha_sesion = ${d.fecha_sesion}, proximo_paso = ${d.proximo_paso},
          fecha_proximo_paso = ${d.fecha_proximo_paso}, notas = ${d.notas}, actualizado_el = now()
        WHERE id = ${id}
        RETURNING id
      )
      INSERT INTO auditoria (admin_id, accion, entidad, entidad_id, detalle)
      SELECT ${adminId}, 'editar', 'lead', id, ${JSON.stringify({ campos: cambios })}::jsonb FROM cambio
    `;
  } catch (e) {
    if (esEmailDuplicado(e)) throw new LeadError('Ya existe otro lead con ese email.');
    throw e;
  }
}

export async function cambiarEstado(id: number, estado: Estado, motivo: string | null, adminId: number) {
  await db()`
    WITH previo AS (SELECT id, estado FROM leads WHERE id = ${id}),
    cambio AS (
      UPDATE leads SET estado = ${estado}, motivo_perdido = ${motivo}, actualizado_el = now()
      WHERE id = ${id} AND (estado <> ${estado} OR motivo_perdido IS DISTINCT FROM ${motivo})
      RETURNING id
    ),
    historial AS (
      INSERT INTO historial_estados (lead_id, estado_anterior, estado_nuevo, motivo_perdido, admin_id, origen)
      SELECT cambio.id, previo.estado, ${estado}, ${motivo}, ${adminId}, 'panel' FROM cambio, previo
    )
    INSERT INTO auditoria (admin_id, accion, entidad, entidad_id, detalle)
    SELECT ${adminId}, 'cambiar_estado', 'lead', cambio.id,
           jsonb_build_object('de', previo.estado, 'a', ${estado}::text) FROM cambio, previo
  `;
}

type EnvioFormulario = {
  nombre: string;
  empresa: string;
  email: string;
  cargo: string | null;
  whatsapp: string | null;
  tamano: string | null;
  resolver: string;
  ruta_referido: string | null;
  comentarios: string | null;
  resend_status: 'sent' | 'failed' | 'skipped';
};

// Envío del formulario de Contacto. Si el email ya existe, se suma al lead existente sin pisar
// lo que cargó el equipo: solo completa datos vacíos, actualiza lo que quiere resolver y renueva
// el consentimiento. Un lead que estaba antes de "Respondió" (o perdido) vuelve a "Respondió";
// uno más avanzado queda como está. El envío completo se guarda en `formularios`.
export async function registrarFormulario(f: EnvioFormulario) {
  const tamano = tamanoDesdeFormulario(f.tamano);
  const [lead] = await db()`
    WITH previo AS (SELECT id, estado FROM leads WHERE lower(email) = lower(${f.email}))
    INSERT INTO leads (nombre, empresa, cargo, email, whatsapp, tamano, resolver, ruta_referido, comentarios,
                       fuente, estado, consentimiento_el, consentimiento_origen, consentimiento_texto)
    VALUES (${f.nombre}, ${f.empresa}, ${f.cargo}, ${f.email.toLowerCase()}, ${f.whatsapp}, ${tamano}, ${f.resolver},
            ${f.ruta_referido}, ${f.comentarios}, 'web', 'respondio', now(), ${CONSENTIMIENTO_WEB.origen},
            ${CONSENTIMIENTO_WEB.texto})
    ON CONFLICT ((lower(email))) WHERE email IS NOT NULL DO UPDATE SET
      cargo = COALESCE(leads.cargo, EXCLUDED.cargo),
      whatsapp = COALESCE(leads.whatsapp, EXCLUDED.whatsapp),
      tamano = CASE WHEN leads.tamano = 'desconocido' THEN EXCLUDED.tamano ELSE leads.tamano END,
      resolver = EXCLUDED.resolver,
      ruta_referido = EXCLUDED.ruta_referido,
      estado = CASE WHEN leads.estado IN ('identificado', 'contactado', 'perdido') THEN 'respondio' ELSE leads.estado END,
      motivo_perdido = CASE WHEN leads.estado = 'perdido' THEN NULL ELSE leads.motivo_perdido END,
      consentimiento_el = EXCLUDED.consentimiento_el,
      consentimiento_origen = EXCLUDED.consentimiento_origen,
      consentimiento_texto = EXCLUDED.consentimiento_texto,
      actualizado_el = now()
    RETURNING id, estado, (SELECT estado FROM previo) AS estado_anterior
  `;
  const cambioEstado = lead.estado !== lead.estado_anterior;
  await db().transaction([
    db()`
      INSERT INTO formularios (lead_id, nombre, empresa, email, cargo, whatsapp, tamano, resolver, ruta_referido,
                               comentarios, resend_status)
      VALUES (${lead.id}, ${f.nombre}, ${f.empresa}, ${f.email}, ${f.cargo}, ${f.whatsapp}, ${f.tamano}, ${f.resolver},
              ${f.ruta_referido}, ${f.comentarios}, ${f.resend_status})
    `,
    ...(cambioEstado
      ? [
          db()`
            INSERT INTO historial_estados (lead_id, estado_anterior, estado_nuevo, origen)
            VALUES (${lead.id}, ${lead.estado_anterior}, ${lead.estado}, 'formulario web')
          `,
        ]
      : []),
  ]);
  return lead.id as number;
}

// Carga (o cambia) la fecha de la sesión de diagnóstico. Si el lead todavía estaba en la etapa de
// contacto, pasa a "Agendó" automáticamente (decidido el 29/09), con su entrada en el historial.
export async function agendarSesion(id: number, fechaSesion: string, adminId: number) {
  await db()`
    WITH previo AS (SELECT id, estado FROM leads WHERE id = ${id}),
    cambio AS (
      UPDATE leads SET
        fecha_sesion = ${fechaSesion},
        estado = CASE WHEN estado IN ('identificado', 'contactado', 'respondio') THEN 'agendo' ELSE estado END,
        actualizado_el = now()
      WHERE id = ${id}
      RETURNING id, estado
    ),
    historial AS (
      INSERT INTO historial_estados (lead_id, estado_anterior, estado_nuevo, admin_id, origen)
      SELECT cambio.id, previo.estado, cambio.estado, ${adminId}, 'panel' FROM cambio, previo
      WHERE cambio.estado <> previo.estado
    )
    INSERT INTO auditoria (admin_id, accion, entidad, entidad_id, detalle)
    SELECT ${adminId}, 'agendar_sesion', 'lead', cambio.id, jsonb_build_object('de', previo.estado, 'a', cambio.estado)
    FROM cambio, previo
  `;
}

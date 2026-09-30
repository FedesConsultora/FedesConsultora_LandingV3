// Acceso a datos de las landings privadas y sus etapas (docs/09-portal-leads.md, 4.2, 4.3 y 6.2).
// Reglas que se hacen cumplir acá (además de los CHECK de la base):
// - Una etapa solo se desbloquea si está aprobada.
// - Editar una etapa le quita la aprobación. Una etapa desbloqueada (visible para el lead) no
//   se puede editar: primero hay que bloquearla.
// - Toda acción queda en la auditoría con el usuario que la hizo.
import { db } from './db';
import { problemasParaAprobar, bloqueVacio, type Bloque, type TipoBloque } from './bloques';
import { descifrarToken, nuevoToken, rutaLanding } from './tokens';

export class LandingError extends Error {}

export type Etapa = {
  id: number;
  landing_id: number;
  orden: number;
  titulo: string;
  contenido: Record<string, unknown>[];
  estado: 'bloqueada' | 'desbloqueada';
  modo_desbloqueo: 'al_entregar' | 'manual' | 'programado';
  desbloqueada_el: Date | null;
  aprobada: boolean;
  aprobada_por_nombre: string | null;
  aprobada_el: Date | null;
  version: number;
};

export type Landing = {
  id: number;
  lead_id: number;
  titulo: string;
  token_cifrado: string;
  estado: 'borrador' | 'activa' | 'revocada';
  entregada_el: Date | null;
  vence_el: Date | null;
  creada_el: Date;
  empresa: string;
  nombre: string;
};

export const vencida = (l: Pick<Landing, 'vence_el'>) => Boolean(l.vence_el && new Date(l.vence_el).getTime() < Date.now());

// Estado a mostrar en el panel ("vencida" se deriva de la fecha de vencimiento).
export const estadoVisible = (l: Pick<Landing, 'estado' | 'vence_el'>) =>
  l.estado === 'activa' && vencida(l) ? 'vencida' : l.estado;

export const ETIQUETA_ESTADO_LANDING: Record<string, string> = {
  borrador: 'Borrador',
  activa: 'Activa',
  vencida: 'Vencida',
  revocada: 'Revocada',
};

export const linkDeLanding = (l: Pick<Landing, 'token_cifrado'>, origen: string) =>
  `${origen}${rutaLanding(descifrarToken(l.token_cifrado))}`;

const auditar = (adminId: number, accion: string, entidad: string, id: number, detalle?: object) =>
  db()`INSERT INTO auditoria (admin_id, accion, entidad, entidad_id, detalle)
       VALUES (${adminId}, ${accion}, ${entidad}, ${id}, ${detalle ? JSON.stringify(detalle) : null}::jsonb)`;

// ---------- Landings ----------

export async function listarLandingsDeLead(leadId: number) {
  return (await db()`
    SELECT l.id, l.titulo, l.estado, l.vence_el, l.entregada_el, l.creada_el,
           count(e.id)::int AS etapas, count(e.id) FILTER (WHERE e.estado = 'desbloqueada')::int AS desbloqueadas
    FROM landings l LEFT JOIN etapas e ON e.landing_id = l.id
    WHERE l.lead_id = ${leadId} GROUP BY l.id ORDER BY l.creada_el DESC
  `) as (Pick<Landing, 'id' | 'titulo' | 'estado' | 'vence_el' | 'entregada_el' | 'creada_el'> & {
    etapas: number;
    desbloqueadas: number;
  })[];
}

// Crea la landing con la plantilla de etapas, en una sola sentencia.
export async function crearLanding(leadId: number, adminId: number) {
  const { hash, cifrado } = nuevoToken();
  const rows = await db()`
    WITH lead AS (SELECT id, empresa FROM leads WHERE id = ${leadId}),
    nueva AS (
      INSERT INTO landings (lead_id, titulo, token_hash, token_cifrado)
      SELECT id, 'Diagnóstico de ' || empresa, ${hash}, ${cifrado} FROM lead
      RETURNING id
    ),
    etapas_nuevas AS (
      INSERT INTO etapas (landing_id, orden, titulo, modo_desbloqueo, contenido)
      SELECT nueva.id, p.orden, p.titulo, p.modo_desbloqueo, p.contenido FROM nueva, plantilla_etapas p
    )
    INSERT INTO auditoria (admin_id, accion, entidad, entidad_id, detalle)
    SELECT ${adminId}, 'crear', 'landing', id, jsonb_build_object('lead_id', ${leadId}::int) FROM nueva
    RETURNING entidad_id AS id
  `;
  if (!rows[0]) throw new LandingError('El lead no existe.');
  return rows[0].id as number;
}

export async function obtenerLanding(id: number) {
  const [landing] = (await db()`
    SELECT l.*, le.empresa, le.nombre FROM landings l JOIN leads le ON le.id = l.lead_id WHERE l.id = ${id}
  `) as Landing[];
  if (!landing) return null;
  const etapas = (await db()`
    SELECT e.*, a.nombre AS aprobada_por_nombre
    FROM etapas e LEFT JOIN admins a ON a.id = e.aprobada_por
    WHERE e.landing_id = ${id} ORDER BY e.orden
  `) as Etapa[];
  return { landing, etapas };
}

export async function guardarDatosLanding(id: number, titulo: string, venceEl: string | null, adminId: number) {
  if (!titulo.trim()) throw new LandingError('El título no puede quedar vacío.');
  await db().transaction([
    db()`UPDATE landings SET titulo = ${titulo.trim().slice(0, 200)}, vence_el = ${venceEl}, actualizada_el = now() WHERE id = ${id}`,
    auditar(adminId, 'editar', 'landing', id),
  ]);
}

// Activar = entregar al lead: se desbloquean las etapas marcadas "al entregar".
// Todas esas etapas tienen que estar aprobadas.
export async function activarLanding(id: number, adminId: number) {
  const [l] = await db()`SELECT estado FROM landings WHERE id = ${id}`;
  // Una landing revocada no se reactiva con el mismo link: hay que generar uno nuevo.
  if (l?.estado !== 'borrador') throw new LandingError('Solo se puede entregar una landing en borrador.');
  const etapas = await db()`SELECT titulo, aprobada FROM etapas WHERE landing_id = ${id} AND modo_desbloqueo = 'al_entregar'`;
  if (etapas.length === 0) throw new LandingError('Marcá al menos una etapa para desbloquear al entregar.');
  const sinAprobar = etapas.filter((e) => !e.aprobada).map((e) => `«${e.titulo}»`);
  if (sinAprobar.length) throw new LandingError(`Antes de entregar, aprobá: ${sinAprobar.join(', ')}.`);
  await db().transaction([
    db()`UPDATE landings SET estado = 'activa', entregada_el = COALESCE(entregada_el, now()), actualizada_el = now() WHERE id = ${id}`,
    db()`UPDATE etapas SET estado = 'desbloqueada', desbloqueada_el = COALESCE(desbloqueada_el, now())
         WHERE landing_id = ${id} AND modo_desbloqueo = 'al_entregar' AND aprobada`,
    auditar(adminId, 'activar', 'landing', id),
  ]);
}

export async function revocarLanding(id: number, adminId: number) {
  await db().transaction([
    db()`UPDATE landings SET estado = 'revocada', actualizada_el = now() WHERE id = ${id}`,
    auditar(adminId, 'revocar', 'landing', id),
  ]);
}

// Link nuevo: el anterior deja de funcionar. Si estaba revocada, vuelve a como estaba antes.
export async function regenerarToken(id: number, adminId: number) {
  const { hash, cifrado } = nuevoToken();
  await db().transaction([
    db()`UPDATE landings SET token_hash = ${hash}, token_cifrado = ${cifrado},
           estado = CASE WHEN estado = 'revocada' THEN (CASE WHEN entregada_el IS NULL THEN 'borrador' ELSE 'activa' END) ELSE estado END,
           actualizada_el = now()
         WHERE id = ${id}`,
    auditar(adminId, 'regenerar_token', 'landing', id),
  ]);
}

// ---------- Etapas ----------

async function etapa(id: number) {
  const [e] = await db()`SELECT * FROM etapas WHERE id = ${id}`;
  if (!e) throw new LandingError('La etapa no existe.');
  return e as Etapa;
}

// Cambios de contenido o título: quitan la aprobación. Se rechazan si la etapa está visible
// o si alguien la modificó desde que se abrió el editor (version).
async function editarEtapa(
  id: number,
  version: number,
  adminId: number,
  cambio: (e: Etapa) => { titulo?: string; contenido?: Record<string, unknown>[] },
) {
  const e = await etapa(id);
  if (e.estado === 'desbloqueada') throw new LandingError('Esta etapa está visible para el lead. Para editarla, primero bloqueala.');
  if (e.version !== version) throw new LandingError('Otra persona modificó esta etapa. Recargá la página para ver los cambios.');
  const { titulo = e.titulo, contenido = e.contenido } = cambio(e);
  const rows = await db()`
    UPDATE etapas SET titulo = ${titulo}, contenido = ${JSON.stringify(contenido)}::jsonb,
      aprobada = false, aprobada_por = NULL, aprobada_el = NULL, version = version + 1, actualizada_el = now()
    WHERE id = ${id} AND version = ${version} AND estado = 'bloqueada'
    RETURNING id
  `;
  if (!rows[0]) throw new LandingError('Otra persona modificó esta etapa. Recargá la página para ver los cambios.');
  await auditar(adminId, 'editar', 'etapa', id, { landing_id: e.landing_id });
}

export const guardarTituloEtapa = (id: number, version: number, titulo: string, adminId: number) => {
  if (!titulo.trim()) throw new LandingError('El título de la etapa no puede quedar vacío.');
  return editarEtapa(id, version, adminId, () => ({ titulo: titulo.trim().slice(0, 200) }));
};

export const agregarBloque = (id: number, version: number, tipo: TipoBloque, adminId: number) =>
  editarEtapa(id, version, adminId, (e) => ({ contenido: [...e.contenido, bloqueVacio(tipo)] }));

export const guardarBloque = (id: number, version: number, indice: number, bloque: Bloque, adminId: number) =>
  editarEtapa(id, version, adminId, (e) => {
    if (!e.contenido[indice]) throw new LandingError('El bloque no existe.');
    return { contenido: e.contenido.map((b, i) => (i === indice ? bloque : b)) };
  });

export const eliminarBloque = (id: number, version: number, indice: number, adminId: number) =>
  editarEtapa(id, version, adminId, (e) => ({ contenido: e.contenido.filter((_, i) => i !== indice) }));

export const moverBloque = (id: number, version: number, indice: number, delta: -1 | 1, adminId: number) =>
  editarEtapa(id, version, adminId, (e) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= e.contenido.length) return {};
    const contenido = [...e.contenido];
    [contenido[indice], contenido[destino]] = [contenido[destino], contenido[indice]];
    return { contenido };
  });

export async function aprobarEtapa(id: number, adminId: number) {
  const e = await etapa(id);
  const problemas = problemasParaAprobar(e.titulo, e.contenido);
  if (problemas.length) throw new LandingError(`No se puede aprobar «${e.titulo}»: ${problemas.join(', ')}.`);
  await db().transaction([
    db()`UPDATE etapas SET aprobada = true, aprobada_por = ${adminId}, aprobada_el = now() WHERE id = ${id}`,
    auditar(adminId, 'aprobar', 'etapa', id, { landing_id: e.landing_id }),
  ]);
}

export async function quitarAprobacion(id: number, adminId: number) {
  const e = await etapa(id);
  if (e.estado === 'desbloqueada') throw new LandingError('Primero bloqueá la etapa.');
  await db().transaction([
    db()`UPDATE etapas SET aprobada = false, aprobada_por = NULL, aprobada_el = NULL WHERE id = ${id}`,
    auditar(adminId, 'quitar_aprobacion', 'etapa', id, { landing_id: e.landing_id }),
  ]);
}

export async function desbloquearEtapa(id: number, adminId: number) {
  const e = await etapa(id);
  if (!e.aprobada) throw new LandingError('Solo se puede desbloquear una etapa aprobada.');
  await db().transaction([
    db()`UPDATE etapas SET estado = 'desbloqueada', desbloqueada_el = now() WHERE id = ${id} AND aprobada`,
    auditar(adminId, 'desbloquear', 'etapa', id, { landing_id: e.landing_id }),
  ]);
}

export async function bloquearEtapa(id: number, adminId: number) {
  const e = await etapa(id);
  await db().transaction([
    db()`UPDATE etapas SET estado = 'bloqueada', desbloqueada_el = NULL WHERE id = ${id}`,
    auditar(adminId, 'bloquear', 'etapa', id, { landing_id: e.landing_id }),
  ]);
}

export async function guardarModoEtapa(id: number, modo: string, adminId: number) {
  if (modo !== 'al_entregar' && modo !== 'manual') throw new LandingError('Modo de desbloqueo no válido.');
  const e = await etapa(id);
  await db().transaction([
    db()`UPDATE etapas SET modo_desbloqueo = ${modo} WHERE id = ${id}`,
    auditar(adminId, 'editar', 'etapa', id, { landing_id: e.landing_id, modo }),
  ]);
}

export async function agregarEtapa(landingId: number, adminId: number) {
  const [nueva] = await db()`
    INSERT INTO etapas (landing_id, orden, titulo)
    SELECT ${landingId}, COALESCE(max(orden), 0) + 1, 'Nueva etapa' FROM etapas WHERE landing_id = ${landingId}
    RETURNING id
  `;
  await auditar(adminId, 'crear', 'etapa', nueva.id, { landing_id: landingId });
  return nueva.id as number;
}

export async function eliminarEtapa(id: number, adminId: number) {
  const e = await etapa(id);
  if (e.estado === 'desbloqueada') throw new LandingError('No se puede eliminar una etapa visible para el lead. Primero bloqueala.');
  await db().transaction([
    db()`DELETE FROM etapas WHERE id = ${id}`,
    // Se renumeran las siguientes para que el orden quede sin huecos.
    db()`UPDATE etapas SET orden = orden - 1 WHERE landing_id = ${e.landing_id} AND orden > ${e.orden}`,
    auditar(adminId, 'eliminar', 'etapa', id, { landing_id: e.landing_id }),
  ]);
}

export async function moverEtapa(id: number, delta: -1 | 1, adminId: number) {
  const e = await etapa(id);
  const [vecina] = await db()`SELECT id FROM etapas WHERE landing_id = ${e.landing_id} AND orden = ${e.orden + delta}`;
  if (!vecina) return;
  // La restricción de orden único es diferida: el intercambio se valida al final de la transacción.
  await db().transaction([
    db()`UPDATE etapas SET orden = ${e.orden + delta} WHERE id = ${id}`,
    db()`UPDATE etapas SET orden = ${e.orden} WHERE id = ${vecina.id}`,
    auditar(adminId, 'mover', 'etapa', id, { landing_id: e.landing_id }),
  ]);
}

// Resumen de la landing más reciente del lead, para el seguimiento guiado de la ficha.
export async function resumenLandingDeLead(leadId: number) {
  const [r] = await db()`
    SELECT l.id, l.estado, (l.vence_el IS NOT NULL AND l.vence_el < now()) AS vencida, l.entregada_el,
           count(e.id)::int AS etapas,
           count(e.id) FILTER (WHERE e.aprobada)::int AS aprobadas,
           count(e.id) FILTER (WHERE e.modo_desbloqueo = 'al_entregar')::int AS al_entregar,
           count(e.id) FILTER (WHERE e.modo_desbloqueo = 'al_entregar' AND NOT e.aprobada)::int AS al_entregar_sin_aprobar,
           (SELECT count(*)::int FROM eventos v WHERE v.landing_id = l.id AND v.tipo = 'visita') AS visitas,
           (SELECT max(v.creado_el) FROM eventos v WHERE v.landing_id = l.id AND v.tipo = 'visita') AS ultima_visita
    FROM landings l LEFT JOIN etapas e ON e.landing_id = l.id
    WHERE l.lead_id = ${leadId}
    GROUP BY l.id ORDER BY l.creada_el DESC LIMIT 1
  `;
  return (r ?? null) as import('./proceso').ResumenLanding | null;
}

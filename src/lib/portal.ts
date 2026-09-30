// Landing privada del lead (/diagnostico/[token]). docs/09-portal-leads.md, sección 5.
// - Se busca por el hash del token y se compara en tiempo constante.
// - Un link inexistente, vencido o revocado da siempre la misma respuesta (sin revelar el motivo).
// - La consulta trae el contenido SOLO de las etapas desbloqueadas: el de las bloqueadas nunca
//   sale de la base, así que no puede llegar al HTML.
import { db } from './db';
import { contenidoSchema, type Bloque } from './bloques';
import { hmac, safeEqual } from './seguridad';
import { formatoTokenValido, hashToken } from './tokens';

export type EtapaPublica = { numero: number; titulo: string; contenido?: Bloque[] };

export type LandingPublica = {
  id: number;
  leadId: number;
  titulo: string;
  baja: boolean;
  etapas: EtapaPublica[];
};

export async function buscarLanding(token: string | undefined): Promise<LandingPublica | null> {
  if (!formatoTokenValido(token)) return null;
  const hash = hashToken(token!);
  const [l] = await db()`
    SELECT l.id, l.lead_id, l.titulo, l.token_hash, le.baja_el
    FROM landings l JOIN leads le ON le.id = l.lead_id
    WHERE l.token_hash = ${hash} AND l.estado = 'activa' AND (l.vence_el IS NULL OR l.vence_el > now())
  `;
  if (!l || !safeEqual(l.token_hash, hash)) return null;

  const filas = await db()`
    SELECT orden, titulo, CASE WHEN estado = 'desbloqueada' THEN contenido END AS contenido
    FROM etapas WHERE landing_id = ${l.id} ORDER BY orden
  `;
  const etapas = filas.map((e, i) => {
    if (e.contenido === null) return { numero: i + 1, titulo: e.titulo };
    // El contenido ya pasó la validación al aprobarse. Si algún bloque no la pasa, se omite.
    const contenido = (e.contenido as unknown[]).flatMap((b) => {
      const r = contenidoSchema.safeParse([b]);
      return r.success ? r.data : [];
    });
    return { numero: i + 1, titulo: e.titulo, contenido };
  });
  return { id: l.id, leadId: l.lead_id, titulo: l.titulo, baja: Boolean(l.baja_el), etapas };
}

// Bots que abren los links para armar vistas previas (WhatsApp, Slack, mail) o rastreadores.
// No se cuentan como visitas. LinkedInBot, Twitterbot, TelegramBot y Discordbot entran por "bot";
// no se filtra "linkedin" a secas porque es también el navegador interno de la app, que usan personas.
const BOTS =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|slack|skype|embedly|pinterest|quora|vkshare|outlook|microsoft office|headless|curl|wget|python|go-http|node-fetch|axios|java\//i;
export const esBot = (userAgent: string | null) => !userAgent || BOTS.test(userAgent);

// Una visita por acceso. Las recargas del mismo navegador dentro de 30 minutos cuentan una sola vez.
// `visitante` es un HMAC de IP, navegador y landing: no permite recuperar la IP.
export async function registrarVisita(landingId: number, ip: string, userAgent: string) {
  const visitante = hmac(`visita:${landingId}:${ip}:${userAgent}`);
  await db()`
    INSERT INTO eventos (landing_id, tipo, visitante)
    SELECT ${landingId}, 'visita', ${visitante}
    WHERE NOT EXISTS (
      SELECT 1 FROM eventos
      WHERE landing_id = ${landingId} AND tipo = 'visita' AND visitante = ${visitante}
        AND creado_el > now() - interval '30 minutes'
    )
  `;
}

// "No quiero recibir más comunicaciones": registra la baja del lead (una sola vez).
export async function registrarBaja(landing: LandingPublica) {
  await db().transaction([
    db()`UPDATE leads SET baja_el = now(), actualizado_el = now() WHERE id = ${landing.leadId} AND baja_el IS NULL`,
    db()`INSERT INTO eventos (landing_id, tipo) VALUES (${landing.id}, 'baja')`,
    db()`INSERT INTO auditoria (accion, entidad, entidad_id, detalle)
         VALUES ('baja', 'lead', ${landing.leadId}, jsonb_build_object('origen', 'landing'))`,
  ]);
}

export async function resumenVisitas(landingId: number) {
  const [r] = await db()`
    SELECT count(*)::int AS visitas, max(creado_el) AS ultima
    FROM eventos WHERE landing_id = ${landingId} AND tipo = 'visita'
  `;
  return r as { visitas: number; ultima: Date | null };
}

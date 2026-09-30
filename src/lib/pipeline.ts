// Códigos y etiquetas del pipeline de leads (docs/09-portal-leads.md, sección 4), y validación
// del formulario del panel. Sin acceso a la base: se puede probar aislado.
// Los códigos coinciden con los CHECK de db/migrations/003_pipeline.sql.
import { contacto } from '../content/contacto';

type Opcion<C extends string = string> = { codigo: C; etiqueta: string };

export const ESTADOS = [
  { codigo: 'identificado', etiqueta: 'Identificado' },
  { codigo: 'contactado', etiqueta: 'Contactado' },
  { codigo: 'respondio', etiqueta: 'Respondió' },
  { codigo: 'agendo', etiqueta: 'Agendó' },
  { codigo: 'sesion_realizada', etiqueta: 'Sesión realizada' },
  { codigo: 'propuesta', etiqueta: 'Propuesta' },
  { codigo: 'onboarding', etiqueta: 'Onboarding' },
  { codigo: 'perdido', etiqueta: 'Perdido' },
] as const satisfies readonly Opcion[];
export type Estado = (typeof ESTADOS)[number]['codigo'];

export const FUENTES = [
  { codigo: 'linkedin', etiqueta: 'LinkedIn (búsqueda propia)' },
  { codigo: 'recomendacion', etiqueta: 'Recomendación' },
  { codigo: 'contenido_entrante', etiqueta: 'Contenido entrante' },
  { codigo: 'web', etiqueta: 'Web' },
  { codigo: 'evento', etiqueta: 'Evento' },
  { codigo: 'otro', etiqueta: 'Otro' },
] as const satisfies readonly Opcion[];

export const MOTIVOS_PERDIDO = [
  { codigo: 'sin_presupuesto', etiqueta: 'Sin presupuesto' },
  { codigo: 'sin_necesidad', etiqueta: 'Sin necesidad' },
  { codigo: 'eligio_otra', etiqueta: 'Eligió otra opción' },
  { codigo: 'sin_respuesta', etiqueta: 'Sin respuesta' },
  { codigo: 'no_es_perfil', etiqueta: 'No es el perfil' },
  { codigo: 'otro', etiqueta: 'Otro' },
] as const satisfies readonly Opcion[];

// Rangos de tamaño: los mismos del formulario de Contacto (decidido el 29/09), en el mismo orden.
const CODIGOS_TAMANO = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;
export const TAMANOS: Opcion[] = [
  ...CODIGOS_TAMANO.map((codigo, i) => ({ codigo, etiqueta: contacto.form.tamanoOptions[i] })),
  { codigo: 'desconocido', etiqueta: 'Sin dato' },
];

// Del texto que manda el formulario web al código normalizado.
export function tamanoDesdeFormulario(texto: string | null | undefined) {
  const i = (contacto.form.tamanoOptions as readonly string[]).indexOf(texto ?? '');
  return i === -1 ? 'desconocido' : CODIGOS_TAMANO[i];
}

// ⚠️ PENDIENTE (docs/09-portal-leads.md, decisiones abiertas): alcance geográfico. Lista provisoria.
export const PAISES = ['Argentina', 'Uruguay', 'Chile', 'Paraguay', 'Bolivia', 'Brasil', 'Perú', 'México', 'España', 'Estados Unidos', 'Otro'];

export const RESOLVER = contacto.form.resolverOptions as readonly string[];

// Texto de la casilla que acepta quien envía el formulario de Contacto (consentimiento web).
export const CONSENTIMIENTO_WEB = {
  origen: 'Formulario de Contacto de la web',
  texto: `${contacto.form.privacyPrefix} ${contacto.form.privacyLink.label}`,
};

export const etiqueta = (lista: readonly Opcion[], codigo: string | null | undefined) =>
  lista.find((o) => o.codigo === codigo)?.etiqueta ?? '—';

const codigos = (lista: readonly Opcion[]) => new Set(lista.map((o) => o.codigo));

// Datos editables de un lead, ya validados y normalizados.
export type LeadInput = {
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
  fuente: string;
  resolver: string | null;
  fecha_sesion: string | null; // ISO con zona horaria de Buenos Aires
  proximo_paso: string | null;
  fecha_proximo_paso: string | null; // AAAA-MM-DD
  notas: string | null;
};

export type Errores = Partial<Record<keyof LeadInput, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function url(valor: string) {
  const conEsquema = /^https?:\/\//i.test(valor) ? valor : `https://${valor}`;
  try {
    const u = new URL(conEsquema);
    return u.hostname.includes('.') ? u.toString() : null;
  } catch {
    return null;
  }
}

// Argentina no tiene horario de verano: el desplazamiento es siempre -03:00.
export function fechaHoraArgentina(valor: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor) ? `${valor}:00-03:00` : null;
}

// Columnas DATE: el driver las devuelve como Date a medianoche local. Se formatean con los
// componentes locales (no con toISOString, que puede correr el día).
export function fechaISO(valor: Date | string | null | undefined) {
  if (!valor) return '';
  if (typeof valor === 'string') return valor.slice(0, 10);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${valor.getFullYear()}-${dos(valor.getMonth() + 1)}-${dos(valor.getDate())}`;
}

// Valor para un <input type="datetime-local"> a partir de una fecha guardada.
export function aInputFechaHora(fecha: Date | string | null | undefined) {
  if (!fecha) return '';
  // Valor reenviado tal cual por el formulario (sin zona horaria): ya está en hora de Buenos Aires.
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fecha)) return fecha;
  const d = new Date(new Date(fecha).getTime() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export function parseLead(form: FormData, sectoresValidos: Set<number>): { data?: LeadInput; errores: Errores } {
  const texto = (k: string, max = 500) => String(form.get(k) ?? '').trim().slice(0, max) || null;
  const errores: Errores = {};

  const nombre = texto('nombre', 200);
  const empresa = texto('empresa', 200);
  if (!nombre) errores.nombre = 'Completá el nombre y apellido.';
  if (!empresa) errores.empresa = 'Completá la empresa.';

  const email = texto('email', 320)?.toLowerCase() ?? null;
  if (email && !EMAIL.test(email)) errores.email = 'El email no tiene un formato válido.';

  const linkedinCrudo = texto('linkedin_url', 500);
  const linkedin_url = linkedinCrudo ? url(linkedinCrudo) : null;
  if (linkedinCrudo && (!linkedin_url || !new URL(linkedin_url).hostname.endsWith('linkedin.com'))) {
    errores.linkedin_url = 'Tiene que ser una dirección de linkedin.com.';
  }

  const sitioCrudo = texto('sitio_web', 500);
  const sitio_web = sitioCrudo ? url(sitioCrudo) : null;
  if (sitioCrudo && !sitio_web) errores.sitio_web = 'La dirección del sitio no es válida.';

  const pais = texto('pais', 100);
  if (pais && !PAISES.includes(pais)) errores.pais = 'Elegí un país de la lista.';

  const tamano = texto('tamano', 20) ?? 'desconocido';
  if (!codigos(TAMANOS).has(tamano)) errores.tamano = 'Elegí un rango de la lista.';

  const sectorCrudo = texto('sector_id', 10);
  const sector_id = sectorCrudo ? Number(sectorCrudo) : null;
  if (sector_id !== null && !sectoresValidos.has(sector_id)) errores.sector_id = 'Elegí un sector de la lista.';

  const fuente = texto('fuente', 40);
  if (!fuente || !codigos(FUENTES).has(fuente)) errores.fuente = 'Elegí la fuente del lead.';

  const resolver = texto('resolver', 100);
  if (resolver && !RESOLVER.includes(resolver)) errores.resolver = 'Elegí una opción de la lista.';

  const sesionCruda = texto('fecha_sesion', 20);
  const fecha_sesion = sesionCruda ? fechaHoraArgentina(sesionCruda) : null;
  if (sesionCruda && !fecha_sesion) errores.fecha_sesion = 'La fecha de la sesión no es válida.';

  const fechaPaso = texto('fecha_proximo_paso', 10);
  if (fechaPaso && !/^\d{4}-\d{2}-\d{2}$/.test(fechaPaso)) errores.fecha_proximo_paso = 'La fecha no es válida.';

  if (Object.keys(errores).length) return { errores };
  return {
    errores,
    data: {
      nombre: nombre!,
      empresa: empresa!,
      cargo: texto('cargo', 200),
      email,
      whatsapp: texto('whatsapp', 50),
      linkedin_url,
      sitio_web,
      pais,
      ciudad: texto('ciudad', 100),
      tamano,
      sector_id,
      fuente: fuente!,
      resolver,
      fecha_sesion,
      proximo_paso: texto('proximo_paso', 500),
      fecha_proximo_paso: fechaPaso,
      notas: texto('notas', 10000),
    },
  };
}

export function parseCambioEstado(form: FormData): { estado?: Estado; motivo?: string | null; error?: string } {
  const estado = String(form.get('estado') ?? '');
  const motivo = String(form.get('motivo_perdido') ?? '') || null;
  if (!codigos(ESTADOS).has(estado)) return { error: 'Elegí un estado de la lista.' };
  if (estado === 'perdido' && (!motivo || !codigos(MOTIVOS_PERDIDO).has(motivo))) {
    return { error: 'Para marcar un lead como perdido, elegí el motivo.' };
  }
  return { estado: estado as Estado, motivo: estado === 'perdido' ? motivo : null };
}

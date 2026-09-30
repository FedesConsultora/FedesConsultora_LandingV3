// Bloques de contenido de las etapas (docs/09-portal-leads.md, 4.4). Se guardan como datos
// estructurados (JSONB), nunca como HTML: el diseño es siempre el mismo y no hay riesgo de
// inyección. Cada tipo se muestra con su componente en src/components/diagnostico/.
import { z } from 'astro/zod';
import { consultoria } from '../content/consultoria';

const texto = (max: number) => z.string().trim().min(1, 'No puede quedar vacío.').max(max, `Máximo ${max} caracteres.`);

export const RUTAS = consultoria.rutas.map((r) => ({ nombre: r.name, onboardings: r.levels.map((l) => l.name) }));

const bloque = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('titulo'), texto: texto(200) }),
  z.object({ tipo: z.literal('parrafo'), texto: texto(5000) }),
  z.object({ tipo: z.literal('lista'), items: z.array(texto(500)).min(1, 'Agregá al menos un ítem.').max(30) }),
  z.object({ tipo: z.literal('destacado'), texto: texto(1000) }),
  z.object({
    tipo: z.literal('tabla'),
    encabezados: z.array(z.string().trim().max(200)).min(1).max(6),
    filas: z.array(z.array(z.string().trim().max(500))).min(1, 'Agregá al menos una fila.').max(30),
  }),
  z.object({
    tipo: z.literal('caso'),
    sector: texto(200),
    situacion: texto(2000),
    camino: texto(2000),
    resultado: texto(2000),
  }),
  z
    .object({
      tipo: z.literal('ruta'),
      ruta: z.string(),
      onboardings: z.array(z.string()).min(1, 'Elegí al menos un onboarding.'),
      porque: texto(3000),
    })
    .refine((b) => RUTAS.some((r) => r.nombre === b.ruta), { message: 'Elegí una de las tres rutas.', path: ['ruta'] })
    .refine((b) => b.onboardings.every((o) => RUTAS.find((r) => r.nombre === b.ruta)?.onboardings.includes(o)), {
      message: 'Los onboardings tienen que ser de la ruta elegida.',
      path: ['onboardings'],
    }),
  z.object({ tipo: z.literal('cta'), texto: texto(80), destino: z.enum(['agendar', 'whatsapp']) }),
  z.object({ tipo: z.literal('separador') }),
]);

export type Bloque = z.infer<typeof bloque>;
export type TipoBloque = Bloque['tipo'];
export const contenidoSchema = z.array(bloque).max(60);

export const TIPOS_BLOQUE: { tipo: TipoBloque; etiqueta: string }[] = [
  { tipo: 'titulo', etiqueta: 'Título' },
  { tipo: 'parrafo', etiqueta: 'Párrafo' },
  { tipo: 'lista', etiqueta: 'Lista' },
  { tipo: 'destacado', etiqueta: 'Destacado' },
  { tipo: 'tabla', etiqueta: 'Tabla simple' },
  { tipo: 'caso', etiqueta: 'Caso anónimo' },
  { tipo: 'ruta', etiqueta: 'Ruta y onboardings sugeridos' },
  { tipo: 'cta', etiqueta: 'Llamado a la acción' },
  { tipo: 'separador', etiqueta: 'Separador' },
];

const lineas = (valor: FormDataEntryValue | null) =>
  String(valor ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
// Celdas de tabla separadas por "|".
const celdas = (linea: string) => linea.split('|').map((c) => c.trim());

// Arma un bloque a partir de los campos del formulario del editor y lo valida.
// Devuelve también los datos crudos, para volver a mostrarlos en el editor si hay un error.
export function bloqueDesdeForm(
  tipo: string,
  form: FormData,
): { bloque?: Bloque; error?: string; crudo?: Record<string, unknown> } {
  const f = (k: string) => String(form.get(k) ?? '');
  let crudo: Record<string, unknown>;
  switch (tipo) {
    case 'titulo':
    case 'parrafo':
    case 'destacado':
      crudo = { tipo, texto: f('texto') };
      break;
    case 'lista':
      crudo = { tipo, items: lineas(form.get('items')) };
      break;
    case 'tabla': {
      const [encabezado, ...filas] = lineas(form.get('tabla'));
      const encabezados = encabezado ? celdas(encabezado) : [];
      // Cada fila se completa o recorta al ancho del encabezado.
      crudo = { tipo, encabezados, filas: filas.map((l) => encabezados.map((_, i) => celdas(l)[i] ?? '')) };
      break;
    }
    case 'caso':
      crudo = { tipo, sector: f('sector'), situacion: f('situacion'), camino: f('camino'), resultado: f('resultado') };
      break;
    case 'ruta':
      crudo = { tipo, ruta: f('ruta'), onboardings: form.getAll('onboardings').map(String), porque: f('porque') };
      break;
    case 'cta':
      crudo = { tipo, texto: f('texto'), destino: f('destino') };
      break;
    case 'separador':
      crudo = { tipo };
      break;
    default:
      return { error: 'Tipo de bloque desconocido.' };
  }
  const r = bloque.safeParse(crudo);
  return r.success ? { bloque: r.data } : { error: r.error.issues[0]?.message ?? 'Revisá el bloque.', crudo };
}

// Bloque vacío para empezar a editar (todavía no válido: se valida al guardar).
export function bloqueVacio(tipo: TipoBloque): Record<string, unknown> {
  switch (tipo) {
    case 'lista':
      return { tipo, items: [] };
    case 'tabla':
      return { tipo, encabezados: [], filas: [] };
    case 'ruta':
      return { tipo, ruta: '', onboardings: [], porque: '' };
    case 'cta':
      return { tipo, texto: '', destino: 'agendar' };
    case 'caso':
      return { tipo, sector: '', situacion: '', camino: '', resultado: '' };
    case 'separador':
      return { tipo };
    default:
      return { tipo, texto: '' };
  }
}

// Todos los textos de un bloque, para el control de contenido.
function textosDe(b: Record<string, unknown>): string[] {
  return Object.entries(b)
    .filter(([k]) => k !== 'tipo')
    .flatMap(([, v]) => (Array.isArray(v) ? v.flat() : [v]))
    .filter((v): v is string => typeof v === 'string');
}

// Reglas de CLAUDE.md que se verifican antes de aprobar: sin emojis, sin precios, sin
// posicionarse como agencia, sin la certificación B y sin los combos discontinuados.
const REGLAS: { patron: RegExp; motivo: string }[] = [
  { patron: /\p{Extended_Pictographic}/u, motivo: 'tiene emojis' },
  { patron: /(\$|u\$s|usd|ars|€)\s?\d|\d\s?(\$|usd|ars|€)|\b(pesos|d[oó]lares|euros)\b/iu, motivo: 'menciona montos o precios' },
  { patron: /\bagencia\b/iu, motivo: 'usa la palabra «agencia»' },
  { patron: /\b(posteos?|likes)\b/iu, motivo: 'habla de posteos o likes' },
  { patron: /\bempresa\s+b\b/iu, motivo: 'menciona la certificación Empresa B' },
  { patron: /imagen y presencia|crecimiento de mercado|estructura de hierro|full fedes/iu, motivo: 'usa el nombre de un combo discontinuado' },
];

export function revisarTextos(textos: string[]) {
  const unidos = textos.join('\n');
  return REGLAS.filter((r) => r.patron.test(unidos)).map((r) => r.motivo);
}

// Problemas que impiden aprobar una etapa. Lista vacía = se puede aprobar.
export function problemasParaAprobar(titulo: string, contenido: unknown) {
  const r = contenidoSchema.safeParse(contenido);
  if (!r.success) return ['hay bloques incompletos o con errores'];
  if (r.data.length === 0) return ['no tiene contenido'];
  return revisarTextos([titulo, ...r.data.flatMap((b) => textosDe(b))]);
}

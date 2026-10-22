// Contenido de la landing de campaña /campo (avisos QR en las revistas La Rural y Angus).
// Fuente literal: docs/10-landing-campo.md. Es una excepción de campaña: tono, colores y
// nombre de la reunión («primera reunión», nunca «diagnóstico») siguen el brief aprobado.

export type Icono = 'auto' | 'proc' | 'mkt' | 'num' | 'com';
export type OrigenKey = 'larural' | 'angus' | 'general';

interface Origen {
  // Nombre de la revista para la etiqueta del hero. Vacío = sin etiqueta.
  label: string;
  bajada: string;
  h2: string;
  cards: [Icono, string, string][];
  cinta: string[];
  wa: string;
}

// Constantes de conversión. El link del calendario va sin el segmento /u/0/ (depende de la
// sesión de Google de quien lo copió); probado en incógnito el 21/10/2026.
export const CALENDAR_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ19JF6L1eipDhqCCUQr1FpObl3R5w1WcsYH4wRPfnbOfUsCc2vz07la72glqvWmDA_Svg19CKBU';
export const WHATSAPP_NUMBER = '5492213092529';

// Redirecciones cortas de los QR impresos (src/pages/r/[origen].ts). Cada una lleva a /campo con sus UTM.
export const REDIRECCIONES: Record<string, string> = {
  larural: '/campo?utm_source=larural&utm_medium=revista&utm_campaign=agro-2026',
  angus: '/campo?utm_source=angus&utm_medium=revista&utm_campaign=agro-2026',
};

// Para sumar otra revista o canal: una entrada acá y otra en REDIRECCIONES.
export const ORIGENES: Record<OrigenKey, Origen> = {
  larural: {
    label: 'La Rural',
    bajada:
      'Ordenamos la gestión, automatizamos lo repetitivo y ponemos el marketing a trabajar, para que tu empresa avance aunque estés en el campo.',
    h2: 'Que tu empresa funcione aunque estés en el campo.',
    cards: [
      ['auto', 'Automatización', 'Cotizaciones, seguimientos y avisos que salen solos, sin depender de la planilla ni de tu memoria.'],
      ['proc', 'Procesos', 'Roles, tareas y números claros, para que cada uno sepa qué hacer y la empresa no se frene cuando no estás.'],
      ['mkt', 'Marketing', 'Que productores, distribuidores y compradores te encuentren, te conozcan y te elijan.'],
    ],
    cinta: ['AUTOMATIZACIÓN', 'PROCESOS', 'MARKETING', 'CONSULTORÍA PARA EL AGRO'],
    wa: 'Hola! Vi el aviso de Fedes en la revista La Rural y quiero coordinar una primera reunión.',
  },
  angus: {
    label: 'Angus',
    bajada: 'Te acompañamos a ordenar los números y la gestión comercial, para que el trabajo de todo el año rinda lo que vale.',
    h2: 'El rodeo lo manejás vos. La empresa, la ordenamos juntos.',
    cards: [
      ['num', 'Números claros', 'Costos, márgenes y caja a la vista, para decidir con datos y no a ojo.'],
      ['com', 'Gestión comercial', 'Seguimiento de clientes y compradores, para que ninguna venta quede en el aire.'],
      ['proc', 'Procesos', 'Roles y tareas definidos, para que la empresa no dependa de que estés en todo.'],
    ],
    cinta: ['NÚMEROS CLAROS', 'GESTIÓN COMERCIAL', 'PROCESOS', 'CONSULTORÍA PARA EL AGRO'],
    wa: 'Hola! Vi el aviso de Fedes en la revista Angus y quiero coordinar una primera reunión.',
  },
  general: {
    label: '',
    bajada:
      'Te acompañamos a ordenar los números, los procesos y la gestión comercial de tu empresa agropecuaria, para que el trabajo de todo el año rinda lo que vale.',
    h2: 'Que tu empresa funcione aunque estés en el campo.',
    cards: [
      ['num', 'Números claros', 'Costos, márgenes y caja a la vista, para decidir con datos y no a ojo.'],
      ['com', 'Gestión comercial', 'Seguimiento de clientes y compradores, para que ninguna venta quede en el aire.'],
      ['auto', 'Automatización', 'Tareas repetitivas que salen solas, para que la empresa no dependa de tu memoria.'],
    ],
    cinta: ['NÚMEROS CLAROS', 'PROCESOS', 'GESTIÓN COMERCIAL', 'CONSULTORÍA PARA EL AGRO'],
    wa: 'Hola! Quiero coordinar una primera reunión con Fedes.',
  },
};

// utm_source desconocido o ausente = versión general.
export function origenDe(utmSource: string | null): OrigenKey {
  const src = (utmSource ?? '').toLowerCase();
  return src === 'larural' || src === 'angus' ? src : 'general';
}

export const campo = {
  meta: {
    title: 'Fedes para el campo · Consultoría para empresas agropecuarias',
    description:
      'Vos sabés de campo. Nosotros, de empresas. Ordenamos los números, los procesos y la gestión comercial de tu empresa agropecuaria. Primera reunión sin cargo.',
    ogTitle: 'Fedes para el campo',
    ogDescription: 'Vos sabés de campo. Nosotros, de empresas. Primera reunión sin cargo.',
  },
  hero: {
    pill: 'CONSULTORÍA PARA EL AGRO',
    h1: ['Vos sabés de campo.', 'Nosotros, de empresas.'],
    agendar: 'Agendar primera reunión',
    whatsapp: 'Escribir por WhatsApp',
    micro: 'PRIMERA REUNIÓN SIN CARGO',
    imgAlt: 'Productor de campo con la bandera argentina sobre el hombro, mirando su rodeo al amanecer',
  },
  dolores: {
    eyebrow: '¿Te suena?',
    h2: 'El problema no es el trabajo. Es la estructura.',
    cards: [
      ['Los números están en cuadernos, planillas y en tu cabeza.', 'Sabés cuánto vendés, pero no siempre cuánto te queda.'],
      ['Todo pasa por vos.', 'Si no estás, no se decide. Y el campo no espera.'],
      ['Crecer da más trabajo que resultado.', 'Más hacienda, más hectáreas, más gente. Y el mismo desorden.'],
    ],
  },
  ordenamos: { eyebrow: 'Qué ordenamos' },
  reunion: {
    tag: 'SIN CARGO · SIN COMPROMISO',
    h2: 'Así es la primera reunión.',
    pasos: [
      ['Elegís día y horario', 'Desde el calendario, cuando te quede cómodo.'],
      ['Tomamos unos mates', 'Nos contás cómo trabajás hoy y qué te quita tiempo.'],
      ['Te decimos por dónde empezar', 'Con prioridades claras, para que decidas con información.'],
    ],
    cta: 'Elegir día y horario',
  },
  prueba: {
    eyebrow: 'Por qué Fedes',
    stats: [
      ['+5', 'años potenciando empresas.'],
      ['60', 'días de onboarding, con una hoja de ruta que se ejecuta.'],
    ],
    caso: {
      tag: 'CASO REAL · DISTRIBUCIÓN VETERINARIA MAYORISTA',
      antes: 'Ordenamos su identidad, su ecosistema digital y su estrategia comercial. Su app propia llegó a representar cerca del ',
      destacado: '16% de la facturación',
      despues: '.',
      nota: 'Por confidencialidad, no publicamos el nombre de nuestros clientes.',
    },
  },
  faq: {
    h2: 'Preguntas frecuentes',
    items: [
      ['¿La primera reunión tiene costo?', 'No. Es sin cargo: la usamos para entender tu empresa, ver si podemos ayudarte y definir por dónde empezar.'],
      ['¿Cuánto cuesta trabajar con Fedes?', 'Depende de lo que necesite tu empresa. Lo definimos con vos después de la primera reunión.'],
      [
        '¿Qué pasa después?',
        'Si avanzamos, hacemos un onboarding de 60 días que termina con una hoja de ruta lista para ejecutar. La podés implementar con tu equipo o con nosotros, con equipo propio.',
      ],
    ],
  },
  cierre: {
    h2: 'Tomemos unos mates',
    h2Accent: 'y lo charlamos.',
    bajada: 'Una primera reunión con consultores de Fedes, sin cargo, para ver por dónde empezar.',
    contacto: [
      { cta: 'telefono', icon: 'tel', label: '+54 9 221 309-2529', href: 'tel:+5492213092529', act: 'LLAMAR' },
      { cta: 'email', icon: 'mail', label: 'info@fedesconsultora.com', href: 'mailto:info@fedesconsultora.com', act: 'ESCRIBIR' },
      { cta: 'instagram', icon: 'ig', label: '@fedesconsultora', href: 'https://www.instagram.com/fedesconsultora', act: 'SEGUIR' },
    ],
  },
  footer: {
    legales: [
      { label: 'Privacidad', href: '/privacidad' },
      { label: 'Términos', href: '/terminos-y-condiciones' },
    ],
    copy: '© 2026 Fedes Consultora',
  },
  barra: { agendar: 'Agendar', whatsapp: 'WhatsApp' },
};

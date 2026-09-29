// Contenido de la página Consultoría. Fuente literal: docs/04-consultoria.md
// No publicar precios de ningún onboarding.

export interface Nivel {
  name: string;
  includes?: string; // "incluye ..." dentro de la ruta
  body: string;
  entregable: string;
}

export interface Ruta {
  number: string;
  name: string;
  question: string;
  levels: Nivel[];
}

export const consultoria = {
  meta: {
    title: 'Consultoría de negocios | Fedes Consultora',
    description:
      'Auditamos en 60 días el mercado, la marca, la oferta y la organización de tu empresa y definimos una hoja de ruta ejecutable. Estrategia, tecnología y ejecución con un solo equipo.',
  },

  hero: {
    eyebrow: 'Consultoría',
    title: 'Estrategia primero. Ejecución después.',
    body: 'Auditamos en 60 días cómo se posiciona, vende y opera tu empresa. Con esa información definimos una hoja de ruta y la ejecutamos junto a tu equipo, con tecnología propia cuando hace falta.',
  },

  onboarding: {
    title: 'Toda ruta empieza con una auditoría de 60 días.',
    body: 'Cada onboarding dura 60 días y termina en un informe final impreso con conclusiones, prioridades y un plan de acción. Para un diagnóstico preciso, trabajamos con acceso a tus plataformas y cuentas.',
  },

  nivelesNota: 'Cada nivel incluye al anterior.',

  rutas: [
    {
      number: '01',
      name: 'Mercado y marca',
      question: '¿Cómo te ven tus clientes y dónde puede crecer tu empresa?',
      levels: [
        {
          name: 'Onboarding Digital',
          body: 'Revisamos el ecosistema digital completo (redes, Google, sitio web y e-commerce), auditamos comunicación, contenido y coherencia visual, y analizamos la performance publicitaria.',
          entregable: 'Plan de acción digital.',
        },
        {
          name: 'Onboarding Identidad',
          includes: 'Digital',
          body: 'Analizamos logo, tipografía, paleta y lineamientos visuales, el tono y la narrativa, la segmentación y el posicionamiento, y evaluamos opciones de naming y slogans cuando corresponde.',
          entregable: 'Guía de identidad y recomendaciones estratégicas.',
        },
        {
          name: 'Onboarding Mercado',
          includes: 'Digital e Identidad',
          body: 'Estudiamos el mercado, sus tendencias y el comportamiento del consumidor, hacemos análisis competitivo y benchmarking, y evaluamos pricing, oferta y oportunidades de expansión.',
          entregable: 'Estrategia con caminos de acción priorizados a mediano y largo plazo.',
        },
      ],
    },
    {
      number: '02',
      name: 'Oferta y comercial',
      question: '¿Qué vendés y cómo lo vendés?',
      levels: [
        {
          name: 'Onboarding Producto',
          body: 'Auditamos la arquitectura de la oferta, el ciclo de vida de productos y servicios y su presentación.',
          entregable: 'Catálogo optimizado, para enfocar los recursos donde hay rentabilidad.',
        },
        {
          name: 'Onboarding Comercial',
          includes: 'Producto',
          body: 'Auditamos el embudo, el CRM, el desempeño del equipo y el cierre de ventas.',
          entregable: 'Protocolo de gestión de ventas, para un proceso repetible.',
        },
      ],
    },
    {
      number: '03',
      name: 'Organización y finanzas',
      question: '¿Cómo funciona tu empresa por dentro y cuánto rinde?',
      levels: [
        {
          name: 'Onboarding Organizacional',
          body: 'Auditamos procesos, roles, comunicación interna y cultura.',
          entregable: 'Mapa de procesos y roles, para que la operación no dependa de personas clave.',
        },
        {
          name: 'Onboarding Financiero',
          includes: 'Organizacional',
          body: 'Auditamos costos, márgenes, flujo de caja y proyecciones.',
          entregable: 'Hoja de ruta de rentabilidad, para entender por qué se factura y no queda margen.',
        },
      ],
    },
  ] as Ruta[],

  porDondeEmpezar: {
    title: '¿Por dónde empezar?',
    body: 'En la sesión de diagnóstico, sin cargo, definimos con vos qué ruta y qué onboarding tiene sentido para tu empresa.',
  },

  despues: {
    title: 'De la hoja de ruta a la ejecución.',
    body: 'Al terminar la auditoría, podés continuar con nosotros en un plan mensual de ejecución, definido a partir de la hoja de ruta. Ejecutamos nosotros mismos, sin intermediarios.',
    // Marcador visible: no se listan servicios ni precios hasta definir el plan mensual.
    pendiente: '[PENDIENTE] Definir qué incluye el plan mensual para poder detallarlo en esta sección.',
  },

  tecnologia: {
    title: 'También construimos la tecnología que tu operación necesita.',
    body: 'Desarrollamos aplicaciones, sitios web y landings a medida, integrados a la estrategia comercial.',
    vaddar: {
      name: 'Vaddar',
      badge: 'ERP en versión beta',
      body: 'Vaddar es nuestro ERP para gestionar la operación de una empresa. Ya está disponible en el mercado, en versión beta, y lo implementamos en las empresas cuya operación se ajusta a la plataforma.',
      cta: { label: 'Consultá por Vaddar', href: '/contacto' },
    },
  },

  cierre: {
    title: 'Empecemos por un diagnóstico.',
    body: 'Una sesión ejecutiva para analizar el estado de tu negocio y definir por dónde empezar. Sin cargo.',
    cta: { label: 'Agendar sesión de diagnóstico', href: '/contacto' },
  },
};

// Contenido de la página Inicio. Fuente literal: docs/03-inicio.md y docs/05-casos.md

import { photos } from './photos';

export const inicio = {
  // [PENDIENTE] Metadatos del Inicio: propuesta armada con textos de los docs, a validar con el equipo.
  meta: {
    title: 'Consultoría de negocios para empresas | Fedes Consultora',
    description:
      'Auditamos cómo se posiciona, vende y opera tu empresa y ejecutamos la hoja de ruta con equipo propio. Agendá una sesión de diagnóstico sin cargo.',
  },

  hero: {
    pills: ['Estrategia', 'Procesos', 'Tecnología'],
    title: 'Consultoría de negocios para empresas que quieren escalar con estructura.',
    body: 'Auditamos cómo se posiciona, vende y opera tu empresa. Con esa información definimos una hoja de ruta y la ejecutamos nosotros mismos, con tecnología propia cuando hace falta.',
    // Sin botón de «Agendar sesión de diagnóstico» en el hero (30/09, pedido del cliente): ya está en el menú principal.
    cta: { label: 'Ver casos', href: '/casos' },
    // "+5 años" es un dato del cliente (indicado directamente, no está en /docs). El otro ya estaba publicado: sesión sin cargo.
    facts: [
      { label: 'Potenciando empresas', value: '+5 años' },
      { label: 'Sesión de diagnóstico', value: 'Sin cargo' },
    ],
    image: {
      src: photos.hero,
      alt: 'Sala de reuniones vidriada con un equipo de trabajo reunido',
      brief: 'Equipo ejecutivo en reunión, oficina luminosa, tonos fríos',
    },
  },

  marquee: ['Estrategia', 'Procesos', 'Tecnología', 'Consultoría de negocios', 'Ejecución propia'],

  problema: {
    title: 'Facturar no es lo mismo que ganar dinero.',
    body: 'Cuando una empresa crece, la complejidad crece más rápido que la estructura: procesos que dependen de personas, decisiones sin datos, márgenes que no se explican y una marca que no acompaña el tamaño del negocio.',
    image: {
      src: photos.problema,
      alt: 'Equipo de negocios analizando documentos y gráficos en una oficina',
      brief: 'Ejecutivo frente a tablero de datos o documentos de gestión',
    },
  },

  rutas: {
    title: 'Tres rutas para ordenar tu empresa.',
    items: [
      { name: 'Mercado y marca', question: '¿cómo te ven tus clientes y dónde puede crecer tu empresa?' },
      { name: 'Oferta y comercial', question: '¿qué vendés y cómo lo vendés?' },
      { name: 'Organización y finanzas', question: '¿cómo funciona tu empresa por dentro y cuánto rinde?' },
    ],
    tecnologia: {
      name: 'Tecnología',
      body: 'Desarrollamos aplicaciones, sitios web y landings a medida, y ofrecemos Vaddar, nuestro ERP en versión beta.',
    },
    cta: { label: 'Ver Consultoría', href: '/consultoria' },
  },

  metodo: {
    title: 'Un método, no una lista de servicios.',
    steps: [
      {
        name: 'Sesión de diagnóstico.',
        body: 'Una conversación ejecutiva, sin cargo, para entender tu negocio y definir la ruta y el onboarding que conviene.',
      },
      {
        name: 'Onboarding de 60 días.',
        body: 'Una auditoría a fondo del área elegida, con acceso a tus plataformas y datos para que el diagnóstico sea preciso.',
      },
      {
        name: 'Informe y plan de acción.',
        body: 'Un informe final con conclusiones, prioridades y un plan de acción que tu equipo puede aplicar.',
      },
      {
        name: 'Ejecución.',
        body: 'Implementamos el plan con nuestro equipo, en un plan mensual, con tecnología propia cuando hace falta.',
      },
    ],
  },

  casos: {
    title: 'Resultados por industria.',
    body: 'Trabajamos con confidencialidad corporativa: los casos se presentan de forma anónima.',
    cta: { label: 'Ver casos', href: '/casos' },
    // Orden fijo según docs/03-inicio.md. Cifras y plazos literales de docs/05-casos.md.
    items: [
      {
        sector: 'Distribución mayorista',
        onboarding: 'Onboarding Mercado',
        image: photos.casoDistribucion,
        prefix: 'Cerca del',
        figure: '16%',
        headline: 'Expansión territorial y cerca del 16% de la facturación a través de su app.',
      },
      {
        sector: 'Comercio exterior y logística',
        onboarding: 'Onboarding Mercado',
        image: photos.casoLogistica,
        prefix: 'Hasta',
        figure: '50%',
        headline: 'Toda su infraestructura digitalizada: hasta un 50% menos de procesos y tiempo.',
      },
      {
        sector: 'Agromarketing y sanidad animal',
        onboarding: 'Onboarding Digital',
        image: photos.casoAgro,
        prefix: '',
        figure: '+297,3%',
        headline: '+297,3% de crecimiento en visualizaciones.',
      },
    ],
    plazo: 'Plazo: 60 días, la duración del onboarding.',
  },

  principios: {
    title: 'Cuatro principios.',
    items: [
      { name: 'Estructura antes que táctica.', body: 'Primero ordenamos la empresa; después ejecutamos.' },
      {
        name: 'Método con entregables.',
        body: 'Cada proyecto empieza con una auditoría de 60 días y termina en un informe y un plan de acción.',
      },
      {
        name: 'Resultados medibles.',
        body: 'Cada proyecto se mide contra su objetivo: presencia, ventas o eficiencia, y no contra métricas que no muevan el negocio.',
      },
      {
        name: 'Ejecución y tecnología propias.',
        body: 'Ejecutamos nosotros mismos, sin tercerizar, y desarrollamos nuestra propia tecnología.',
      },
    ],
    contraste: {
      title: 'Dos formas de encarar el crecimiento.',
      colTradicional: 'Enfoque tradicional',
      colFedes: 'Enfoque Fedes',
      rows: [
        ['Sitios y aplicaciones aisladas', 'Tecnología integrada a la estrategia comercial'],
        ['Marketing táctico y pauta mensual', 'Canales y posicionamiento definidos a partir de un diagnóstico'],
        ['Servicios mensuales sin métricas claras', 'Auditoría de 60 días y plan de acción con prioridades'],
      ],
    },
  },

  cierre: {
    title: 'Empecemos por un diagnóstico.',
    body: 'Una sesión ejecutiva para analizar el estado de tu negocio y definir por dónde empezar. Sin cargo.',
    cta: { label: 'Agendar sesión de diagnóstico', href: '/contacto' },
  },
};

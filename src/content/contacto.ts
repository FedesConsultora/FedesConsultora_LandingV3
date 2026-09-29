// Contenido de Contacto y Nosotros. Fuente literal: docs/06-contacto-y-nosotros.md

export const contacto = {
  meta: {
    title: 'Contacto | Fedes Consultora',
    description:
      'Agendá una sesión de diagnóstico sin cargo para analizar el estado de tu empresa y definir por dónde empezar.',
  },

  hero: {
    eyebrow: 'Contacto',
    title: 'Hablemos de tu empresa.',
    body: 'Agendá una sesión de diagnóstico, sin cargo, para analizar el estado de tu negocio y definir por dónde empezar.',
  },

  incluye: {
    title: 'Qué incluye la sesión',
    items: [
      'Una sesión ejecutiva con un consultor de Fedes, de 45 minutos, por Google Meet.',
      'Un análisis preliminar de la madurez operativa y de los activos digitales de tu empresa.',
      'Confidencialidad sobre los datos que compartas.',
    ],
  },

  // Agenda embebida (Google Calendar). Excepción puntual, pedida por el cliente el 28/09:
  // el widget de Google muestra el nombre de quien atiende, solo acá. El resto del sitio
  // sigue sin nombrar personas del equipo (docs/06-contacto-y-nosotros.md).
  // El formulario y el calendario se unificaron en un flujo de 2 pasos (29/09, pedido del
  // cliente): no hay forma técnica de fusionarlos en un solo formulario (Google no expone
  // sus propios campos ni acepta autocompletar nombre/mail por URL), así que se ordenaron
  // como un único trámite secuencial en vez de dos caminos alternativos.
  calendario: {
    title: 'Elegí un horario',
    body: 'Seleccioná el día y el horario que te quede cómodo. La sesión dura 45 minutos, por Google Meet. Google te va a pedir tu nombre y mail de nuevo para confirmar la reserva.',
    embedUrl: 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ19JF6L1eipDhqCCUQr1FpObl3R5w1WcsYH4wRPfnbOfUsCc2vz07la72glqvWmDA_Svg19CKBU',
    embedTitle: 'Agendar sesión de diagnóstico en Google Calendar',
    // Mensaje mostrado arriba del calendario, ya con el formulario enviado. {nombre} se reemplaza en el momento.
    transicion: (nombre: string) => `¡Gracias${nombre ? ', ' + nombre : ''}! Ahora elegí un horario para tu sesión.`,
  },

  pasoDatos: {
    title: 'Contanos sobre tu empresa',
    body: 'Así llegamos con contexto a la sesión. Cuando termines, vas a poder elegir el horario que te quede mejor.',
  },

  form: {
    submit: 'Continuar y elegir horario',
    // Cargo, WhatsApp y Comentarios se sacaron del formulario (29/09, pedido del cliente),
    // para que el paso 1 sea más corto. La base sigue aceptando esos datos si hicieran falta
    // a futuro (columnas nullable), pero el formulario ya no los pide.
    labels: {
      nombre: 'Nombre y apellido',
      empresa: 'Empresa',
      email: 'Email',
      tamano: 'Tamaño de la empresa',
      resolver: '¿Qué querés resolver?',
    },
    // Rangos definidos a pedido del cliente (28/09), por cantidad de empleados.
    tamanoPlaceholder: 'Elegí un rango',
    tamanoOptions: ['Hasta 10 empleados', '11 a 50 empleados', '51 a 200 empleados', '201 a 500 empleados', 'Más de 500 empleados'],
    resolverOptions: [
      'Mercado y marca',
      'Oferta y comercial',
      'Organización y finanzas',
      'Tecnología',
      'Todavía no lo sé',
    ],
    resolverPlaceholder: 'Elegí una opción',
    privacyPrefix: 'Acepto la',
    privacyLink: { label: 'Política de Privacidad', href: '/privacidad' },
    success: 'Recibimos tu solicitud. Nos comunicaremos en menos de 24 horas para coordinar la sesión.',
    // Texto técnico no definido en los docs; validar redacción.
    sending: 'Enviando…',
    error:
      'No pudimos enviar tu solicitud. Escribinos a info@fedesconsultora.com y te respondemos a la brevedad.',
  },

  otrasVias: 'Otras vías de contacto',

  // Sección agregada a pedido del cliente (29/09). Texto nuevo, no está en los docs: validar redacción.
  trabajos: {
    eyebrow: 'Trabajá con nosotros',
    title: 'Sumate al equipo.',
    body: 'Si querés formar parte de Fedes, mandanos tu CV y contanos en qué te gustaría aportar.',
    email: 'rrhh@fedesconsultora.com',
  },
};

export const nosotros = {
  // [PENDIENTE] Metadatos de Nosotros.
  meta: {
    title: 'Nosotros | Fedes Consultora',
    description: 'Estamos actualizando esta sección. Conocé nuestro método o hablá directamente con nosotros.',
  },
  eyebrow: 'Nosotros',
  title: 'Estamos actualizando esta sección.',
  body: 'Muy pronto vas a encontrar acá quiénes somos y cómo trabajamos. Mientras tanto, podés conocer nuestro método o hablar directamente con nosotros.',
  // Sin botón de «Agendar sesión de diagnóstico» en el hero (30/09, pedido del cliente): ya está en el menú principal.
  primary: { label: 'Ver Consultoría', href: '/consultoria' },
};

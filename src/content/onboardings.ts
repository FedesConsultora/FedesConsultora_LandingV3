// Contenido de la página Onboardings. Las tres rutas y sus onboardings se reutilizan
// literalmente de `consultoria.ts` (misma fuente: docs/04-consultoria.md), para no duplicar el dato.
// Lo que sigue es texto de enlace nuevo, escrito para esta página: validar con el equipo.

export const onboardings = {
  meta: {
    title: 'Onboardings por ruta | Fedes Consultora',
    description:
      'Elegí la ruta que tu empresa necesita hoy: Mercado y marca, Oferta y comercial u Organización y finanzas. Cada onboarding dura 60 días y termina en un plan de acción.',
  },

  hero: {
    eyebrow: 'Onboardings',
    title: 'Elegí por dónde empezar.',
    body: 'Tres rutas, cada una con sus propios onboardings acumulativos de 60 días. Si no sabés cuál te conviene, lo resolvemos juntos en la sesión de diagnóstico, sin cargo.',
  },

  overview: {
    eyebrow: 'Tres rutas',
    title: 'Cada nivel incluye al anterior. Elegí la pregunta que hoy le falta responder a tu empresa.',
    cta: 'Ver el detalle',
  },

  // Texto de cada botón: personaliza la ruta y lleva a Contacto con esa opción ya preseleccionada.
  ctaRuta: (rutaName: string) => `Quiero empezar por ${rutaName}`,

  closing: {
    title: '¿No estás seguro por dónde arrancar?',
    body: 'Está bien no saberlo todavía. Para eso es la sesión de diagnóstico: la hacemos juntos y salís con la ruta y el onboarding que tiene sentido para tu empresa.',
    cta: { label: 'Agendar sesión de diagnóstico', href: '/contacto' },
  },
};

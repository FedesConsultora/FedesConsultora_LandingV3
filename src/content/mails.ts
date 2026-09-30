// Textos fijos de los mails que envía el panel (fase 2, docs/09-portal-leads.md sección 7).
// El cuerpo de cada mail sale de las plantillas editables del panel; esto es el marco común.
// Mientras algún texto tenga "[PENDIENTE]" (incluido el pie legal), no sale ningún mail real.

export const mails = {
  remitente: 'Fedes Consultora <info@fedesconsultora.com>',

  // Pie de todos los mails. El texto legal y de baja no se inventa (CLAUDE.md).
  pieLegal: '[TEXTO LEGAL PENDIENTE]',
  // Literal de docs/09-portal-leads.md, sección 5.
  bajaEnlace: 'No quiero recibir más comunicaciones',

  // Texto de los botones que reemplazan a {{link_landing}} y {{link_agendar}} en el HTML.
  // A validar: no están en los docs.
  botonLanding: 'Ver mi diagnóstico',
  botonAgendar: 'Agendar reunión',

  // Página de baja (/m/.../baja). A validar con el abogado, junto con el resto de los textos de baja.
  baja: {
    titulo: 'No quiero recibir más comunicaciones',
    pregunta: '¿Confirmás que no querés recibir más comunicaciones de Fedes Consultora?',
    boton: 'Confirmar',
    confirmacion: 'Registramos tu pedido: no vas a recibir más comunicaciones de Fedes Consultora.',
  },
};

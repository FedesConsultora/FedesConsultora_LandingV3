// Textos fijos de la landing privada del lead (/diagnostico/[token]). El contenido de cada
// landing lo escribe y aprueba el equipo en el panel; esto es solo el marco de la página.
// Fuente: docs/09-portal-leads.md, sección 5. Lo marcado "a validar" es texto propio, no está en los docs.

export const diagnostico = {
  // A validar.
  proximamente: 'Próximamente',

  // Link inexistente, vencido o revocado: la misma página para los tres casos, sin revelar el motivo.
  // A validar.
  noDisponible: {
    titulo: 'Este link no está disponible.',
    texto: 'Si necesitás acceder a tu diagnóstico, escribinos a info@fedesconsultora.com.',
  },

  baja: {
    // Literal de docs/09-portal-leads.md, sección 5.
    boton: 'No quiero recibir más comunicaciones',
    // A validar (con el abogado, junto con el resto de los textos de baja).
    confirmacion: 'Registramos tu pedido: no vas a recibir más comunicaciones de Fedes Consultora.',
  },
};

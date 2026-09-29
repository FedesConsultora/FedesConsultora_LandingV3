// Contenido global del sitio. Fuente: docs/02-sitemap.md y docs/06-contacto-y-nosotros.md

export const site = {
  name: 'Fedes Consultora',
  // Logo en blanco (uso permitido: sobre negro o sobre #44718D). Original en assets/logo/.
  logo: '/fedes-logo-blanco.svg',
  url: 'https://fedesconsultora.com',
};

export const nav = [
  { label: 'Inicio', href: '/' },
  { label: 'Consultoría', href: '/consultoria' },
  { label: 'Onboardings', href: '/onboardings' },
  { label: 'Casos', href: '/casos' },
  { label: 'Contacto', href: '/contacto' },
];

export const ctaNav = { label: 'Agendar sesión de diagnóstico', href: '/contacto' };

// Nosotros no aparece en el pie ni en el menú.
export const legalLinks = [
  { label: 'Política de Privacidad', href: '/privacidad' },
  { label: 'Términos y Condiciones', href: '/terminos-y-condiciones' },
];

export const contactChannels = {
  whatsapp: { label: '+54 9 221 309-2529', href: 'https://wa.me/5492213092529' },
  email: { label: 'info@fedesconsultora.com', href: 'mailto:info@fedesconsultora.com' },
  linkedin: { label: 'LinkedIn', href: 'https://ar.linkedin.com/company/fedesconsultora' },
  location: 'Buenos Aires, Argentina',
};

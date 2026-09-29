// Datos estructurados (schema.org). Solo datos ya publicados en los docs: sin precios ni cifras nuevas.
import { site, contactChannels } from '../content/site';

export const SITE_URL = (import.meta.env.SITE || site.url).replace(/\/$/, '');
const orgId = `${SITE_URL}/#organization`;
const webId = `${SITE_URL}/#website`;

export const organization = {
  '@type': ['Organization', 'ProfessionalService'],
  '@id': orgId,
  name: site.name,
  url: `${SITE_URL}/`,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-512.png`, width: 512, height: 512 },
  image: `${SITE_URL}/og-fedes.jpg`,
  // docs/01-brief-y-decisiones.md
  description:
    'Consultora de negocios que también ejecuta. Audita cómo se posiciona, vende y opera una empresa, define una hoja de ruta y la ejecuta con equipo propio, con tecnología propia cuando hace falta.',
  email: 'info@fedesconsultora.com',
  address: { '@type': 'PostalAddress', addressLocality: 'Buenos Aires', addressCountry: 'AR' },
  sameAs: [contactChannels.linkedin.href],
  knowsAbout: ['Consultoría de negocios', 'Estrategia', 'Procesos', 'Tecnología'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'sesión de diagnóstico',
    email: 'info@fedesconsultora.com',
    availableLanguage: 'es-AR',
    url: `${SITE_URL}/contacto`,
  },
};

export const website = {
  '@type': 'WebSite',
  '@id': webId,
  url: `${SITE_URL}/`,
  name: site.name,
  inLanguage: 'es-AR',
  publisher: { '@id': orgId },
};

export const breadcrumb = (items: { name: string; path: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: `${SITE_URL}${it.path}`,
  })),
});

export const graph = (...nodes: object[]) => ({ '@context': 'https://schema.org', '@graph': nodes });

export const providerRef = { '@id': orgId };

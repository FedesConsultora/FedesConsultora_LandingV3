// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

// Dominio canónico para HTML prerenderizado, sitemap y datos estructurados. Es configuración de build.
const site = process.env.PUBLIC_SITE_URL || 'https://fedesconsultora.com';

export default defineConfig({
  site,
  trailingSlash: 'never',
  // Estático por defecto; las rutas con prerender=false corren en el servidor Node standalone.
  adapter: node({ mode: 'standalone', bodySizeLimit: 1024 * 1024 }),
  session: false,
  integrations: [
    sitemap({
      // Nosotros está en construcción; el panel y las landings privadas, fuera del sitemap.
      filter: (page) => !page.includes('/nosotros') && !page.includes('/admin') && !page.includes('/diagnostico'),
    }),
  ],
  // El chequeo de origen de los formularios lo hace src/middleware.ts, porque la baja en un
  // clic de los mails (RFC 8058) llega desde el servidor del
  // proveedor de correo, sin cabecera Origin, y hay que aceptarla en esa sola ruta.
  security: {
    // El Nginx privado de fedes-net sobrescribe estos forwarded headers. Solo confiamos en el
    // host público apex; www redirige antes de alcanzar este servicio.
    allowedDomains: [{ hostname: 'fedesconsultora.com', protocol: 'https' }],
    checkOrigin: false,
  },
  redirects: {
    '/agencia': '/consultoria',
    '/consultora': '/consultoria',
    '/hablemos': '/contacto',
    '/onboarding-empresas': '/onboardings',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});

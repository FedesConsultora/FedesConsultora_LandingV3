// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// Dominio definitivo (canonical, sitemap, datos estructurados). Sobrescribible con PUBLIC_SITE_URL.
const site = process.env.PUBLIC_SITE_URL || 'https://fedesconsultora.com';

export default defineConfig({
  site,
  trailingSlash: 'never',
  // Estático por defecto. Solo el endpoint del formulario corre en el servidor (prerender = false).
  adapter: vercel(),
  integrations: [
    sitemap({
      // Nosotros está en construcción; el panel y las landings privadas, fuera del sitemap.
      filter: (page) => !page.includes('/nosotros') && !page.includes('/admin') && !page.includes('/diagnostico'),
    }),
  ],
  // El chequeo de origen de los formularios lo hace src/middleware.ts (mismas reglas que el de
  // Astro), porque la baja en un clic de los mails (RFC 8058) llega desde el servidor del
  // proveedor de correo, sin cabecera Origin, y hay que aceptarla en esa sola ruta.
  security: { checkOrigin: false },
  redirects: {
    '/agencia': '/consultoria',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});

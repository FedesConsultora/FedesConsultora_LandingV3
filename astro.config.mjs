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
  redirects: {
    '/agencia': '/consultoria',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});

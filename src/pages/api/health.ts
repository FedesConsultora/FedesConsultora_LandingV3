import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = () =>
  Response.json({
    status: 'ok',
    service: 'fedesconsultora-web',
    build: import.meta.env.PUBLIC_BUILD_ID || 'unknown',
  });

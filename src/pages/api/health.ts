import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = () =>
  Response.json({
    ok: true,
    service: 'fedesconsultora-web',
    version: import.meta.env.PUBLIC_BUILD_ID || 'unknown',
  });

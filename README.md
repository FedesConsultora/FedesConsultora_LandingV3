# Fedes Consultora — V3

Sitio público de Fedes Consultora y portal privado de leads. El frontend es Astro 7 con páginas prerenderizadas por defecto; las rutas dinámicas concretas usan `prerender = false` y corren en Node standalone. La aplicación se prepara para Docker detrás del Nginx central. PostgreSQL sigue en Neon y el correo usa Resend.

## Desarrollo y verificación

```sh
npm ci
npm run dev
npm run verify
```

`npm run verify` es hermético: ejecuta `astro check`, Vitest y el build, sin conectar a una base ni requerir secretos. `npm run smoke` prueba una instancia Node ya iniciada. Las verificaciones que modifican datos necesitan una rama Neon de desarrollo marcada con `marca_desarrollo`; para CI existe `npm run verify:integration`, que exige una rama Neon exclusiva y secretos de CI, y siempre bloquea el envío real de correo.

## Producción

No se hace deploy remoto desde este repositorio. Compose publica solo el servicio en la red Docker externa `fedes-net`; el proxy del VPS enruta a `fedesconsultora-web:4321`. Las variables secretas se cargan en runtime desde `.env.production`, fuera de Git y de la imagen.

- [Arquitectura](docs/ARCHITECTURE.md)
- [Despliegue VPS](docs/DEPLOY_VPS.md)
- [Operaciones](docs/OPERATIONS.md)
- [Rollback](docs/ROLLBACK.md)
- [Portal de leads](docs/09-portal-leads.md)

`PUBLIC_INDEXABLE` permanece `false` por defecto. No activar indexación ni correos reales como parte de la migración.

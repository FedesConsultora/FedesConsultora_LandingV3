# Fedes Consultora — V3

Sitio público de Fedes Consultora y portal privado de leads. El frontend es Astro 7 con páginas prerenderizadas por defecto; las rutas dinámicas concretas usan `prerender = false` y corren en Node standalone. La aplicación se prepara para Docker detrás del Nginx central. PostgreSQL sigue en Neon y el correo usa Resend.

## Desarrollo y verificación

```sh
npm ci
npm run dev
npm run verify
```

`npm run verify` es hermético: ejecuta `astro check`, Vitest y el build, sin conectar a una base ni requerir secretos. `npm run smoke` prueba una instancia Node ya iniciada. `npm run verify:integration` es un gate manual separado: requiere una rama Neon CI dedicada con marca `marca_ci` coincidente con el branch ID configurado y usa un mock local de Resend; nunca usa `main`, la rama compartida de desarrollo o credenciales reales de correo.

## Producción

No se hace deploy remoto desde este repositorio. El workflow manual **Publish release image** valida y publica un artefacto GHCR etiquetado por SHA, informa su digest y rehúsa reemplazar la etiqueta existente. Producción despliega por digest desde `/srv/fedesconsultora`; Compose conecta sólo el servicio a la red Docker externa `fedes-net`, y el proxy enruta a `fedesconsultora-web:4321`. Las variables secretas se cargan en runtime desde `.env.production`, fuera de Git y de la imagen.

- [Arquitectura](docs/ARCHITECTURE.md)
- [Despliegue VPS](docs/DEPLOY_VPS.md)
- [Operaciones](docs/OPERATIONS.md)
- [Rollback](docs/ROLLBACK.md)
- [Portal de leads](docs/09-portal-leads.md)

Para un build local de diagnóstico, usar el override explícito: `IMAGE_REF=fedesconsultora-web:local BUILD_SHA=$(git rev-parse HEAD) RUNTIME_ENV_FILE=/dev/null RUNTIME_ENV_FILE_REQUIRED=false docker compose -f docker-compose.yml -f docker-compose.build.yml build`. El Compose base permanece image-only y exige `.env.production` para producción.

`PUBLIC_INDEXABLE` permanece `false` por defecto. No activar indexación ni correos reales como parte de la migración.

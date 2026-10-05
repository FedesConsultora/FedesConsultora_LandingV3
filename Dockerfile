# Pin Node to the same major/minor patch validated for the VPS runtime.
FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG PUBLIC_SITE_URL=https://fedesconsultora.com
ARG PUBLIC_INDEXABLE=false
ARG PUBLIC_GA_ID=
ARG PUBLIC_BUILD_ID=unknown
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL} \
    PUBLIC_INDEXABLE=${PUBLIC_INDEXABLE} \
    PUBLIC_GA_ID=${PUBLIC_GA_ID} \
    PUBLIC_BUILD_ID=${PUBLIC_BUILD_ID}
RUN npm run build

FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
WORKDIR /app
ARG VCS_REF=unknown
ARG PUBLIC_BUILD_ID=unknown
LABEL org.opencontainers.image.source="https://github.com/FedesConsultora/FedesConsultora_LandingV3" \
      org.opencontainers.image.revision=${VCS_REF} \
      org.opencontainers.image.version=${PUBLIC_BUILD_ID}

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/db/migrations ./db/migrations
COPY --from=build --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=build --chown=node:node /app/scripts/create-admin.mjs ./scripts/create-admin.mjs
COPY --from=build --chown=node:node /app/scripts/lib/split-sql.mjs ./scripts/lib/split-sql.mjs

USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4321/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "./dist/server/entry.mjs"]

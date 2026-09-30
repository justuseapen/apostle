# syntax=docker/dockerfile:1
# Coolify / bare-metal image for Apostle (node-server Nitro preset).
# Build installs devDependencies (vite/nitro). Migrations run at container start.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Coolify may inject NODE_ENV=production as a build ARG; force full install.
RUN npm ci --include=dev

FROM deps AS build
COPY . .
# Keep NODE_ENV unset/development-ish for the Vite/Nitro toolchain.
ENV NITRO_PRESET=node-server
RUN npm run build:selfhost

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=8080
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 apostle \
  && useradd --system --uid 1001 --gid apostle --home-dir /app --shell /usr/sbin/nologin apostle
COPY --from=deps --chown=apostle:apostle /app/node_modules ./node_modules
COPY --from=build --chown=apostle:apostle /app/.output ./.output
COPY --from=build --chown=apostle:apostle /app/package.json ./package.json
COPY --from=build --chown=apostle:apostle /app/migrations ./migrations
COPY --from=build --chown=apostle:apostle /app/scripts/migrate.mjs /app/scripts/migration-plan.mjs ./scripts/
USER apostle
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "start"]

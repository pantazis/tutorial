# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d

FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM dependencies AS checks
ENV NODE_ENV=test
COPY . .

FROM dependencies AS browser
RUN npx playwright install --with-deps chromium
ENV NODE_ENV=test
COPY . .

FROM dependencies AS builder
ENV NODE_ENV=production
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS production
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nextjs \
    && useradd --system --uid 1001 --gid nextjs --home-dir /app nextjs
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/scripts/healthcheck.mjs ./scripts/healthcheck.mjs
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
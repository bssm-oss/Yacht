FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.6.5 --activate

# ── fetch stage: populate pnpm store from lockfile only ─────────────────────
FROM base AS fetch
WORKDIR /app
COPY pnpm-lock.yaml .
RUN pnpm fetch

# ── build stage ──────────────────────────────────────────────────────────────
FROM fetch AS build
WORKDIR /app
COPY . .
RUN pnpm install --offline --frozen-lockfile
RUN pnpm --filter @dice/backend build

# ── production stage ─────────────────────────────────────────────────────────
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist

EXPOSE 3001
CMD ["node", "dist/apps/backend/src/main"]

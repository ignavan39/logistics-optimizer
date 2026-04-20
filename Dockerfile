# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage Dockerfile for NestJS microservices
# Usage: docker build --build-arg SERVICE=order-service -t logistics/order-service .
# ─────────────────────────────────────────────────────────────────────────────

ARG SERVICE=order-service
ARG NODE_VERSION=20-alpine

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /workspace

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY tsconfig.base.json ./

# Copy all package.json files first (layer cache optimization)
COPY apps/api-gateway/package.json        ./apps/api-gateway/
COPY apps/order-service/package.json      ./apps/order-service/
COPY apps/fleet-service/package.json      ./apps/fleet-service/
COPY apps/routing-service/package.json    ./apps/routing-service/
COPY apps/tracking-service/package.json   ./apps/tracking-service/
COPY apps/dispatcher-service/package.json ./apps/dispatcher-service/
COPY libs/proto/package.json              ./libs/proto/
COPY libs/kafka-utils/package.json        ./libs/kafka-utils/

RUN pnpm install --frozen-lockfile

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM deps AS builder
ARG SERVICE

COPY . .

# Build only the target service and its dependencies
RUN pnpm --filter @logistics/${SERVICE} build

# ── Stage 3: production image ─────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
ARG SERVICE

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nestjs

# Copy built app
COPY --from=builder --chown=nestjs:nodejs /workspace/apps/${SERVICE}/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /workspace/node_modules           ./node_modules
COPY --from=builder --chown=nestjs:nodejs /workspace/libs/proto/src         ./libs/proto/src

USER nestjs

# Health check — each service exposes /health on metrics port
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:9464/health || exit 1

EXPOSE 9464

CMD ["node", "dist/main"]

# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage Dockerfile for NestJS microservices
# ─────────────────────────────────────────────────────────────────────────────

ARG SERVICE=order-service
ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS builder
ARG SERVICE
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/proto/package.json ./libs/proto/package.json
COPY libs/document-templates/package.json ./libs/document-templates/package.json
COPY libs/kafka-utils/package.json ./libs/kafka-utils/package.json
COPY apps apps
COPY libs libs
COPY tsconfig.base.json ./

RUN corepack enable && corepack prepare pnpm@latest --activate && \
    pnpm install --frozen-lockfile

WORKDIR /workspace/libs/document-templates
RUN pnpm build

WORKDIR /workspace/apps/${SERVICE}
RUN pnpm build

FROM node:${NODE_VERSION} AS runner
ARG SERVICE
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps apps
COPY libs libs

RUN pnpm config set public-hoist-pattern '*' && \
    pnpm install --frozen-lockfile --prod --ignore-scripts && \
    cd node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt && \
    npm rebuild

COPY --from=builder /workspace/libs/proto/src ./libs/proto/src
COPY --from=builder /workspace/libs/document-templates/dist ./libs/document-templates/dist
COPY --from=builder /workspace/apps/${SERVICE}/dist ./dist

ENV SERVICE=${SERVICE}
ENV NODE_ENV=production
USER node

EXPOSE 9464

COPY --chmod=755 <<'EOF' /entrypoint.sh
#!/bin/sh
# Check order-service pattern (dist/main.js) first
if [ -f "dist/main.js" ]; then
    exec node dist/main.js "$@"
# Check api-gateway pattern (dist/apps/<service>/src/main.js)
elif [ -n "$SERVICE" ] && [ -f "dist/apps/${SERVICE}/src/main.js" ]; then
    exec node "dist/apps/${SERVICE}/src/main.js" "$@"
else
    echo "Error: Cannot find main.js"
    ls -la dist/ 2>/dev/null || true
    exit 1
fi
EOF

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/main.js"]
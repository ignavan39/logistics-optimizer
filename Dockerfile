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

WORKDIR /workspace/libs/kafka-utils
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
COPY --from=builder /workspace/libs/kafka-utils/dist ./libs/kafka-utils/dist
COPY --from=builder /workspace/libs/document-templates/dist ./libs/document-templates/dist
COPY --from=builder /workspace/apps/${SERVICE}/dist ./dist
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
USER node

EXPOSE 9464

ENTRYPOINT ["/entrypoint.sh"]
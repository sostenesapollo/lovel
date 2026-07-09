# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache python3 make g++ nodejs npm
COPY package.json bun.lock* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm install -g node-gyp
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY .env.production* ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PRIVATE_STANDALONE=true
ENV NODE_ENV=production
ENV CI=true

RUN --mount=type=cache,target=/app/.next/cache \
    bun run build:docker

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache libc6-compat wget nodejs \
    && mkdir -p /app/data

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=10s --start-period=90s --retries=15 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/ready" > /dev/null || exit 1

CMD ["/app/docker-entrypoint.sh"]

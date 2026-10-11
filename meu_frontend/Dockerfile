FROM docker.io/oven/bun:1.3.14 AS dependencies
WORKDIR /app/meu_frontend
COPY meu_frontend/package.json meu_frontend/bun.lock ./
RUN bun install --frozen-lockfile
WORKDIR /app/meu/schedulerService
COPY meu/schedulerService/package.json meu/schedulerService/bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS sources
COPY meu_frontend/ /app/meu_frontend/
COPY meu/schedulerService/ /app/meu/schedulerService/
COPY shared/trading/ /app/shared/trading/
WORKDIR /app/meu_frontend
RUN DATABASE_URL=mongodb://127.0.0.1:27017/meu bunx prisma generate

FROM sources AS development
RUN mkdir -p /app/meu_frontend/.next && chown -R bun:bun /app
USER bun
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["sh", "-c", "exec bun run dev --hostname \"$HOSTNAME\" --port \"$PORT\""]

FROM sources AS build
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
ENV NEXT_TELEMETRY_DISABLED=1
# No production credentials or database connections are used while building.
RUN DATABASE_URL=mongodb://127.0.0.1:27017/meu \
    BETTER_AUTH_SECRET=build-only-placeholder-never-used-at-runtime \
    BETTER_AUTH_URL="$NEXT_PUBLIC_APP_URL" \
    NEXT_PHASE=phase-production-build bun run build --webpack

FROM docker.io/oven/bun:1.3.14 AS production
WORKDIR /app/meu_frontend
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=bun:bun /app/meu_frontend/.next/standalone/ /app/
COPY --from=build --chown=bun:bun /app/meu_frontend/public/ ./public/
COPY --from=build --chown=bun:bun /app/meu_frontend/.next/static/ ./.next/static/
USER bun
EXPOSE 3000
CMD ["bun", "run", "server.js"]

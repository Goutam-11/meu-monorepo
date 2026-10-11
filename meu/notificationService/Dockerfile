FROM docker.io/oven/bun:1.3.14
WORKDIR /app/meu/notificationService
ENV NODE_ENV=production
ENV PRETTY_LOGS=false
COPY meu/notificationService/package.json meu/notificationService/bun.lock ./
RUN bun install --frozen-lockfile
COPY meu/notificationService/src ./src
USER bun
CMD ["bun", "run", "src/index.ts"]

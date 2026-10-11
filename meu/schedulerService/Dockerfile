FROM docker.io/oven/bun:1.3.14

WORKDIR /app/meu/schedulerService

ENV NODE_ENV=production
ENV PRETTY_LOGS=false

COPY meu/schedulerService/package*.json ./
COPY meu/schedulerService/bun.lock ./

RUN bun install --frozen-lockfile

COPY meu/schedulerService/ .
COPY shared/trading/ /app/shared/trading/
USER bun
CMD ["bun", "run", "index.ts"]

LABEL maintainer="goutamkumar.sharmq@gmail.com" author="Goutam Kumar Sharma"

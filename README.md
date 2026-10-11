# Meu

Meu is a trading-agent workspace: a Next.js frontend, a scheduler, execution workers and a notification consumer. It supports LLM trading, deterministic strategies, historical backtests and forward paper simulation, with Delta India as the primary crypto integration.

**[Open the documentation index](docs/README.md)** for architecture diagrams, module/function dependencies, data models, user workflows and maintenance guidance.

## Run and inspect

```bash
make check
make up
make logs SERVICE=worker
make logs SERVICE="scheduler worker" TAIL=200 SINCE=30m FOLLOW=0
make down
```

The default engine is Podman; add `ENGINE=docker` for Docker. `make dev` starts the development stack. Configure the shared environment and encryption key first: [container setup](docs/CONTAINERS.md). Workers honor persisted RUNNING agents and may place real orders. Startup is an operational action, not a build-only check.

## Code areas

| Area | Entry point | Responsibility |
|---|---|---|
| `meu_frontend` | `src/app`, `src/trpc/routers/_app.ts` | Authentication, forms, owner-scoped APIs, backtests, recovery UI |
| `meu/schedulerService` scheduler | `index.ts` | Agent registry, Mongo change streams, recurring BullMQ scheduling |
| `meu/schedulerService` worker | `src/workers/worker.ts` | Strategy/provider selection, execution claims, broker guards, run persistence |
| `meu/notificationService` | `src/index.ts` | Notification persistence and Web Push delivery |
| `shared/trading` | `strategies.ts`, `perpetualBacktest.ts`, `paperTrading.ts` | Shared deterministic strategy and simulation contracts |

[Architecture](docs/ARCHITECTURE.md) explains their runtime connections. [Module map](docs/MODULES.md) identifies files to inspect together. [Generated index](docs/reference/CODE_MAP.md) lists static source dependencies and named functions; refresh it with `make docs`.

## Current feature scope

- Delta India algorithms: EMA crossover, Donchian breakout and Bollinger/RSI mean reversion; historical research, paper simulation and guarded live execution.
- Crypto LLM tools: Delta India and the supported Binance linear futures path. Binance USD-M native-stop sizing uses isolated, verified conditional stop/target protection; full-notional mode has separate restrictions.
- Zerodha: LLM execution, EMA algorithms and EMA-signal-gated hybrid execution. Crypto hybrid execution is not implemented.
- Credentials: named provider keys, searchable provider model catalogs, Bedrock Runtime/Mantle endpoints, bounded run memory.
- Operations: durable daily counters, account/ticker ownership, pause/resume history handling, broker reconciliation and scoped lock recovery, notifications and structured logs.

See the [capability matrix](docs/USER_GUIDE.md#supported-capabilities) for important differences rather than treating these markets as interchangeable.

## Development

Dependencies remain separate Bun projects. Run each project's `bun run test`; services use `bun run typecheck` and the frontend uses `bunx tsc --noEmit`. Frontend production validation uses `bun run build --webpack` or the container build. Scheduler/frontend tests run in separate Bun processes per test file because their module mocks can leak between files. [Development guide](docs/DEVELOPMENT.md) includes the exact commands and change checklist.

Prisma-managed fields live in `meu_frontend/prisma/schema.prisma`; the worker also uses native Mongo collections documented in [the data model](docs/DATA_MODEL.md). Regenerate Prisma clients instead of editing generated files. Mongo requires replica-set support. Review data/backfill changes separately from a schema/client build.

Repository layout and publishing rules: [monorepo guide](docs/REPOSITORY.md). Historical audits and research evidence remain local.

## Monorepo setup

Clone the whole repository; the frontend imports scheduler modules and shared trading code by relative path. Each service keeps its own Bun lockfile and dependencies.

```bash
git clone https://github.com/Goutam-11/meu-monorepo.git
cd meu-monorepo
(cd meu_frontend && bun install --frozen-lockfile)
(cd meu/schedulerService && bun install --frozen-lockfile)
(cd meu/notificationService && bun install --frozen-lockfile)
```

Copy the root and service `.env.example` files to `.env` and configure them as described in [container setup](docs/CONTAINERS.md). For local frontend development, generate its client after configuring `DATABASE_URL`:

```bash
(cd meu_frontend && bunx prisma generate)
```

Container builds generate the client automatically. Application code, regression tests, runtime assets and maintained docs are versioned. Research tooling/data, college submissions, local account state, secrets and generated Prisma/build output are excluded.

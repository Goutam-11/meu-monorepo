# Development and maintenance

[Documentation index](README.md) · [module change map](MODULES.md) · [containers](CONTAINERS.md)

## Setup

Each application has its own Bun package and lockfile; the root is not a package workspace. Install dependencies inside `meu_frontend`, `meu/schedulerService` and `meu/notificationService` with `bun install --frozen-lockfile`. Generate the frontend Prisma client with `bunx prisma generate` from `meu_frontend`.

Geist Latin font assets are bundled under `meu_frontend/src/app/fonts` with their Open Font License files. The app uses `next/font/local`; production builds do not fetch Google fonts.

Use the tracked environment examples and container guide for variable names. Frontend and scheduler must share the same 64-character hexadecimal `ENCRYPTION_KEY`. Changing that key without re-encrypting saved credentials makes them unreadable. Never paste keys, print complete environment/config output or commit `.env` files.

MongoDB must support the application's change streams/Prisma requirements. Redis queue storage is persistent in Compose. Services use production broker credentials only when the user has configured and activated live agents.

## Run and inspect

```sh
make check
make up
make ps
make logs SERVICE=worker TAIL=100
make logs SERVICE=notifications FOLLOW=0 SINCE=10m
make down
```

Podman is the Makefile default and includes `compose.podman.yaml`. Use `ENGINE=docker` for Docker. Do not omit the Podman override when invoking compose directly on this installation. `make dev` uses the development frontend override. Startup restores RUNNING agents; it is not a paper-only switch. Stopping processes does not close exchange positions.

## Verification gates

From the indicated directory:

| Directory | Command | Purpose |
|---|---|---|
| meu_frontend | `bun run test` | Isolated test-file processes, avoiding Bun mock leakage. |
| meu_frontend | `bunx tsc --noEmit` | Frontend and imported shared/service type boundary. |
| meu_frontend | `bunx eslint <changed-files>` | Focused lint; use actual paths. |
| meu_frontend | `bun run build --webpack` | Production server/browser bundle boundary, including cross-project imports. |
| meu/schedulerService | `bun run test` and `bun run typecheck` | Offline execution, sizing, ownership, cursor and recovery behavior. |
| meu/notificationService | `bun run test` and `bun run typecheck` | Consumer idempotency, push delivery and failure handling. |
| Root | `make check` and `make docs` | Compose validation and refreshed source/function reference. |

Tests use fake brokers and storage. Passing tests does not demonstrate profitability, provider permissions or private exchange integration. Do not run ad hoc live order scripts as a regression suite. Browser visual checks should be reported separately from source/build checks.

## Schema and deployment changes

- Mongo uses Prisma `db push`, not relational Prisma migration history. Inspect changes before applying them to the configured database; generating a client does not deploy schema/index changes.
- Native service collection indexes are separate contracts. Review startup/index creation and recovery readers when changing them.
- Required-field changes need explicit old-record handling, including existing null values. Deploy compatible readers before strict writes where necessary.
- Rebuild affected images when code or lockfiles change. A plain restart of an old image does not include code fixes. Recreate the service after its image changes.
- Allow workers to shut down gracefully. Before intervening in a stuck frontend shutdown, verify HTTP is closed and no account preflight/recovery/edit mutation is active. Never force-delete trading locks to speed a deployment.

## Documentation maintenance

`docs/README.md` is the entry point. Architecture and module pages describe current code; dated audit reports describe evidence and limitations at that date. Existing college synopsis/slides describe proposed development as well and are not runtime specifications.

Run `make docs` after source changes. The generator reads TypeScript syntax and local imports without loading application modules or secrets. It lists named functions/methods and direct calls; anonymous callbacks, computed imports and runtime queue/database relationships are not a complete static call graph. Keep curated diagrams alongside it.

When a feature changes, update its specialist guide, the in-app Help if users encounter it, module/data contracts if relevant, and focused tests. Avoid maintaining duplicate lists of function names manually when the generated reference already provides them.

## Known design work

See the current audit (local evidence, excluded from Git). Important remaining work includes crash-safe administrative/recovery lock fencing, credential/start serialization across requests, multi-replica push coordination and bounded history archival. These need explicit designs rather than automatic deletion of uncertain state.

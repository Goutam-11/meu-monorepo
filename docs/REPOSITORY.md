# Repository layout and publishing policy

Meu is maintained as one Git repository. Keep these paths together: existing imports and container build contexts depend on them.

| Path | Contents |
|---|---|
| `meu_frontend/` | Next.js UI, authenticated APIs, Prisma schema and frontend tests |
| `meu/schedulerService/` | Scheduler, execution workers, risk checks and service tests |
| `meu/notificationService/` | Notification persistence and Web Push consumer |
| `shared/trading/` | Strategy, sizing, historical backtest and paper execution modules used by the app |
| `docs/` | Maintained user, architecture, operations and developer documentation |
| `scripts/generate-code-map.mjs` | Static module/function documentation generator |
| Root Compose files and `Makefile` | Build, start, stop and inspect the application stack |

## Development and commits

Install dependencies in all three Bun projects using their committed lockfiles. Generate the frontend Prisma client with `bunx prisma generate` from `meu_frontend` after configuring its environment. Container builds do this automatically. There is no root dependency workspace or root install step.

Use the root repository for branches, commits and pushes. A feature spanning UI, shared trading code and worker execution belongs in one commit or pull request. Update its regression tests and maintained documentation together. Do not initialize independent nested repositories or commit component Git links.

## Included and excluded

The application backtester, paper execution engine and regression tests are product code and remain versioned. Standalone strategy experiments are excluded: `scripts/research`, comparison scripts, contract research outputs, `docs/reports` and dated audit/research notes. These remain on the original machine; a fresh clone does not contain their datasets or local experiment runner.

The original workspace may supply optional `Makefile.local` paper-experiment commands. The main Makefile includes this file only if present; ordinary application commands work without it. Research evidence referenced by guides is labelled as local when it is not published.

Credentials and populated environment files, generated Prisma clients, dependency/build caches, runtime state, design explorations, college documents and personal screenshots are excluded by `.gitignore`. Commit the `.env.example` templates, Prisma schema, runtime design assets and maintained design-system sources. Do not force-add excluded files.

`report/` is a separate deliverable: the LaTeX sources, assets and the built PDF live outside version control, and the Tectonic cache (`report/build/`) and downloaded binary (`report/bin/`) are never committed. The whole directory is ignored so a ~98 MB build tree cannot enter history by accident.

## Migration from the separate repositories

The new monorepo begins with a clean snapshot of the current application. The previous `Goutam-11/meu` and `Goutam-11/meu_frontend` repositories retain their existing remote histories; they are not deleted or overwritten. Their local Git metadata, bundles and tracked-change patches were backed up outside this repository under `~/.local/share/meu-git-backups/` before removing nested Git roots.

Old history is not imported into the published monorepo. This avoids carrying historical generated files, experiments or accidentally tracked credentials into the new repository. The backup README records original commit IDs and how to inspect the retained metadata. Local excluded files and the running services stay in their original paths.

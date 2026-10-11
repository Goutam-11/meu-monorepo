# Meu frontend

Next.js 16 / React 19 dashboard and authenticated tRPC API for Meu’s trading agents, exchanges, credentials, backtests and notifications. The scheduler and worker execute strategies; opening the frontend alone does not start those services.

**Creator:** Goutam Kumar Sharma

Start with the [documentation index](../docs/README.md), [architecture](../docs/ARCHITECTURE.md) and [monorepo README](../README.md). For operating the complete stack, use the [container guide](../docs/CONTAINERS.md).

## Current capabilities

| Area | Implemented behavior |
|---|---|
| Agent management | Create, pause/resume, inspect runs and edit agents. Configuration edits require PAUSED status and verified execution state. Different live tickers can share an account; overlapping live ownership of a ticker is blocked. |
| Delta India algorithms | Saved rule-based strategies with backtesting, PAPER simulation and LIVE execution. Strategy choices include EMA crossover, Donchian breakout and Bollinger + RSI mean reversion. Live entries use native Delta protective brackets and guarded sizing. |
| LLM trading | Crypto LLM runners and Zerodha LLM/Hybrid runners use saved provider credentials and server-enforced execution guards. Stock EMA algorithm/hybrid support is separate from the saved Delta backtest workflow. |
| Risk settings | Allocation, trade risk, daily loss, simultaneous positions and daily trade/entry limits. Saved Delta algorithms also expose leverage, margin allocation and strategy/simulation settings. Limits do not guarantee that any minimum contract fits the budget. |
| Model selection | Select a saved provider credential, then search its discovered model catalog or supply an appropriate model ID where supported. Catalog visibility does not establish inference or tool-use permission. |
| Credentials and connections | Optional descriptive names; encrypted secret writes; blank secret edits preserve existing encrypted values; secrets are redacted from API responses. Execution-affecting credential changes reject running consumers or retained locks. |
| Reconciliation | Delta account scans and verified recovery for eligible retained executions. Uncertain orders, partial fills and unowned exposure remain blocked until reconciled. Recovery is not an unconditional unlock. |
| Notifications | Owner-scoped inbox, unread badges, mark-read/delete/delete-all and browser Web Push. Mongo change streams emit subscription events for external service writes; frontend mutations also emit them. Polling and focus refetch provide fallback. |
| Market discovery | Searchable CCXT crypto market catalogs and a Zerodha instrument adapter help users select available tickers. |
| Themes and help | Sculpted light/dark themes, per-user appearance settings and in-app help explaining fields, strategies, backtests and recovery. |

See [crypto trading](../docs/CRYPTO_TRADING.md), [backtesting](../docs/BACKTESTING.md), [paper trading](../docs/PAPER_TRADING.md), [market discovery](../docs/MARKET_DISCOVERY.md) and [reconciliation](../docs/RECONCILIATION.md) for exact support and limitations.

### Providers and LLM memory

Saved providers include OpenAI, OpenRouter, Anthropic, NVIDIA NIM, OpenCode Zen and Amazon Bedrock. Bedrock supports a saved AWS region and API key with either **Runtime/Converse** or **Mantle’s OpenAI-compatible chat endpoint**. Endpoint/model compatibility, account permissions and tool support must be verified; see [Bedrock](../docs/BEDROCK.md) and [model discovery](../docs/MODEL_DISCOVERY.md).

LLM executions retrieve **up to five completed runs with a compatible configuration fingerprint**. The worker validates structured decision summaries and includes sanitized broker-operation receipts. Historical model text is untrusted and does not prove an order filled; current broker state takes priority. Missing/malformed summaries use a bounded, explicitly unverified fallback. Pure algorithms do not use LLM memory. Details: [LLM memory](../docs/LLM_MEMORY.md).

### Pause, edit and recovery

- Pausing stops future scheduled execution. An in-flight operation still needs to finish safely. Pausing does not close broker positions or cancel protective orders.
- Generic agent edits require PAUSED status, an exclusive agent edit lock and no unfinished execution records. Recorded crypto exposure blocks exchange/ticker/market-type changes.
- Saved Delta algorithm edits use the dedicated editor. Live execution-setting changes require the ticker’s exposure and pending orders to be reconciled; paper strategy changes can create a fresh portfolio revision while retaining previous history.
- Deliberate live algorithm resume refreshes indicator history and skips paused-period entry signals. Ordinary outages do not authorize replaying stale live signals.
- Open the Delta exchange’s **Recovery** page, scan the account and follow its specific blockers before verifying eligible locks. Refer to [Delta recovery](../docs/DELTA_RECOVERY.md).

Zerodha execution includes weekday/session checks and daily authentication handling. Do not assume an exchange holiday calendar is implemented; verify current market/session information. See the [module documentation](../docs/README.md) for token handling and trading constraints.

## Local development

Run these commands from `meu_frontend`. The monorepo’s shared source and sibling scheduler service are required; this directory is not an independently packaged deployment.

```sh
bun install --frozen-lockfile
bunx prisma generate
bun dev
```

The usual frontend URL is `http://localhost:3000`. Configure `meu_frontend/.env` using the repository examples and container/development guides:

- `DATABASE_URL`: MongoDB **replica-set** connection, matching the services.
- `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`: authentication secret and deployed URL.
- `ENCRYPTION_KEY`: the same 64-character hex key used by frontend and worker. Preserve the existing key for existing encrypted records.
- Public application URL and VAPID configuration as described in the container guide.
- Optional OAuth/provider endpoint configuration as required by the deployment.

AI provider keys are saved through the authenticated credentials UI. Do not assume that setting an `OPENAI_API_KEY` environment variable configures an agent’s saved credential.

Review schema/index changes before applying them. `prisma generate` updates generated clients; it does not backfill legacy Mongo documents. For older agents missing daily limits:

```sh
bun scripts/backfill-agent-daily-limits.ts
# After reviewing the counts:
bun scripts/backfill-agent-daily-limits.ts --apply
```

The backfill preserves configured limits and reports counts without printing secret values.

## Verification

```sh
bun run test
bunx tsc --noEmit
bun run lint
bun run build
```

The test script runs each `.test.ts` file separately to isolate module mocks. Tests use offline fixtures and fake storage/providers; they are not evidence that a live strategy is profitable or that an exchange/model account is accessible. Production stack commands and focused log commands are documented in [CONTAINERS.md](../docs/CONTAINERS.md) and [LOGGING.md](../docs/LOGGING.md).

## Source layout

```text
src/app/                       Next.js pages and route handlers
src/features/agents/           Configuration, status, run history and editors
src/features/backtests/        Strategy workspace, saved runs and paper portfolios
src/features/credentials/      Saved credentials and provider model discovery
src/features/exchange/         Connections, broker views and recovery workflow
src/features/markets/          Market catalogs and searchable ticker selection
src/features/notifications/    Inbox, subscription and read/delete controls
src/features/settings/         Persisted UI settings
src/lib/                       Auth, Prisma, encryption, logging and helpers
src/trpc/                      Authenticated tRPC setup and router aggregation
prisma/schema.prisma           Prisma-managed Mongo models
public/                        Static assets and browser notification resources
tests/                         Offline tests
```

Trading state also uses raw Mongo collections owned by the scheduler/worker; the Prisma schema alone is not the complete persistence inventory. Use the [architecture and module guides](../docs/README.md) and [generated code map](../docs/reference/CODE_MAP.md) to trace dependencies.

## Principal routes

- `/dashboard`: account overview.
- `/agents`, `/agents/[id]`, `/agents/[id]/edit`: agents and configuration.
- `/strategies`: strategy configuration, saved backtests and launch controls.
- `/exchanges`, `/exchanges/[id]`: saved connections and broker views.
- `/exchanges/[id]/reconciliation`: Delta recovery workflow.
- `/credentials`: saved AI providers.
- `/notifications`: notification inbox.
- `/help`: application help.
- `/settings`: appearance/preferences.
- `/login`, `/signup`: authentication.

Server APIs are primarily tRPC routers for agents, backtests, credentials, exchanges, notifications and settings. Route handlers also provide authentication callbacks, push subscriptions and bounded client-error reporting. Ownership is derived from the authenticated session, not user IDs supplied by the browser.

## Design and maintenance

`DESIGN.md` and `opendesign/design-systems/meu-product/` describe the product design system. `public/img/meu-symbol.png` is the transparent Meu symbol; `MeuMark` uses its alpha as a color-following CSS mask. Historical mockups and project report assets are not a specification of current runtime behavior.

Lists retain their surrounding controls during fetching and show skeletons in the results region. Error boundaries, owner-scoped queries and server validation remain required for new features.

Read the frontend audit (local evidence, excluded from Git) for fixed defects, verification and remaining concurrency/legacy-exposure limitations. Future market research, self-healing scraping and additional notification channels should be described as planned features until their execution paths and tests exist.

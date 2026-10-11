# Scheduler and trading workers

This package runs two independent Bun processes:

- `index.ts`: maintains the RUNNING agent registry and schedules BullMQ jobs.
- `src/workers/worker.ts`: validates scheduled jobs, evaluates agents and executes guarded broker operations.

MongoDB is the durable source for configuration, schedule pointers, execution audits and ownership. Redis holds the non-secret registry and queues. Saved broker/provider credentials are read from Mongo and decrypted at server-side boundaries; they are not stored in queue payloads.

## Start and inspect

For the complete application, use the **monorepo root** Compose/Make setup:

```bash
make up
make logs SERVICE="scheduler worker" TAIL=100
make logs SERVICE=worker SINCE=30m FOLLOW=0
```

This starts the frontend, scheduler, execution worker, notification consumer and Redis. See [container setup](../../docs/CONTAINERS.md) for Docker/Podman selection, environment files, shared encryption key, restart behavior and host networking. The old package-level Compose setup does not represent the current complete app.

For separate local processes:

```bash
bun install --frozen-lockfile
bun run index.ts
# Another terminal:
bun run src/workers/worker.ts
```

Copy `.env.example` to `.env`. Configure `MONGO_URI`, `DATABASE_NAME`, Redis and the same 64-character hexadecimal `ENCRYPTION_KEY` used by the frontend. Mongo must support change streams. Keep the existing encryption key when restarting against encrypted records. LLM and broker API credentials belong in saved app credentials/connections, not copied into this package's environment.

## Runtime dispatch

| Agent | Worker entry point | Current support |
| --- | --- | --- |
| Delta crypto algorithm, PAPER | `runPaperStrategy` | Public production candles, simulated USD portfolio, no private broker calls |
| Delta crypto algorithm, LIVE | `runLiveCryptoStrategy` | Saved EMA crossover, Donchian breakout or Bollinger + RSI strategy; closed-candle evaluation; guarded sizing and native Delta protection |
| Crypto LLM | `tradingAgent` | CCXT-backed agent with scoped tools; entries have adapter-specific requirements |
| Zerodha stocks LLM | `zerodhaTradingAgent` | Guarded Kite tools and owned credentials |
| Zerodha stocks algorithm | `runKiteEmaStrategy` | Long-only EMA crossover, restricted NSE MIS LIMIT entries and bounded reductions |
| Zerodha stocks hybrid | `getKiteEmaSignals` → `zerodhaTradingAgent` | Invoke the LLM only when the EMA evaluator produces an actionable signal |

Crypto HYBRID is not implemented. Unsupported adapter/strategy combinations are rejected. The shared deterministic crypto catalog lives in `../../shared/trading/strategies.ts`; backtesting and paper simulation use shared code, while broker fills remain authoritative in live execution.

Delta LLM entries require active USD linear perpetuals, isolated margin, native stop brackets and conservative risk accounting. Binance USD-M entry guards exist for USDT linear perpetuals, but attached bracket protection is not implemented. Delta algorithm Start/Resume preflight can verify and safely apply saved isolated leverage; this is not an unrestricted agent tool for changing account margin. See [crypto support](../../docs/CRYPTO_TRADING.md), [backtests](../../docs/BACKTESTING.md) and [paper mode](../../docs/PAPER_TRADING.md).

Scheduling cadence and candle timeframe are different fields. Crypto LLM input uses `1m`; deterministic Delta strategies use their saved timeframe. Repeated runs before a new completed candle wait instead of re-trading that candle.

## Scheduling, execution and recovery

The scheduler reconciles the complete RUNNING set every 60 seconds and uses Mongo `Agent.nextRunAt` as its durable pointer. Jobs carry `{ agentId, userId, runAt }` and use `agentId-timestamp` IDs. Workers reject obsolete schedules or wrong ownership. Schedule advancement is conditional on the previous pointer. Closed-market Zerodha runs defer to the next supported market open.

Live operations claim durable agent and connection locks; verified Delta accounts also claim a shared account lock across duplicate saved connections. Different tickers may be active agents, but account side effects are serialized. Each operation records an `OrderIntents` entry before requesting a broker write. Whole-run retries and automatic stalled replay are disabled.

Successful runs and verified typed failures before broker operations release their locks after durable audit persistence. Temporary known pre-order service failures retry with backoff. Busy accounts defer other agents. Uncertain broker results keep the owning execution's locks and pause it for reconciliation. Pausing does not cancel orders, close positions or delete an active lock.

Intentional live algorithm Resume refreshes bounded indicator history and skips paused-period signals. An ordinary process restart does not invent a new activation or silently replay missing live candles. Daily entry reservations and position ownership are preserved.

Delta reconciliation verifies exact broker/client IDs, symbol, direction, amount and complete fill quantities. Missing evidence blocks ownership changes, reductions and recovery. User recovery is in the frontend's exchange/agent Recovery controls and supports a verified flat account without pending orders. See [recovery runbook](../../docs/DELTA_RECOVERY.md), execution audit (local evidence, excluded from Git) and [local architecture](docs/ARCHITECTURE.md) for limitations, including crashed recovery coordinators and older intents without managed identities.

LLM context uses validated decision memory with timestamps and separate guarded operation receipts from up to five compatible successful runs. A successful operation receipt does not prove a fill. See [LLM memory](../../docs/LLM_MEMORY.md) and [provider support](../../docs/AI_PROVIDERS.md).

Background exchange synchronization remains disabled in `index.ts`; frontend account pages read brokers directly. [Zerodha setup](docs/zerodha.md) uses the authenticated frontend; the former public token callback is removed.

## Verification and maintenance

```bash
bun run typecheck
bun run test
```

The test script runs `tests/*.test.ts` separately to isolate global mocks. These are offline tests. Exploratory `src/tests/` scripts may call real providers and are excluded from automatic test runs.

The package pins `fast-copy@4.1.0` through an override for the advisory documented in the execution audit. Keep `bun.lock` synchronized and use frozen installs in images.

Review the [documentation index](../../docs/README.md), [application architecture](../../docs/ARCHITECTURE.md), [module map](../../docs/MODULES.md), [data model](../../docs/DATA_MODEL.md) and [logging guide](../../docs/LOGGING.md) before changing execution boundaries.

# Delta account reconciliation

Open **Exchanges → Account recovery**, the agent recovery action, or **Dashboard → Inspect account reconciliation**. Use the numbered **Pause live agents**, **Scan Delta account**, then **Verify and recover locks** actions. Multiple saved connections to that account share this report's scope. Paper agents can remain active because they do not submit broker orders.

## Implemented diagnostic

The authenticated scan compares broker positions and paginated pending orders with active Meu ownership records and managed orders. It fetches each referenced order by broker ID, or by its original client ID when an uncertain submission has no saved broker ID. Returned evidence includes verified identities, filled/remaining quantities, saved submission states, position ownership, execution locks and pending order intents.

Findings include unknown submissions, found-but-unrecorded orders, incomplete ownership history, changed position quantities, unowned positions/entries, pending protection on flat tickers and ownership reservations that have not been closed. Broker errors are sanitized. A lookup failure is not proof that an order was never submitted.

The scan itself is read-only apart from account identity/link registration. The separate **Verify and recover locks** command rechecks broker and queue evidence, reconciles supported terminal flat executions and releases only owned claims. Neither action submits/cancels orders, adopts manual positions or resumes agents.

## Limits and interpretation

- All linked live agents must be paused. The scan checks again after broker reads and flags changed locks or live activation.
- Broker and database snapshots are not atomic. External/manual trades can occur during a scan. The timestamp is the report completion time; a report cannot prove queue liveness or guarantee safe activation.
- Reads require complete Mongo cursor batches. Missing/truncated batches fail the report, instead of producing an apparently clean account.
- Scans support at most 100 linked connections, 100 agents/active ownership records, 500 managed orders, and 128 order references per owner. Broker order inspection has a bounded time budget. Oversized history needs a separate, paginated recovery workflow.
- One scan per physical account and four concurrent account scans per frontend process are allowed. There is no automatic polling or retry loop.
- Retained locks do not expire automatically. An active job can also hold a lock; recorded execution state does not prove that the worker is still running.
- A clean report does not check all account risk limits, funds, leverage or native protection. Activation and execution continue to perform their own checks.

## Paper regression coverage

`meu/schedulerService/tests/paper-multi-agent.test.ts` advances BTC and XRP paper agents concurrently using public market fixtures. It checks independent simulated capital, positions, contract sizes and daily counters, and that rerunning the same completed candle does not apply it twice. Private order submission and live daily-entry reservation are prohibited in this fixture.

These are offline integration checks, not long-running paper results, exchange-fill validation or evidence of profitability. Paper portfolios remain independently simulated; live agents share the actual account balance and account limits.

Run the scheduler suite with `bun run test` from `meu/schedulerService`. It launches each test file in a separate process because Bun module mocks otherwise leak into unrelated broker/calendar tests.

## Recovery preconditions and remaining work

The recovery command requires every linked live agent paused, no active BullMQ worker claim, no open positions or pending orders, complete managed-order identity evidence and terminal quantities. Filled plus remaining must equal the saved requested amount; missing fields or a mismatched side are insufficient. Pending intents need exact broker/client-ID attribution. A second fresh scan and version checks precede release. Partial persistence can be retried through the supported completed-recovery path; counters and history remain intact.

Open/partial exposure, unverified submissions, legacy reductions without exact client IDs, foreign unfinished executions and crashed administrative/recovery coordinator locks can still block recovery. Do not delete these locks or give them an automatic TTL: safe crash recovery needs liveness/fencing evidence. Same-ticker strategy netting, Binance ownership, paginated archival and streaming reconciliation remain separate work. See [recovery internals](DELTA_RECOVERY.md) and the audit (local evidence, excluded from Git).

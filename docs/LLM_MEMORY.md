# LLM run memory

Crypto LLM and Zerodha LLM/Hybrid executions retrieve up to five completed runs
for the same agent and configuration, newest first. Pure algorithms do not load
or generate decision memory. Hybrid cycles without a signal can record a bounded
no-signal message without invoking a model.

## Stored records

The existing MongoDB `AgentRuns` collection retains `llmResponse` and `createdAt`.
New records additionally store `executionId`, `memoryContext` and `memory`.
These additive worker fields do not require a Prisma migration.

The system prompt requests one `<MEU_MEMORY>` JSON block containing action,
symbols, a short decision explanation, observable confirmation/invalidation
conditions and a next review or square-off plan. Zod validates types, lengths
and the allowed actions. The worker parses this block at the end of the full
response rather than truncating its beginning. No extra LLM summarisation call
or embedding service is used.

Malformed or missing summaries do not fail or replay completed execution. They
produce an explicitly unverified excerpt of at most 1,200 characters, preferring
the final legacy `RUN_SUMMARY` section. The full response remains available in run
history. Historical text is treated as untrusted data, not a new instruction.

## Broker evidence

### Saved execution configuration in the prompt

Both crypto and Zerodha LLM prompts receive the worker's validated trading policy
on every run through `formatTradingPolicy`. It includes allowed tickers, allocated
capital/currency, sizing mode, per-entry loss or notional budget, daily loss limit,
simultaneous-position limit and daily entry/new-position limits. Configured sizing
adds margin, exposure, leverage method/ceiling, sizing objective and cost buffers.
Currency amounts accompany percentage budgets; they are saved ceilings, not
remaining account headroom. Broker reads and server sizing enforce shared-account
limits, existing commitments, losses and available funds.

In supported native-stop AUTO mode, the prompt explicitly distinguishes the
current broker leverage from the user's ceiling. A current 1× setting is not a
fixed restriction. The model may prepare leverage using guarded `setLeverage`
for a valid entry, then recalculate size. Leverage reduces collateral for the same
notional; it does not reduce notional-based fees or expand risk/exposure budgets.
These instructions do not guarantee correct model reasoning or require a trade.

The worker records sanitized labels for guarded operations separately from model
claims: confirmed, refused or unresolved, plus action and symbol. It keeps up to
12 operation labels per memory and counts every guarded operation in that run.
No credentials, raw broker response or raw error is copied into the memory.
`CONFIRMED` only means an operation returned successfully; it does not mean an
entry filled. Requests rejected before the guarded execution callback are not
part of these receipt counts. Current positions, orders and fills always take
priority over historical decisions. Failed or uncertain runs keep the existing
pause/reconciliation behavior; they are not selected as completed memories.

## Configuration isolation

A SHA-256 context fingerprint covers exchange connection and venue, sandbox,
strategy, asset class, execution mode, symbols, cadence, capital, risk settings,
strategy parameters, model, credential identity and temperature. Object key and
ticker ordering do not affect it. Status, name and timestamps are excluded.
Edits to covered settings isolate old memories; switching back to an identical
configuration makes compatible completed memories available again. There is no
time-based expiry yet, so timestamps must be interpreted against fresh broker
data. Old records without a fingerprint are excluded rather than guessed to be
compatible. An empty memory prompt explicitly says to inspect existing account
positions and orders; it does not imply the account is flat.

## Verification

`tests/run-memory.test.ts` covers long outputs, validation/fallback, sanitized
receipts and context isolation. `tests/worker-execution.test.ts` checks the latest
five compatible records, agent isolation and persistence alongside execution
receipts without placing live orders. Provider compliance with the requested JSON
format is not guaranteed, so fallback handling remains necessary.

## Missing final summaries

The tool-loop SDK can complete without readable final text, including when its
default 20-step limit ends the loop. Worker completion alone does not establish
that a model produced a trading decision. Blank responses now save an explicit
missing-summary message, a COMPLETED execution outcome `LLM_OUTPUT_MISSING`, and
a warning containing the run/model and recorded broker-operation count. Original
model text remains the input to decision-memory validation; the system fallback
is not turned into a model-authored decision. No automatic inference/order replay
is attempted. Historical blank runs show a missing-output explanation in the UI.

LLM completion logs record finish reason, readable character count, tool-call
counts and whether the default step bound was reached, without logging prompts
or tool arguments/results. These distinguish missing final text from a frontend
rendering issue. A step-bound flag alone does not prove a specific provider failure.


## Analysis data and run timing (10 October 2026)

Crypto LLM context uses an explicit optional `strategyConfig.analysisTimeframe`: 1m, 5m, 15m, 1h or 4h. New forms default to 15m; older agents without the field retain 1m. Cadence remains a separate scheduling interval. Editing an old agent does not silently change its timeframe.

The market-data adapter targets 250 completed bars, accepts at least 100 consecutive valid bars with a shorter-warmup disclosure, and bounds pagination to four pages of at most 200 bars with a 15-second timeout per page. It excludes the currently forming candle, validates numeric OHLC/time ordering, alignment, gaps and freshness against a fixed analysis timestamp. Primary data failure prevents model analysis and uses the existing pre-broker transient retry path. Missing optional 4h/daily context is explicitly labelled rather than fabricated.

Market context is structured JSON: each candle carries its timestamp and causally aligned indicator values. RSI is 50 for a flat series. Warmup and unavailable optional context are disclosed. Agent review context includes run start and scheduled time, current analysis time, cadence, last successful review, persisted run count and completion-based scheduling policy. `nextScheduledReviewAt` is null during execution because completion/retry determines the next schedule; it does not invent a guaranteed next review time. Earlier decision memories remain subordinate to fresh broker observations.

Delta's passive post-only and Binance's IOC execution policies are described separately in the prompt. The prompt also explains saved target-size versus legacy first-tradable automatic leverage. These changes improve data correctness and clarity; they do not add continuous monitoring, a profitable strategy guarantee or AI-cost accounting.

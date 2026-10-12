# Delta live algorithm recovery

## Deliberate Pause and Resume

Resume creates a new activation timestamp. On the first live algorithm run after
that activation, the worker loads bounded, contiguous completed candles to warm
up indicators and advances its cursor without executing paused-period signals.
It preserves risk counters and tracked positions. Before advancing, it verifies
position ownership and reconciles its tracked entry; a stale, wholly unfilled
entry is cancelled and its cancellation confirmed. Partial fills, foreign
positions and uncertain orders still require review.

The activation timestamp is saved with strategy state, so later runs continue
normally. Restarting a worker does not create a new activation and cannot hide
an unexpected candle gap. Older states without this marker qualify only when
the activation occurred after the saved candle's close.

An older worker may already have paused a resumed agent with
`DELTA_DATA_INVALID` while fetching the old interval. Resume can recover that
case only when the saved cursor proves a new activation, the failure happened
before any broker operation, fresh history validates, and all the flat-account
and lock checks below pass. Other invalid-data failures remain review cases.

## Missed closed candles

A live algorithm does not replay a backlog of closed candles. When more than one
candle needs processing, the worker records `MISSED_LIVE_CANDLES` and pauses the
agent. Typed candle-validation and missed-candle failures before any broker
operation automatically release their execution locks after the failure audit
is confirmed (`STRATEGY_DATA_REJECTED`). Other agents can continue. Resume
refreshes this agent's history using the activation path above.

Failures after a broker operation, unknown failures and unconfirmed audit writes
retain their agent, connection and broker-account execution locks. Older worker
versions also retained locks for pre-order missed-candle failures; the verified
recovery below handles those retained failures.
Paper algorithms can replay their simulated history and do not use this path.

Use **Resume** on the paused live algorithm to attempt recovery. Pause other live agents that are not explicitly waiting behind this failed
execution. Verified waiters on the same retained lock can remain active. Recovery
is part of the authenticated, owner-scoped Start preflight; it is not a timer or
an automatic activation on container restart.

Recovery requires:

- A finished `REVIEW_REQUIRED` execution belonging to this agent, with the typed
  missed-candle reason. Older executions require the exact missed-candle
  notification for the same user, agent, exchange and execution time window.
- All three execution locks still belonging to that run, with no other operation
  using the account. Active, abandoned Start and uncertain-order locks are not
  eligible.
- No order intent at all in that failed run, even a confirmed or refused one.
- No other unfinished execution, active position ownership or submitting managed
  order on the linked account.
- A flat broker account with no open orders, verified through Delta reads.
- A valid saved strategy cursor, no tracked entry, unchanged agent version and
  unchanged contract terms.

The recovery loads fresh, contiguous, completed candles for indicator warmup,
records the old and new cursors, skipped count, data hash and verifying user,
and advances the cursor with a compare-and-set write. It does **not** evaluate
or submit missed entry signals, reset risk counters, cancel orders, change broker
settings or adopt manual positions.

The failed execution is retained with `originalState: REVIEW_REQUIRED` and
`recovery.outcome: SKIPPED_STALE_SIGNALS`; its state becomes `COMPLETED` only
after the cursor write is confirmed. Only that execution's locks are released.
The connection lock is released last so an interrupted release can be retried
through Resume. Partial cursor/audit persistence can be retried without losing
the original skipped range. A concurrent recovery is blocked by a durable
`recovery:<agentId>` lock, also shown in the account reconciliation scan.

After recovery, normal Start verifies the configured isolated margin and
leverage and activates the agent. Its old scheduling pointer is cleared so the
scheduler creates a fresh run. Entries are still subject to the activation-time,
completed-candle and normal account/risk guards.

## Cases that stay paused

Use **Exchanges → account reconciliation → Verify and recover safe locks** to
run the same owner-scoped recovery checks without activating an agent. Resume
also attempts eligible recovery automatically. Neither action blindly deletes
locks. Older `EXECUTION_GUARD_REJECTED` failures qualify only with a recorded
`OrderRejectedError` at `execute_strategy`, `brokerOperationRequested: false`,
zero order intents and the flat-account checks above. New pre-order guard
rejections release their locks after confirmed failure persistence.

When the sizing preview rejects an entry because of a verified risk constraint,
the algorithm records the specific reason in its run output, skips that signal
and remains active. It does not increase leverage or allocation to bypass the
guard. Unavailable exchange snapshots still pause with an actionable reason.

Open positions/orders, stored entry identity, uncertain submissions, unknown
failure reasons, contract changes and concurrent account operations are not
automatically repaired. Use the account reconciliation scan and inspect Delta
history/protection. Do not delete execution locks or resend uncertain orders.
If the recovery process itself dies while holding its durable recovery lock,
that lock requires review; it is deliberately not expired by a timer.

Recovery cannot prevent external manual trading during broker snapshots or
make missed trading opportunities recoverable. Keep manual orders off the
account while recovering. This feature does not establish strategy profitability.

## Temporary paper market-data failures

The public data loader retries timeout, connection/download, HTTP 429 and server
errors up to three times per request, with 500 ms / 1 s backoff. Requests retain
an 8-second timeout, a 60-second total load budget and response-size limits.
Long Retry-After values defer to the next run rather than sleeping a worker;
worker scheduling honors them up to 24 hours. Invalid JSON, oversized bodies,
invalid candles, contract changes and non-transient HTTP errors are not retried.

When a paper algorithm exhausts temporary data retries before saving simulation
state, it stays RUNNING and its failed attempt is audited as COMPLETED with
outcome DATA_UNAVAILABLE. The portfolio, candle cursor and last successful run
are unchanged. Its agent lock is released. Subsequent runs use exponential
backoff from one minute to thirty minutes, or the configured cadence/Retry-After
if longer. A successful run resets the failure count. Warnings are sent on the
first failure and every fifth consecutive failure to limit notification noise.

Resume also handles older paused paper agents with a verified pre-save data
failure, preserving their simulated portfolio and original activation time.
It releases only their agent lock after verifying the matching failure and zero
broker intents. Existing unrelated or uncertain failures remain blocked.

Temporary data failures in live Delta algorithms also reschedule when they
occur before any order request or state persistence. LLM network, rate-limit
and server failures reschedule only before any broker operation request. A
failure after an order request retains review and never replays that order.
Missed live signals are not silently replayed.

Every temporary LLM-provider failure emits a warning containing the provider,
model and next retry time, including failures after a configuration change.
Market-data warnings retain the first-failure/every-fifth-failure cadence.
Frontend instrumentation watches Mongo notifications and emits SSE updates;
the Notifications list also refreshes once a minute and on window focus as fallback.

LLM generation has an explicit 120-second request deadline. A native
`TimeoutError` is recorded as `LLM_REQUEST_TIMEOUT`, including provider, model
and the deadline. Before any broker operation, this completes the failed
attempt as `PROVIDER_UNAVAILABLE`, releases its own execution locks and
reschedules with backoff. A timeout after an order request still retains
review; the order is never replayed automatically.

An explicit LLM HTTP 400/401/403/404/422 rejection before broker operations
pauses only that agent for configuration correction. Once its failure audit
is saved, its locks are released so other agents can continue. Bedrock's
approved `Operation not allowed` reason is recorded as
`LLM_OPERATION_NOT_ALLOWED`. This response does not identify the exact AWS
account, key, model or region restriction; verify inference in the Bedrock
console. A timeout alone is not evidence of denied model access.

## Failure records and notifications

AgentExecutions.failure, structured worker logs and notification metadata use
the same safe classification: code, error type, stage, run ID, scheduled/failure
timestamps, mode, strategy, symbols, cadence, candle timeframe and next action.
Public-data failures add endpoint, attempt count, timeout and HTTP status when
available. Deferred paper runs add retry time and consecutive-failure count.
Lock conflicts identify the scope and holding execution/state. Rejections before
an execution claim are retained as audit-only COMPLETED records with outcome
BLOCKED_BEFORE_EXECUTION; they are not completed strategy runs or broker claims.
If audit persistence fails, a safe log event and notification flag report that.

Raw SDK messages, stacks, causes, headers, signed URLs, prompts and credentials
are not copied into failure records. Application-owned validation/guard messages
remain informative. Notification details render stored JSON as labeled fields
and timestamps in the browser's local timezone. Existing historical records are
not retroactively assigned error details that the old code did not capture.

## Waiting behind an account execution

An agent encountering an active account operation briefly defers its run. An
agent encountering a retained, abandoned or unresolved lock remains RUNNING
and schedules checks with backoff from 30 seconds to 5 minutes. It releases
only partial locks acquired by its own attempt and never takes over the holding
execution. Its attempt is audited as WAITING_ON_LOCK, with the scope, holding
execution ID/state and next retry time. Warnings appear on the first wait and
every fifth consecutive wait. The waiting metadata is cleared on a successful
run. An unresolved owner still needs reconciliation; rescheduling a waiter does
not prove the owner is safe. Verified agents waiting on that exact lock do not
prevent its flat-account missed-candle recovery.

Temporary network/rate-limit/server failures while discovering markets or
identifying an account also reschedule before an execution claim, with an
audit outcome SERVICE_UNAVAILABLE_BEFORE_CLAIM. No broker operation is retried.

## Scheduling edits and deletion

Changing an agent’s polling interval clears its old scheduling pointer. The scheduler queues a new run using the saved interval; superseded jobs cannot execute. Resuming an agent also clears the old pointer. Unrelated edits preserve the pending run.

Pause an agent before deleting it. Deletion is refused while any of its execution locks remain, so a deleted agent cannot silently leave an account blocked. Recover or reconcile retained locks first.

Browser push delivery uses the web-push SDK for encryption/signing and native fetch for transport, with an abortable 12-second deadline per attempt and at most three attempts. A failed push does not invalidate the saved in-app notification or occupy its worker indefinitely. Provider acceptance is logged separately from notification persistence; it does not prove the browser displayed a popup.

## Notification deletion and retention

The Notifications page offers a confirmed **Delete all** action. It removes
read and unread notifications for the authenticated user across every page and
search, resets pagination, and refreshes the unread badge. It does not delete
execution records, trading history or another user's alerts. Concurrent new
alerts may still arrive after deletion.

The notification collection has no automatic TTL policy. Keep expiry disabled
while older recovery paths depend on notification evidence for legacy failures.
Deleting that evidence does not unlock an execution; a legacy failure may then
need manual review. After recovery evidence is fully stored in execution
records, consider expiring read notifications 90 days after `readAt`, while
retaining unread alerts until the user reviews them.

## Broker reconciliation for retained LLM and algorithm executions

A visible **Recovery** button on Delta exchange cards and live crypto agent cards
opens `/exchanges/<connection-id>/reconciliation`. Agent details also provide an
**Account recovery** button. The page presents three actions in order:

1. **Pause live agents** pauses live agents on every saved connection linked to
   this broker account. It does not cancel orders or stop an in-flight broker
   request. Paper agents continue independently.
2. **Scan Delta account** reads current positions, pending orders, managed
   submissions and execution locks. It shows broker/client IDs and next steps.
3. **Verify and recover locks** performs new broker reads; it does not trust the
   previous screen snapshot. The execution must have finished, the queue job and
   its heartbeat must be inactive, linked live agents must be paused, and all
   three execution scopes must still belong to the same failed run.

For an uncertain submission, recovery looks up its exact saved client or broker
ID. It validates symbol, quantity, fills and terminal broker state. Delta must
be flat with no pending orders. A cancelled partial fill can be reconciled only
after the residual position is closed and pending protection removed on Delta.
Unknown orders remain blocked: absence from the open-order list does not prove
that an order was refused. Operations without a verifiable managed identity,
foreign unresolved submissions and missing ownership history also stay blocked.

After confirmation, recovery records its broker evidence and user in the failed
execution audit, repairs found submissions to ACCEPTED with terminal fill state,
marks resolved PENDING intents RECONCILED, closes verified flat ownership periods
and, for algorithms, refreshes candle history without replaying entry signals.
It preserves existing closed periods and risk counters. The execution becomes
COMPLETED with `recovery.outcome: BROKER_RECONCILED_FLAT`, then only its own agent,
account and connection locks are released, connection last. Interrupted write or
lock-release steps can be retried; the original intent evidence is retained.

Recovery never sends exchange orders, cancels orders, closes positions, changes
margin/leverage, adopts exposure or resumes an agent. Resume agents individually
once recovery succeeds. Snapshots cannot prevent external manual trading during
verification; keep manual trading off the account during the recovery itself.

## Audit follow-up: strict evidence and interrupted coordinators

Order lookup must provide the exact saved side and requested amount, with filled
plus remaining equal to that amount. A missing field or incomplete quantity is
UNKNOWN evidence, not confirmation that no order exists. This applies to both
normal ownership verification and explicit recovery.

An interrupted frontend recovery can retain its unique `recovery:<agentId>`
coordinator; an interrupted edit can retain an `AGENT_EDIT` claim. These are not
currently released automatically. Safe takeover needs verified liveness and
fencing on writes. Do not use a TTL or delete a lock merely because it is old.
See the current audit (local evidence, excluded from Git) for the remaining design work.

## Daily-counter failure before submission

Daily entry reservations initialize their Mongo record using only its unique ID, then increment counters with a conditional atomic update. MongoDB rejects `$expr` in an upsert predicate (error 224); initialization and reservation must remain separate. A database error during reservation is an explicit pre-submission refusal: no broker call has been made. Counters are never reset or refunded on an ambiguous database acknowledgement.

Older workers could leave a PENDING OrderIntent without a ManagedCryptoOrders record when the reservation query failed. Missing managed identity or an empty broker account alone does **not** justify releasing that lock. Administrator review must verify the worker's pre-submission error and deployed code path, preserve evidence when classifying the intent as refused, then use ordinary broker reconciliation. Do not delete locks or replay the original order. The agent stays paused after recovery.

Screen blanking alone does not stop server processes. Laptop suspension, loss of network or a stopped container can interrupt local execution. Inspect the actual worker/database/broker error rather than assuming the display caused it. For unattended trading, the host must stay awake and connected.

# Application logging

Meu writes structured application events to stdout. Scheduler/worker events use Pino; frontend server events use the frontend application logger. These logs complement durable execution/order records in MongoDB.

## Scheduler and worker

- `LOG_LEVEL` controls Pino verbosity (default `info`).
- Production uses JSON lines. Local development can use `PRETTY_LOGS=true`; `PRETTY_LOGS=false` keeps JSON locally too.
- Each job carries `runId` and `agentId` across asynchronous agent/tool operations. Concurrent jobs have separate contexts.
- Events cover queue scheduling, starts, skips, durable claims, lock acquisition/release/retention, strategy outcomes, review-required failures and worker/database lifecycle.
- Broker operation events carry an `intentId` linking to `OrderIntents`: `order.started`, `order.confirmed`, `order.refused`, `order.uncertain`.
- All crypto and Kite LLM tools record start, completion, unsuccessful return or thrown failure, and elapsed milliseconds.
- LLM generation records provider/model, duration, step count and input/output/total tokens, when reported by the provider. Preparation failures appear in run logs; no LLM invocation is implied until `llm.started`.
- `run.review_required` includes a fixed execution stage for locating the failure without dumping SDK errors.

## Notification service

The scheduler assigns a UUID `deliveryId` when emitting a notification and logs `notification.queued`. If emission occurs inside a trading run, its `runId` travels with the queue payload. The consumer binds those IDs plus the queue `jobId` to persistence and push events. Legacy queued jobs without a UUID retain the existing stable `timestamp-jobId` fallback; legacy direct-to-DB transport logs its own persistence/skips.

- `notification.started`, `notification.persisted`, `notification.processed` and `notification.failed` show processing and persistence, with timing and insertion-versus-existing-record metadata.
- `notification.invalid` reports only the validation issue count, never the rejected payload or validator messages.
- `push.started`, `push.retry`, `push.delivered`, `push.failed`, `push.expired` and `push.invalid` identify subscription attempts, retries, final failures, expired-subscription cleanup and invalid stored subscriptions.
- `push.skipped` distinguishes missing VAPID configuration from an account with no subscriptions. `push.summary` counts provider acceptances, failures, removed expired subscriptions and invalid subscriptions; invalid subscriptions are included in failures.
- `push.delivered` means the push provider accepted the request. It does not confirm device receipt or that the user read the alert. `notification.processed` can occur when optional push delivery fails, since the in-app notification was persisted successfully.
- Push uses at most five simultaneous subscription requests per job, a 12-second hard deadline per attempt and three attempts for transient failures. Permanent failures are not retried. Persistence failures still reach the queue's failure/retry handling.
- Logs use fixed events, bounded IDs, numeric counts/timing and safe error class/status/code only. Notification titles, messages, arbitrary codes/metadata, recipient user IDs, endpoint URLs, subscription keys, VAPID keys and raw SDK errors are excluded, including child bindings.
- Redis/worker readiness, failures/stalls, startup and shutdown are logged. The notification image and Compose explicitly use production JSON; the same bounded container rotation applies.

Validation uses fake queues, databases and push providers. Notification-service tests cover safe serialized output, mixed subscription outcomes, validation/legacy jobs, persistence failures and disabled push. Scheduler tests verify delivery/run ID propagation across the producer and consumer and safe emission failure handling.

## Frontend

- Server logs are JSON lines with timestamp, severity, service, a fixed event, allowlisted operation/code, request ID, and elapsed milliseconds where available.
- tRPC middleware covers registered queries and mutations, including RSC/server callers. HTTP requests receive a server-generated UUID in the `x-request-id` response header; this ID is shared with procedure and exchange-snapshot diagnostics.
- Push subscription/unsubscription REST success and unexpected failure events record fixed operation, status and timing metadata.
- Failures in crypto/Kite dashboard reads are recorded even when the UI receives a partial snapshot instead of a thrown exception.
- Browser query/mutation failures, local render boundaries, settings sync/hydration failures and notification/push failures report fixed source/event codes. Expected logged-out settings errors are skipped.
- `/api/client-errors` requires an authenticated session, same-origin JSON and a body of at most 512 bytes, including streamed bodies. Inherited object keys and unknown event/source pairs are rejected. Extra user-supplied text is never logged.
- Browser events are deduplicated per source/event for 60 seconds. Server acceptance is capped at ten reports per user per minute with a bounded 1,000-user in-memory tracker. This limiter is per server process, not a distributed security limit.
- Diagnostic delivery is best effort. Failure to report an error does not interrupt the UI or recursively generate another report. Server rendering never attempts a browser report.
- Authentication remains managed by Better Auth; its SDK/framework logging is separate from the application events described here.

## Confidentiality

Use static event/message strings and small explicit metadata objects. Never pass complete agent/exchange/credential records, prompts, tool arguments/results, account snapshots, request headers, URLs, or provider responses to a logger.

Scheduler metadata recursively redacts sensitive field names, including child logger bindings. Error metadata retains an allowlisted error class and numeric code only. Raw error messages, stacks and causes are omitted because broker/SDK errors can include authentication material anywhere in their text. This deliberately limits free-text debugging; use run/intent IDs, event names, stage, timing and the application’s authorized execution-review workflow instead.

Token usage counts are numeric telemetry, not authentication tokens. Regression tests verify that these remain available while credential tokens disappear.

## Docker retention

The scheduler image sets `NODE_ENV=production` and `PRETTY_LOGS=false`; Compose explicitly sets both for scheduler and workers. All Compose services use the `json-file` log driver with `max-size: 10m` and `max-file: 3` (approximately 30 MB per container, with Docker rotation overhead).

Configuration takes effect after rebuilding/recreating containers. A remote log
collector, alerting service and durable security audit archive are not configured.
Local `next dev` terminal output is not automatically rotated by Compose.

### Filter logs by service

```sh
make logs SERVICE=worker TAIL=200 SINCE=30m
make logs SERVICE="scheduler worker" FOLLOW=0 TAIL=100
make logs SERVICE=notifications SINCE=1h FOLLOW=0
```

The default is to follow logs. `FOLLOW=0` reads the existing tail and exits.
Use IDs returned by the app to correlate a specific run across worker and
notification events. Read the durable run failure details before deciding to
resume. Recovery uses authorized broker reconciliation; never delete execution
locks directly in Mongo or Redis based only on a log message.

## Verification

Scheduler regression tests cover actual serialized output with synthetic credentials, nested/child redaction, token counts, concurrent run isolation, unchanged tool results/errors and worker lifecycle/order/lock events. Existing execution/risk tests use fake brokers; verification sends no real orders and does not resume paused agents.

Historical test counts are recorded in dated audit/fix reports; they are not the
current suite inventory. Run service tests and type checks for the files changed.
The operations audit on 2026-10-08 verified notification tests with fake database
and push providers, including bounded subscription concurrency and serialized
secret omission. See operations audit (local evidence, excluded from Git).

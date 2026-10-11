# Architecture

Reviewed against source on 8 October 2026. [Documentation index](README.md) · [module map](MODULES.md) · [persistence](DATA_MODEL.md).

## Process boundaries

```mermaid
flowchart LR
    Browser[Browser: dashboard and Help] --> Frontend[Next.js: Better Auth and tRPC]
    Frontend --> Mongo[(MongoDB)]
    Frontend --> Broker[Delta / Binance / Kite APIs]
    Frontend --> Catalog[Provider model catalogs]
    Mongo -->|Agent changes| Scheduler[Scheduler process]
    Scheduler --> Registry[(Redis agent registry)]
    Scheduler --> Queue[BullMQ agent-execution]
    Queue --> Worker[Execution worker]
    Registry --> Worker
    Worker --> Mongo
    Worker --> Broker
    Worker --> Provider[LLM provider inference]
    Worker --> NQueue[BullMQ notification queue]
    NQueue --> Notify[Notification consumer]
    Notify --> Mongo
    Notify --> Push[Web Push provider]
    Mongo -->|Notification change stream and queries| Frontend
    Frontend -->|SSE invalidation and query polling| Browser
```

The frontend is also a server: account preflight, broker reads, historical data loading and recovery run there. `shared/trading` is imported source, not a separate service. The two service processes under schedulerService use the same code/dependencies but run independently. Exchange background synchronization modules are not started by `index.ts`; account dashboards query their providers directly.

Mongo is the durable source of truth for status, schedules, executions, ownership and configuration. Redis holds a non-secret registry and BullMQ jobs. The registry is refreshed from Mongo; it is not the authority for broker positions or user ownership. Credentials are fetched and decrypted server-side, not cached in the agent registry.

## One scheduled execution

```mermaid
sequenceDiagram
    participant UI as Browser / tRPC
    participant DB as MongoDB
    participant S as Scheduler
    participant Q as BullMQ
    participant W as Worker
    participant B as Broker
    UI->>DB: Save owner-scoped agent, initially paused
    UI->>DB: Start / Resume (Delta algorithm preflight when applicable)
    S->>DB: Reconcile RUNNING agents and nextRunAt
    S->>Q: Schedule agentId-runAt job
    Q->>W: Deliver job
    W->>DB: Validate current status, version, schedule and resource ownership
    W->>DB: Claim agent / connection / account scopes
    W->>DB: Record STARTED execution
    W->>B: Read authoritative market/account state
    W->>W: Evaluate algorithm or invoke guarded LLM tools
    opt Broker operation requested
        W->>DB: Persist PENDING intent and managed submission
        W->>B: Submit guarded order / cancel / reduction
        W->>DB: Record confirmed, refused or unresolved outcome
    end
    W->>DB: Persist AgentRuns and execution outcome
    W->>DB: Advance schedule with compare-and-set
    W->>Q: Queue next delayed run
    W->>DB: Release owned scopes if outcome is verified safe
```

The worker rejects stale status/schedule versions before executing. `nextRunAt` stays on the pending/active run until a worker or reconciliation step advances it. Job IDs and durable execution IDs prevent replay from being treated as a new order. A broker acknowledgment is not a fill; fills/positions are verified separately.

## Execution dispatch

```mermaid
flowchart TD
    Entry[createRunProcessor / processRun] --> Mode{Strategy and market}
    Mode -->|Delta ALGO PAPER| Paper[runPaperStrategy]
    Mode -->|Delta ALGO LIVE| Live[runLiveCryptoStrategy]
    Mode -->|Crypto LLM| LLM[tradingAgent]
    Mode -->|Stocks LLM| KiteLLM[zerodhaTradingAgent]
    Mode -->|Stocks ALGO| KiteAlgo[runKiteEmaStrategy]
    Mode -->|Stocks HYBRID| Signals[getKiteEmaSignals]
    Signals --> Signal{Actionable EMA signal?}
    Signal -->|No| Hold[Save no-signal result]
    Signal -->|Yes| KiteLLM
    Paper --> Shared[shared/trading strategy and simulation]
    Live --> Shared
    Live --> Tools[getCryptoTools + ExecutionSafety]
    LLM --> Tools
    KiteLLM --> StockTools[getZerodhaTools + ExecutionSafety]
    KiteAlgo --> StockTools
    Tools --> Guards[Risk snapshot, sizing, daily reservations and ownership]
    StockTools --> Guards
```

Crypto HYBRID is rejected rather than silently routed to an LLM. The frontend/server configuration gates decide which paths are offered. The shared Delta simulation does not establish identical live fill behavior; Kite EMA uses its own broker execution adapter.

## Delta ownership and safety boundaries

```mermaid
flowchart TD
    Agent[Agent: symbols, allocation, risk] --> Policy[TradingPolicy / ExecutionSafety]
    Delta[Delta profile identity] --> Account[BrokerAccounts and BrokerAccountLinks]
    Account --> Lock[Account execution lock]
    Policy --> Snapshot[cryptoEntrySnapshot]
    Snapshot --> Scope[createCryptoAccountContext.scopeSnapshot]
    Scope --> Evidence[Managed orders, fills and ownership periods]
    Scope --> Sizing[sizeCryptoEntry]
    Sizing --> Reserve[reserveDailyEntry]
    Reserve --> Submit[Record submission before broker call]
    Submit --> Broker[Delta order API]
    Broker --> Ack[Verify native bracket acknowledgment and save acceptance]
    Ack --> Verify[Subsequent authoritative identity, fills and position verification]
    Verify --> Ownership[Confirm authoritative ownership or retain review evidence]
```

Delta accounts are identified by verified profile identity, not by the label assigned to a saved key. Duplicate saved connections share an account lock and account-wide risk caps. Different tickers can run concurrently as agents; account operations execute serially. A single live owner controls a product/ticker. Manual exposure is not adopted automatically.

## Pause, failure and recovery

```mermaid
stateDiagram-v2
    [*] --> PAUSED: create agent
    PAUSED --> RUNNING: start or resume
    RUNNING --> PAUSED: user pauses
    RUNNING --> Waiting: account lock busy
    Waiting --> RUNNING: scheduled retry
    RUNNING --> Deferred: temporary pre-order service failure
    Deferred --> RUNNING: backoff retry
    RUNNING --> PAUSED: configuration or history rejection
    RUNNING --> Review: uncertain broker operation / ownership failure
    Review --> PAUSED: failure audit and retained locks
    PAUSED --> Recovering: explicit verified recovery
    Recovering --> PAUSED: repaired audit and released scopes
```

`Waiting`, `Deferred`, `Review` and `Recovering` are explanatory execution conditions, not extra values of `Agent.status`; persisted agent status is RUNNING or PAUSED. Pausing prevents future authorized operations; it does not immediately cancel an already active request, close a position or delete locks.

An intentional live algorithm Resume stamps a new activation and warms indicators from fresh completed candles without executing paused-period signals. A process restart does not invent an activation. Temporary known pre-order failures retry/release safely. Typed history/guard rejections before operations release scopes after their audit is confirmed; uncertain outcomes retain them.

Recovery performs fresh broker reads, checks paused peers and queue inactivity, validates exact managed identities/terminal states and requires a flat account without pending orders. It records repairs and releases only the failed execution's scopes, connection last. See [the recovery runbook](DELTA_RECOVERY.md) for supported cases, interrupted steps and the remaining crashed-coordinator limitation.

## Notification delivery

Events are emitted through `lib/notifications.ts`; the consumer persists notifications idempotently by delivery job ID before attempting Web Push. The Node.js frontend instrumentation watches Mongo Notification changes and emits SSE invalidations, including separate-consumer inserts. Frontend mutations also emit local invalidations; 60-second query polling and focus refetch cover missed stream events. Provider acceptance of a push is not proof a user saw a popup. Notifications and execution audits serve different retention/recovery purposes; see [logging](LOGGING.md) and [data model](DATA_MODEL.md).

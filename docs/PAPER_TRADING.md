# Delta India paper and live algorithms

## From a saved run to an agent

In Strategies, choose an owned saved backtest and create a Delta India algorithm agent in **Paper** or **Live** mode. The saved snapshot supplies the strategy parameters, timeframe, simulation settings and contract terms. Those settings are stored as an agent snapshot; supported paused edits can create a new state revision. Ticker, connection and execution mode remain fixed. Creation leaves the agent **PAUSED**. Review it in Agent details and start it when ready.

Starting a crypto algorithm records an activation time. Signals from earlier candles cannot trigger new entries after activation. On its first paper run, the agent initializes simulated cash and indicator history and waits for a fresh closed candle. On its first live run, it checks that the symbol has no existing position or pending orders, initializes its cursor and waits for a subsequent fresh candle.

## Paper mode

Paper mode uses public Delta India candle data and simulated USD funds. It does not use exchange credentials, call private broker endpoints or place real orders. The portfolio displays simulated cash/equity, fees, funding, completed trades, current simulated position and last processed candle. It refreshes every 30 seconds.

The simulator uses the saved fee, slippage, funding, leverage and risk assumptions. Stops, targets, funding and liquidation are candle-based approximations; they do not reproduce exchange fills or mark-price liquidation. Forward daily counters reset at India midnight. Indicator history is capped at 10,000 candles and the portfolio retains the latest 200 trade records while cumulative totals continue. Review/reset is required when the history cap is reached. There is no in-place reset control yet; creating a new paper agent starts a new simulated portfolio.

Pausing paper execution stops scheduled advancement. On resume, missed candles can be replayed to apply protective exits to an existing simulated position; replay suppresses entries, so old signals do not open positions. Candle gaps or changed contract terms require review.

Direct creation is also available in New Agent: select Crypto and Rule Based Algorithm, configure the shared market/capital/risk sections and crypto settings, then create a paused paper or live agent. A saved backtest is optional. Both paths use the same versioned strategy settings and execution guards.

## Live mode

Live mode can place real Delta India orders after the agent is started. It requires saved Delta credentials and production market data, isolated leverage equal to the saved strategy leverage, and a flat symbol with no pending orders on its first start. The automatic Start preflight applies saved isolated settings when safe. Different tickers may run together; other live agents only need to be paused for an account-wide margin-mode change. Account-wide margin-mode changes require no account positions or orders; leverage changes require no target-ticker exposure. Unknown settings and failed verification prevent activation. Subsequent entries verify settings without changing them.

Live sizing combines the same guarded preview/submission calculator with separate loss-at-stop, margin and leveraged-exposure caps. Risk includes the rounded native stop distance and buffered entry/exit costs. Total account margin is capped by allocation times the saved margin percentage; account notional is capped by allocation times saved leverage. Available settlement balance and remaining daily-loss budget further restrict quantity. Existing positions and pending entries reserve collateral and costs; unrelated positions do not receive credit for assumed protective stops. Entries stay below the current Delta base-margin scaling threshold, and missing margin metadata refuses entry. Entries carry native Delta stop and target brackets. This differs from the simulator: exchange brackets govern live protection, while paper/backtest stops are evaluated against candle data. Sizes, order fills and realized outcomes can therefore differ.

Before managing a position, the live strategy verifies that its stored entry belongs to this agent and that the exchange position side and size match its filled entry. Foreign pending entries, unowned/changed positions, partial fills, ambiguous broker results, missing candle intervals, stale candle backlogs, changed contract terms and failed state writes require reconciliation. Intentional live resume warms current history under a new activation boundary without replaying stale entries. Missing candles during an unchanged activation still require review. A running live agent on the same exchange and canonical symbol blocks another live owner.

Pausing stops future agent runs. It does not close an open live position or cancel pending exchange orders. Native protective brackets remain active at the exchange. Review the account and resolve pending state before resuming if the agent has paused for reconciliation.

## Ownership and saved state

Backtests and paper portfolio reads are owner-scoped. Forward paper state is stored in the raw MongoDB `PaperTradingState` collection; live cursor state is stored in `CryptoStrategyState`. Both use the string agent ID as `_id` and include the owner ID. Paper history is omitted from the portfolio API response; the UI receives a history count and derived equity instead.

`Agent.executionMode` and `Agent.strategyStartedAt` are nullable to support pre-existing agents. Saved crypto strategies use the dedicated paused algorithm editor described below.

A stop is not a guaranteed loss ceiling: gaps, mark-price differences, slippage, funding and exchange failures can produce larger losses. The liquidation-distance rejection is a conservative estimate inside the base margin tier, not an exchange-exact liquidation calculator. Existing LLM and Binance configurations keep their prior full-notional accounting. INR deposits must be converted to USD API wallet units when setting a Delta allocation; this change does not alter stored balances or allocations.

## Operational boundaries

These agents currently require Delta India production market data. Sandbox exchange configuration is rejected for saved strategies. Live first-run checks and reconciliation protect a single-symbol strategy; they do not certify that a strategy is profitable or guarantee exchange execution. Historical research, paper fills and live fills have different assumptions and must be interpreted separately.

Behavior and copy were checked against source. Browser surfaces were unavailable, so browser interaction and visual rendering were not verified. No account access, service deployment, database migration or live order was used for this sizing change.

## Verification record

October 7, 2026: all 69 scheduler tests passed, along with frontend and scheduler TypeScript checks and changed-file ESLint. Offline regression coverage includes guarded native-bracket entries, partial-fill and position-ownership refusal, replay protection, reduce-only exits, paper funding and affordability, pause/resume signal suppression, and sizing-price consistency when the next broker quote changes. Frontend protected-router tests cover paused creation and owner boundaries. These checks use fake brokers, persistence and market data; live exchange integration and browser interaction are not verified by them.

## Editing and retained portfolios

Saved Delta algorithm agents now support the pencil Edit action. Pause before saving. Name and polling interval edits preserve the existing portfolio. Changes to strategy parameters, timeframe, capital, risk limits, direction or cost assumptions require the explicit fresh-paper-portfolio acknowledgement. Saving creates a server-generated state revision in `strategyConfig.stateId`; the next run uses that revision's portfolio and starts with the revised initial capital. Earlier state documents remain intact. The paper panel provides a selector for the latest 20 retained portfolios; earlier portfolios are read-only.

The worker and frontend use the same scoped state-key function. Legacy configurations still read their original agent-ID state. A revision cannot read another agent's state. Simulated open positions, cash, daily counters and pending signals are not transferred between revisions. New initialization warms up without opening a trade. Name/cadence changes do not manufacture a restart.

Ticker, connection and Paper/Live mode are immutable within this editor. Existing backtest results remain unchanged; execution edits remove the configuration's backtest reference. Rerun a backtest for revised parameters. No Prisma schema migration is required.

## Sizing and automatic leverage

See [sizing policies](SIZING_POLICIES.md) for shared risk/margin/exposure calculations, fixed versus automatic algorithm leverage, 100% margin, gross-notional percentages and compatibility with saved configurations. Paper/backtest AUTO uses minimum viable leverage within the ceiling; live execution additionally verifies flat-ticker broker settings and durable setting intents.

## Optional execution rules v1

Explicit `strategy.executionRules.version = 1` persists confirmed proposals, consumed IDs, side-specific mean exits, recorded protection levels and gross daily loss. Pending proposals retain their original exclusive expiry; restart does not extend it. Enhanced and legacy Delta daily accounting reset at India midnight for parity with new Delta backtests and live guards. Existing state receives an explicit timezone marker; consumed allowance is preserved, and an incompletely known migration day can temporarily block entries until the next India midnight. Protective exits continue. See migration and replay evidence (local evidence, excluded from Git). Intentional resume suppresses entries whose setup began before activation. Policy edits follow the existing state-revision flow. These version fields are retained for saved-run compatibility and offline research; ordinary forms use original rules. See [rules and replay evidence](BACKTESTING.md#experimental-execution-rules-v1).

## Adaptive exit internals

See [exit management](EXIT_MANAGEMENT.md) for the shared opt-in ATR trailing engine, paper restart validation, recorded chart protection changes and comparison results. Fixed protection remains the default; live adaptive amendments are not enabled.

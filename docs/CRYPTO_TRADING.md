# Crypto execution: Delta India and Binance

For the account scan and verified recovery path, see [Delta reconciliation](RECONCILIATION.md).

The LLM crypto agent can open long or short **linear perpetual** positions on Delta Exchange India and Binance USD-M. Delta and legacy Binance entries can add to a position; protected Binance entries require a flat ticker. Entries run through durable order intents, account execution locks, deterministic sizing and the same daily entry reservations used by the stock path.

## Delta Exchange India setup

1. Create an exchange connection named `DELTA` using an India API key. The scheduler and dashboard pin production to `https://api.india.delta.exchange`. Sandbox connections use the India demo host `https://cdn-ind.testnet.deltaex.org`; demo keys must belong to that environment.
2. Configure the agent as `CRYPTO` and `LLM_TRADING`. Use product IDs such as `BTCUSD`, `ETHUSD`, or their loaded CCXT symbols such as `BTC/USD:USD`.
3. Enter allocated capital in **USD API wallet units**. The live India product metadata currently quotes and settles BTC perpetuals in USD. An INR deposit amount must not be copied into the USD allocation field without conversion; this code does not perform currency conversion.
4. Use isolated margin. Disable **default automatic margin top-up**, automatic top-up on existing positions and DETO-denominated fees. These settings are verified from the broker before any new entry; Legacy LLM entries do not change settings. An explicitly configured native-stop Delta LLM uses verified Start preparation; algorithms and explicitly configured native-stop LLM agents support automatic ticker leverage within a saved ceiling. See [sizing policies](SIZING_POLICIES.md).
5. Set the entry notional percentage, daily-loss percentage, simultaneous position limit and daily entry/opening limits. The configured notional budget must support at least one exchange contract, including the fee buffer.

Delta uses whole contracts. Contract size comes from live market metadata; For example, a 0.001 BTC contract value would make each contract represent that quantity; always use the fetched product metadata. Entry notional is `contracts × contractSize × limitPrice`, not the numeric contract count itself.

Every Delta entry includes a native mark-price stop-loss bracket in the same request. `stop_loss: 0.01` means 1% away from the entry price; `take_profit: 0.02` means 2%. Long and short levels are calculated in opposite directions and rounded to the exchange price tick. The broker acknowledgment must confirm the stop price. Missing confirmation after acceptance leaves the order unresolved and pauses the worker for reconciliation.

## Binance setup

Use `BINANCE`, `CRYPTO`, `LLM_TRADING`, a unified linear perpetual symbol such as `BTC/USDT:USDT`, and allocation currency **USDT**. The adapter explicitly routes balances and orders to linear futures instead of the spot wallet. One-way, single-asset mode and isolated margin are required; current position automatic margin addition must be off.

Protected native-stop policies use CCXT precision, including fractional quantities where permitted, and price-bounded IOC entries followed by verified conditional stop/target orders. Legacy full-notional policies retain whole-quantity post-only entries and refuse bracket requests. Leverage does not increase a legacy notional budget. Production account identity is verified using Binance account-info UID; the API key needs read access to that endpoint. See the protected execution section below for the non-atomic protection lifecycle.

## Legacy full-notional sizing and loss accounting

The maximum entry cost is the smallest of:

- allocation multiplied by the configured entry percentage;
- allocated capital remaining after verified agent-owned position and pending-entry exposure on Delta; shared account caps still include all exposure;
- available settlement-currency balance;
- daily-loss allowance remaining after negative income and existing exposure.

Sizing reserves the entire entry notional plus a buffer for entry/exit fees, rounds amounts down to exchange precision, and checks minimum/maximum order limits. An explicit amount above the computed bound is refused. An omitted amount uses the bound. `calculatePositionSize` previews the current size without sending an order or consuming a counter.

Account checks include all positions and pending entries, including those outside the agent's symbol list. Unknown markets, mismatched settlement currencies, cross/portfolio margin, hedge positions, missing balances and unbounded pending entries block new exposure. Isolated collateral larger than position notional is included in exposure. Opposite-side entries are refused; exits must use `closePosition`.

Delta wallet transactions are fetched using microsecond start/end timestamps and all cursor pages. Binance income history is fetched by page until complete. Negative PnL, commissions, funding and other non-transfer debits count against the budget. Winning trades and deposits do not offset these losses. Existing exposure is also reserved against the daily allowance; this is deliberately conservative and is not stop-distance sizing.

Delta's accounting day begins at midnight Asia/Kolkata. Binance's begins at midnight UTC. These boundaries match the durable `AgentDailyRiskUsage` reservation keys. Entry attempts reserve the trade counter; flat-to-open entries reserve the position-opening counter. Reductions and cancellations do not consume entry counts. Submitted attempts retain reservations after broker refusals or ambiguous responses.

## Order lifecycle

Delta and legacy Binance entries are post-only limit orders, not promises of immediate fills. Protected Binance entries use IOC limits and verified terminal fills before submitting protection. Orders have agent-specific client IDs. `fetchOrders` lists that agent's pending orders; `cancelOrder` verifies ownership and scope. Delta signed short quantities are normalized before position management, so closing a short sends a reduce-only buy.

Known pre-order failures and explicit broker `InvalidOrder`/`InsufficientFunds` responses are recorded as `REFUSED`. Network failures after order submission, missing order IDs and missing Delta stop confirmation remain unresolved; the existing worker pauses the agent and retains its execution/account locks. Reconcile `OrderIntents` and the broker before resuming. Duplicate Delta connections share verified physical-account locks; external/manual account changes are not serialized by Meu.

This enables LLM code execution for the two named adapters. Spot markets, inverse/quanto contracts, options, other crypto entry adapters and HYBRID crypto execution remain unsupported. Delta algorithms created directly or from backtests use the separate deterministic execution and sizing path described below and in `PAPER_TRADING.md`. Native stop triggers and limit orders do not guarantee fill prices. Automated verification uses offline account/broker fixtures; authenticated demo-order acceptance still needs verification with the configured account.

## API references

- [Delta India API documentation](https://docs.delta.exchange/): India production/demo endpoints, wallet transactions, position fields, trading preferences and entry brackets.
- [Delta India's live BTC product metadata](https://api.india.delta.exchange/v2/products/BTCUSD): settlement currency, contract value and tick size.
- [Binance USD-M account endpoints](https://developers.binance.com/en/docs/catalog/core-trading-derivatives-trading-usd-s-m-futures/api/rest-api/account): income history and account modes.
- [CCXT manual](https://docs.ccxt.com/docs/manual): contract size, unified symbols and amount/price precision.

## Saved Delta algorithm futures sizing

Directly configured agents and agents created from a saved backtest use an explicit futures policy derived from their leverage, margin percentage, cost assumptions and contract metadata. Risk per trade means estimated loss at the rounded native stop plus buffered costs. Margin usage and leveraged notional are separately capped. The preview and final entry recalculate using fresh account snapshots and use the same rounded stop/entry prices. Existing LLM agents retain the full-notional sizing described above. Explicit native-stop Delta and Binance LLM policies use the same guarded calculator with their broker protection adapters. Zerodha retains full-notional sizing with broker margin previews; native-stop risk credit remains unfinished.

The live account must use the exact saved isolated leverage. When the user clicks Start Agent, the algorithm preflight prepares and verifies these settings before activation. Different-ticker agents may run on this exchange together, including mixed LLM/algorithm runners. Same-ticker live ownership remains exclusive. Only account-wide margin-mode changes require other live agents to be paused. An account-wide switch to isolated requires no positions or orders anywhere; a leverage change requires no exposure on the target ticker. Its first start requires a flat ticker even when settings already match. Unknown settings and failed readbacks keep the agent paused. An ambiguous update retains the account execution lock for reconciliation. Every entry rechecks settings without changing them. Leverage is a saved whole number from 1× to 20×. Algorithms can treat it as an automatic ceiling and choose the lowest viable leverage on a flat ticker; fixed mode preserves the saved target. Quantity is calculated from risk, margin and separately configured gross notional constraints. Agent budgets use verified owned positions and pending entries. Separate shared-account budgets include all positions and pending entries; existing collateral is conservatively reserved against daily loss. New entries remain within Delta's base margin tier (`max_leverage_notional`), with current initial/maintenance metadata required. Stops too near the estimated liquidation boundary are refused. Higher margin tiers are not supported by this sizing path. Stops cannot guarantee the loss cap during gaps or exchange failures.

Account execution is serialized with connection and underlying Delta account locks. Duplicate saved connections share the underlying account lock. Workers defer a run by 15 seconds when another worker has a verifiably active BullMQ job and lock, or a recent Start preflight is preparing settings. This does not release or take over a lock. Retained review locks, abandoned setup locks and unverified queue ownership still block execution and require reconciliation. Different-ticker agents share actual account balances and exposure; separate allocations do not ring-fence funds.

Delta live ownership and risk scopes: per-agent simultaneous positions, margin, exposure and daily debits use verified ownership. Shared account limits independently count every position and pending entry, including manual trades. Broker identity is derived from the authenticated profile and separated by India/demo environment; it is not the saved connection ID. Account defaults are 3 open tickers, 50% equity margin, 1% daily loss and 3× equity gross notional. These are configurable initial guards, not trading recommendations. Account limits must be edited with every linked live agent paused and under the account execution lock. The daily equity baseline is the first authoritative settlement equity observed by Meu that India calendar day; the daily cap uses the lower of baseline/current equity.

Managed orders are reserved before submission and associated with an ownership period for the Delta product ID. Each run verifies saved broker order IDs, client IDs, fills and net position quantity. Unknown submissions, manual quantity changes and orphan protection on a flat ticker block reuse; no ambiguous claim expires automatically. A native full close can reconcile ownership to flat only when no entry or protection remains pending. Manual positions are not adopted. Negative wallet events are attributed only when product and timestamp match one ownership period; otherwise they consume every agent’s budget conservatively. All debits and all collateral/pending margin reserves still consume the account loss cap. A tight shared loss cap can therefore prevent additional entries despite independent agent position limits.

Dashboard exposes last-verified ownership, recent managed orders and shared limits. This is not a live broker feed or complete per-strategy PnL. Verified terminal-flat Delta and production Binance recovery is available through Exchanges → Account recovery. Open or unresolved submissions remain blocked. Same-ticker strategy netting and WebSocket reconciliation remain future work. Existing legacy positions are not imported automatically. Pausing agents does not close positions or cancel broker orders.

## Editing live Delta algorithms

Use Edit settings while the agent is paused. The editor supports algorithm, indicator periods, timeframe, ATR brackets, direction, allocation, leverage, margin, cost assumptions and daily risk limits. Ticker, connection and execution mode remain fixed; create another agent to change them.

Execution edits acquire agent, connection and physical-account locks, verify no position or pending order on the ticker, and reject active ownership, uncertain submissions or unfinished execution records. Public contract terms/history are freshly validated. Saving uses an optimistic configuration-version check and leaves the agent paused. It does not place/cancel orders, change leverage or margin mode, reconcile ownership, release another operation's lock, or clear live daily counters.

A server-generated state revision starts a fresh indicator cursor after an execution edit. The previous cursor remains stored. The saved-backtest association is removed; its historical result remains unchanged. Start subsequently verifies and prepares the revised isolated leverage. Name and polling changes preserve state and the backtest association, and require only the agent edit lock. Paper revisions and retained portfolio inspection are described in [paper trading](PAPER_TRADING.md).


### Binance protected LLM execution

Production Binance USD-M LLM agents may now opt into the same native-stop sizing policy. USDT allocation, verified Binance UID, isolated ticker margin, one-way/single-asset mode, authenticated leverage tiers and tracked account ownership are required. Start and `setLeverage` prepare and verify settings within the saved ceiling. Entry uses IOC limits and verified terminal fills before journalled conditional mark-price stop/target orders. This is not an atomic bracket: protection failures attempt bounded reduce-only emergency closure and retain recovery evidence. Algorithm/backtest runners remain Delta-specific. See [sizing policies](SIZING_POLICIES.md#binance-usd-m-and-broker-capabilities) for lifecycle and limitations.

# Meu user guide

[Documentation index](README.md) · [in-app Help](../meu_frontend/src/features/help) · [configuration details](BACKTESTING.md)

## Supported trading paths

| Market | LLM | Rule based | Hybrid | Research / paper |
|---|---|---|---|---|
| Delta India USD-settled linear perpetuals | Supported guarded tools | EMA crossover, Donchian breakout, Bollinger + RSI | Not implemented | Shared strategy backtests and forward paper portfolios |
| Binance USD-M USDT futures | Supported guarded tools | No equivalent supported saved-strategy path | Not implemented | No equivalent integrated Delta simulator path |
| Zerodha/Kite stocks | Supported guarded tools | EMA path | EMA signal triggers LLM path | Delta backtest results do not validate stock execution |

Availability in a form is subject to supported market metadata, credentials and server validation. The three Delta algorithms are implemented; profitable performance is not established by their presence.

The Agents list uses compact full-width rows: identity/status/tickers, allocated capital, model, cycle, last run and actions. Rows stack vertically, wrap on narrow screens, and use matching list skeletons during page fetches.

## Create and configure

1. Add a named exchange connection and choose its type/environment. Search the fetched market catalog instead of guessing tickers. Multiple connections to the same Delta account share account risk/ownership.
2. For LLM agents, add a named AI credential, choose provider then model, and search the model catalog. A listed model may still lack inference permission. Bedrock region and Converse/Mantle endpoint must match the accessible model.
3. Follow the form sections: Agent setup → Market and schedule → Agent intelligence or Algorithm settings → Capital and risk → Review configuration. Selecting the exchange fills its account currency (Delta USD, Binance USDT, Zerodha INR); no currency conversion takes place. Use the money preview to check allocation, stop/notional budget, daily loss, margin and exposure before saving. Rule-based Delta agents additionally select algorithm, timeframe, direction, ATR protection, leverage, margin and execution mode.
4. New agents start paused. Inspect configuration, backtest when appropriate, then choose paper or activate live execution deliberately.

### Simplified form controls

Capital comes before sizing. **Full order value** bounds the whole entry; **Loss at native stop** exposes margin, exposure and fixed/automatic leverage for supported perpetual adapters. Existing full-notional agents preserve their saved policy until customized. Algorithms use the same capital/risk controls and exposure unit (× allocation).

Expand **Position and daily entry limits** to change simultaneous positions, entry orders or newly opened positions. Fee/slippage buffers and AI temperature appear in separate expandable settings. All remain editable. Invalid submissions show named errors and expand advanced controls so errors are visible. Names/tickers are trimmed, duplicate tickers are rejected, percentage inputs accept 100 where the schema allows it, and counts/leverage remain whole numbers. Native-stop agents require one ticker; remove extra selections or switch sizing before saving. Shortening an algorithm candle timeframe adjusts an incompatible polling interval to five minutes.

Editing requires a paused agent. The form disables controls for a running agent; the server independently enforces the pause and execution-lock checks. Saving does not start trading or change broker settings.

### Field meanings

| Field | Interpretation |
|---|---|
| Allocated capital | Agent sizing budget, not a transfer into a separate exchange wallet. Delta strategy/API units are USD; INR deposits must be interpreted using the exchange wallet/API units. |
| Polling cadence | How often execution is scheduled. For deterministic Delta algorithms it can be shorter than candle timeframe without producing extra signals on the same completed candle. LLM agents can reevaluate data on each run. |
| Candle timeframe | Indicator/signal interval. An incomplete latest candle is excluded; the most recent completed candle is used. |
| Maximum trades per day / positions opened per day | Durable entry/opening limits; uncertain attempts can reserve capacity. They differ from simultaneous position limits. |
| Maximum open positions | Concurrent exposure limit. Account caps may be stricter than an individual agent budget. |
| Daily loss limit | Guard budget; not a promise that realized losses cannot exceed it during gaps or broker failures. |
| ATR | Average True Range, a volatility measure used to place configured stop/target distances. Larger multiples place wider brackets and usually reduce risk-sized quantity. |
| Slippage / fees / funding | Cost assumptions used in simulation and/or sizing buffers. Historical simulation does not reproduce actual spread, latency or historical funding. |
| Leverage / margin budget | Desired isolated leverage and collateral limits. Higher leverage does not enlarge the configured stop-loss risk budget. Minimum contract size can still make an entry unaffordable. |

Delta algorithms and explicitly configured native-stop Delta/Binance LLM agents use loss-at-stop, buffered margin and separate exposure sizing. Existing LLM agents retain full-notional limits until edited. Zerodha uses full-notional sizing with broker margin previews. Binance protection is conditional after an IOC fill, with a network interval before stop acknowledgement; see the broker lifecycle in the sizing guide. Algorithms support fixed leverage or automatic minimum viable leverage within a saved ceiling. Every agent card offers Edit. See [sizing policies and 100% limits](SIZING_POLICIES.md).

## Charts and market research

Open **Charts → Meu charts** for Yahoo stock/index research candles, Delta India USD perpetuals and Binance USD-M USDT perpetuals. Search symbols, open an owned agent’s market, choose 5m/15m/1h/1d candles, toggle EMA 20/50 and Bollinger Bands, and inspect volume/RSI. Agent details also provides **View chart**. Up to 750 candles are displayed; refresh is 60 seconds for Yahoo and 30 seconds for crypto while active. Fetch time, last candle start and available Yahoo quote time are shown in IST. Older candles may indicate a closed market or delayed data. No chart action changes agent settings or submits orders.

Yahoo access is unofficial and may be delayed, rate limited or unavailable. No paid Zerodha data subscription is required for this research path. Crypto uses the chosen exchange’s public production candles; USD, INR and USDT are not converted. The optional **TradingView** tab retains drawing/indicator tools and a global overview. It cannot embed NSE history; paid TradingView plans do not upgrade widget entitlements. Live position/trade overlays are not implemented. See [implementation and limitations](CHARTS.md).

## Backtest and paper workflow

Strategies runs public Delta historical data without exchange keys. Select a strategy and period, review assumptions, costs, drawdown and trade count, then save/export or compare runs. You can create a paused agent from a saved run or configure an algorithm directly from New Agent.

Use separate research and validation periods; the application does not enforce this split or certify results. Paper mode advances simulated funds using fresh public candles. It places no private exchange orders. Its fills, funding and liquidation are approximations. See [backtesting](BACKTESTING.md) and [paper trading](PAPER_TRADING.md).

## Live operation and multiple agents

For Delta live algorithm agents, Start preflight verifies account settings and automatically applies saved isolated margin/leverage only when safe. Native-stop Delta/Binance LLM agents also prepare verified isolated ticker settings. Legacy full-notional policies do not use that preparation path. Account-wide changes require a flat account; ticker leverage changes require a flat ticker. Different tickers can run on one account, sharing balance/risk caps and brief account serialization. Two live agents do not independently own the same physical Delta ticker position: LLM and algorithm agents can conflict too.

Agent details show the persisted next scheduled time in your local timezone and refresh every 15 seconds while running. Paused agents show Paused; a newly activated agent can briefly show Awaiting scheduler. During a pending or active run, the timestamp remains that run’s schedule until completion or deferral advances it. It is not proof that the worker has started.

A Hold output means the completed candle produced no new action, or the same candle was already processed. Inspect the run details and sizing-skip reason before assuming a trade was missed.

LLM context includes configuration, timing/run information and bounded compatible recent structured run memory. It is not unlimited chat memory, and successful model text is not proof of a broker order. Read tool receipts and execution evidence.

## Pause, edit and recovery

Pause stops future scheduling; it does not close exchange positions or cancel native protective orders. Generic edits require a paused agent and no unfinished/locked execution. Changes to tracked crypto routing are blocked when ownership remains non-flat or submission is uncertain.

The Delta algorithm editor keeps ticker, connection and paper/live mode fixed. Name/cadence edits preserve the portfolio. Execution-configuration changes can require a new paper state revision or verified flat live state. Old simulated portfolios remain available.

For a retained live Delta lock, open **Exchanges → Account recovery**, or the agent's recovery action:

1. **Pause live agents** linked to the physical account.
2. **Scan Delta account** and inspect positions, pending orders, ownership and execution evidence.
3. **Verify and recover locks** when all required broker results are known, terminal and the account is flat.

Recovery writes an audit trail and releases only verified claims. It does not send/cancel orders, resume agents or erase risk counters. An uncertain order means an API result did not establish whether it was accepted or filled; inspect the exchange as well. Active jobs, open/partial exposure, incomplete lookup evidence and some legacy orders prevent automatic recovery. See [reconciliation](RECONCILIATION.md).

## Notifications and support evidence

The Notifications page is the durable inbox. Browser/system popups also require browser permission, saved subscription and working delivery. Read/delete operations are owner-scoped, including Delete all; no automatic notification TTL is configured.

When reporting a failure, provide the run ID, stage, error code, sanitized summary and next action. Do not share API keys. Failures before broker submission differ from uncertain submitted orders, and the recovery decision depends on that evidence.

## Choose simpler algorithm entries

For a new Delta crypto algorithm, choose capital, risk at the stop and **When to enter**. The default waits for one follow-through candle, expires an unconfirmed setup after three candles, and rests two candles after an exit. Select **Wait for a retest** for a pullback-and-reclaim entry, or immediate signal handling to remove the extra confirmation. Advanced settings retain indicator, bracket, leverage, collateral, cost and daily-limit controls. Existing agents keep their saved choices; pause and edit them to opt into the new timing policy.

In Strategies, basic setup derives the daily-loss ceiling as three times risk. Open Advanced and explicitly choose manual daily loss to use a custom ceiling; opening or closing the section does not change the value. Quantity, stop distance and leverage remain calculated within your selected budgets and automatic sizing objective. A small allocation can still fail an exchange minimum; increasing leverage does not create a profitable signal.

The saved result now includes a price chart with numbered BUY/SELL and EXIT markers. Click a marker or choose a trade to inspect the setup, entry, exit reason and net outcome after costs. Hover candles to see rule decisions, including waiting for confirmation. Indicator explanations are reconstructed; markers and outcomes come from saved simulated fills. Old backtests remain viewable, but must be rerun on strategy version 1.1.0 before launching a new agent from them. See [strategy details](BACKTESTING.md#entry-timing-and-simpler-setup-strategy-engine-110).


## Preview sizing before activation

Pause a supported live crypto agent and open its details → **Fresh entry sizing preview**. It calculates a hypothetical entry using fresh broker reads, saved limits, your direction and stop distance. It shows contracts, notional, estimated loss at stop, margin, assumed leverage and the binding constraint. It does not place orders or change settings. If today's equity baseline is missing, the result is labelled provisional.

In Create/Edit, automatic leverage has an **Automatic sizing objective**. New configurations use **Fund the permitted position size**; **Use the first tradable leverage** preserves the older approach. Saved agents without this choice remain on the older approach until you change it. Both obey the saved loss, margin, exposure, contract and account ceilings. Funding a larger quantity increases possible losses as well as gains.

Crypto LLM forms also separate **Analysis candle timeframe** from review cadence. New agents use 15m analysis; saved agents with no explicit timeframe retain 1m. See [LLM context](LLM_MEMORY.md#analysis-data-and-run-timing-10-october-2026) and [sizing policies](SIZING_POLICIES.md).

## Experimental strategy rules

New agents and backtests use original signal rules. Experimental signal-policy selectors have been removed from normal forms. Existing saved policies remain reproducible and are preserved when editing. Their engine versions are documented for maintainers in [backtesting](BACKTESTING.md#experimental-execution-rules-v1).

## Compare trend-aware entries

Saved runs may contain an internal trend-aware policy. Charts still explain its entries and rejected setups accurately; ordinary users do not need to choose implementation versions. Fixed take-profit exits remain the live default. [Exit management](EXIT_MANAGEMENT.md) explains the internal trailing comparison and remaining live amendment work.
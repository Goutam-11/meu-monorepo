# Strategy research and production selection

Reviewed 11 October 2026. Sources: original strategy publications, official TradingView documentation, Freqtrade maintainers' documentation/source, QuantConnect LEAN source and published trend-following research. Compared against Meu's current shared strategy, simulation and live execution code.

This document recommends development and selection decisions. It does not report a new profitable strategy or new backtest results. No agents, settings, orders or services were changed during this review.

Later research is documented separately in [four-hour squeeze + directional efficiency](SQUEEZE_RESEARCH.md). It includes exact mechanics, per-coin/capital results and limitations from 13 October. It is an internal candidate, not a promoted replacement for the current strategy catalog; the engineering ordering below is not an updated profitability ranking.

The current research objective and broad qualification criteria are in [multi-market algorithm families](MULTI_MARKET_RESEARCH.md). It records common-rule tests across seven tickers and keeps trend, breakout and range evidence separate; selection cannot rely on a single ticker's return.

## 1. Decision for Meu

Build a small, reviewed strategy catalog:

1. **Donchian trend breakout:** first priority for a complete, precisely specified trend-following system.
2. **EMA trend/pullback:** second trend approach, with the existing crossover retained as its evaluation baseline.
3. **Bollinger range reversion:** a separate range strategy, offered only after its costs and payoff structure pass validation.

Supertrend and slower time-series momentum are useful comparison baselines. They do not need additional product cards before demonstrating an advantage.

This ordering is an engineering recommendation for Meu, not a published ranking of profitability. The reviewed evidence does not identify a universally best signal or establish the best hourly crypto settings.

Users should receive one reviewed implementation for each supported strategy. Keep research comparisons, parameter searches and release identifiers in developer tooling and audit records. Saved runs still need an internal implementation identifier for reproducibility; that does not require exposing version selectors in forms.

## 2. What the documented strategies actually do

### Moving averages: trend direction and entry events

TradingView's two-line strategy enters on fast/slow moving-average crosses. Its moving-average guide also describes entering on a price cross of a shorter average when the longer average establishes direction. Moving averages react to previous prices and can lag. These are distinct documented entry methods, rather than one universally correct recipe. [Two-line cross](https://www.tradingview.com/support/solutions/43000599886-movingavg2line-cross/), [moving-average guide](https://www.tradingview.com/support/solutions/43000502589-moving-averages/).

**Meu finding:** the original fast/slow crossover in shared/trading/strategies.ts matches the basic crossover definition. It is expected to miss part of a move before the cross. An already established trend after activation does not necessarily produce another cross. Adding a pullback entry changes the entry method and needs its own evaluation.

**Proposed complete specification to evaluate:**

- Use the current 20/50 EMA settings as a comparable starting point, not an asserted optimum.
- Define direction using fast versus slow EMA and a precisely specified slow-EMA slope.
- Long pullback: a completed close at/below the fast EMA, followed by a completed close back above it while the long trend remains valid. Reverse for shorts.
- Count this as one distinct pullback event. Do not repeatedly submit while the same condition remains true.
- Set initial protection and quantity before sending an entry.
- Compare a trend-reversal exit with a documented volatility trail. Keep entry rules unchanged when isolating the exit comparison.
- A missed or expired order does not authorize chasing price without a fresh executable setup.

The proposed slope, periods and execution details are Meu design decisions. TradingView documentation does not prove those exact settings profitable.

### Donchian/Turtle: breakout entry and a different exit channel

Curtis Faith's published original rules describe System 1 with a 20-day breakout and 10-day opposite-channel exit, and System 2 with a 55-day breakout and 20-day opposite-channel exit. They include volatility-based stops/sizing, portfolio limits, adding units and, for System 1, a prior-breakout filter with a failsafe. Entries trigger on price crossing prior extremes, without a required retest. [Original rules, mirrored author publication](https://www.tradingwithrayner.com/wp-content/uploads/2014/11/OriginalTurtleRules.pdf), [official original-Turtles site](https://www.originalturtles.org/).

**Meu finding:** the current Donchian implementation has a genuine prior-channel breakout signal, but closes at a generic fixed reward/risk target or an opposite entry signal. It does not implement the separate shorter exit channel. It should not be described as the complete Turtle system.

**Proposed complete specification to evaluate:**

- Use a 20-bar entry channel and 10-bar exit channel as the first intraday adaptation.
- Calculate both from preceding completed candles, excluding the candle being tested.
- Specify whether entry occurs on a completed close beyond the channel or a resting stop crossing. Meu's close-driven worker should begin with the former; it is an adaptation of the original intraday trigger.
- Use an initial 2 ATR stop and the shorter opposite-channel exit, without an arbitrary fixed profit cap in this candidate.
- Start with one position, no pyramiding and no prior-winner filter, so the test remains interpretable and compatible with the current small-account execution model.
- Define a fresh breakout event after an exit. Do not equate every new high with an independent completed trade opportunity.

Using hours instead of days and omitting original portfolio rules produces a Donchian adaptation, not a reproduction of historic Turtle performance. Retest entry can miss a breakout that never returns; it is not a universal correctness requirement.

Trading Blox's current implementation documentation also separates entry and exit channels. Its shipped defaults differ from the historical original rules; defaults must not be confused with canonical or optimal parameters. [Trading Blox implementation](https://www.tradingblox.com/docs/users-guide/17-built-in-systems-and-blox/turtle-system-rules/).

### Bollinger bands: distinguish reversal from continuation

John Bollinger explicitly distinguishes band touches from trading signals and notes that prices can follow a band during a trend. His rules also describe an initial close outside the bands as continuation information. Bands alone therefore do not establish a reversal entry. [Bollinger's own rules](https://www.bollingerbands.com/bollinger-band-rules).

**Meu finding:** the current strategy already uses band re-entry with prior RSI extremes, rather than buying every touch. Nevertheless, the original branch lacks the stronger branch's reward-to-mean economics and side-specific exit handling. Hiding policy selectors did not make those improvements part of the default.

**Proposed complete specification to evaluate:**

- Establish a range condition before the band excursion.
- Require a completed re-entry inside the band.
- Target the mean and invalidate a failed setup using a protective stop.
- Reject entries where the remaining move to the mean is economically inadequate after rounding and round-trip costs.
- Define favorable return-to-mean exits separately for long and short positions.
- Test additional confirmation carefully: waiting can consume the small recovery the trade was supposed to capture.

Do not merge range exits and trend-runner exits into one generic trade-management rule. The prior Meu audit found many small mean exits and larger stop losses; the observed win rate alone did not compensate.

### Supertrend: compact alternative trend baseline

TradingView documents entries when the Supertrend changes sides relative to price; its parameters include ATR length and a band factor. This supplies a concise, inspectable alternative to moving-average crosses. The documentation establishes the mechanism, not a reliable profit ranking. [Official Supertrend strategy](https://www.tradingview.com/support/solutions/43000645068-supertrend-strategy/).

For Meu, compare one clearly specified Supertrend implementation internally if EMA/Donchian candidates do not pass. Adding Supertrend, EMA, RSI, MACD and ADX simultaneously would obscure which rule contributes value.

### Slower time-series momentum: useful evidence boundary

Moskowitz, Ooi and Pedersen studied diversified futures/forwards and found predictability associated with past returns. Their original dataset uses a 12-month signal and monthly holding horizon across 58 instruments. This supports investigating trend following; it does not validate a single hourly cryptocurrency agent. [Paper overview](https://www.aqr.com/Insights/Research/Journal-Article/Time-Series-Momentum), [original dataset description](https://www.aqr.com/Insights/Datasets/Time-Series-Momentum-Original-Paper-Data?aqrPDF=1).

Meu can use a slower momentum baseline to determine whether its more frequent signals add value after costs. It should not inherit published performance claims from a different market universe, horizon or portfolio.

## 3. Use signals for specific jobs

| Job | Suitable input | Meu selection principle |
|---|---|---|
| Direction | Moving-average relationship/slope or channel breakout | Choose the strategy's own direction rule |
| Trend strength | ADX or another explicitly defined strength measure | At most one initial filter, retained only with evidence |
| Range location | Bollinger bands and mean | Used by the range strategy |
| Volatility | ATR | Sizes protection; does not predict direction |
| Tradability | Spread, depth, contract minimum, cost and account headroom | Shared execution gate for every strategy |
| Exit | Opposite channel, trend reversal, mean target or volatility trail | Specify separately from the entry trigger |

ADX measures trend strength, not bullish versus bearish direction; DMI's directional components provide additional information. Common thresholds are conventions to evaluate, not universal profitability settings. [Official ADX explanation](https://www.tradingview.com/support/solutions/43000589099-average-directional-index-adx/).

A filter should solve an identified failure and improve held-out results. Meu's previous arbitrary combinations did not demonstrate a consistent advantage; adding more conditions is not evidence of improvement.

## 4. Correct trade management

### Exits need explicit mechanics

A documented alternative is the Chandelier Exit: a long level based on a recent high minus an ATR multiple, and a short level based on a recent low plus that multiple. [TradingView Chandelier Exit](https://www.tradingview.com/support/solutions/43000773013-chandelier-exit/).

Meu's current internal helper instead trails from a completed **close** after an R-based activation. It is a close-based ATR trail, not Chandelier. A rolling Chandelier indicator may itself move backward; a live protective-stop policy must explicitly say whether it ratchets and never widens. Any next-candle implementation must apply the previously active stop before calculating a new one.

A fixed target may close a trade before delayed trailing can activate. Freqtrade documents this precedence concern for its ROI and trailing-offset configuration. [Freqtrade stop management](https://www.freqtrade.io/en/latest/stoploss/).

Our previous trailing comparison produced mixed results. Neither raising targets nor tightening stops is an established improvement. Choose the exit that works with the complete strategy and execution assumptions.

### A signal is not a fill

~~~mermaid
flowchart LR
    A[Completed data and valid setup] --> B[Account and size preview]
    B --> C[Submit identified order]
    C --> D{Broker outcome}
    D -->|Filled| E[Verify position and protection]
    D -->|Unfilled or expired| F[Cancel or reconcile]
    D -->|Uncertain| G[Reconcile exact order identity]
    E --> H[Manage strategy exit]
    H --> I[Confirm flat before re-entry]
~~~

TradingView's broker emulator documents commissions, slippage, execution delay and conservative limit-fill settings. Those choices materially change the meaning of a chart's trades. [Broker emulator](https://www.tradingview.com/support/solutions/43000786181-broker-emulator/).

**Meu-specific correction required:** historical entries assume next-open fills with slippage, while Delta live entries use passive post-only prices. A touch of a price does not prove the live entry filled. Maker/taker behavior, order expiry, partial fills and missed entries need comparable treatment before selecting a winner.

Costs must follow the actual instrument and account. Delta's fee documentation describes notional-based fees and applicable GST; leverage does not make the fee base equal only to collateral. Funding must be considered separately. [Delta fees](https://www.delta.exchange/fees).

## 5. What the GitHub review establishes

### Freqtrade

The maintainers' strategy repository explicitly describes its strategies as starting points and emphasizes exchange, pair and period dependence. It is not an independently validated catalog of profitable bots. [Maintainer repository](https://github.com/freqtrade/freqtrade-strategies).

The reviewed SampleStrategy separates indicators, entry/exit signals, stop rules, startup candles and order types. Its current example defaults include disabled shorts and off-exchange stops. Copying the sample would not provide Meu's required protected perpetual trading. [Source](https://github.com/freqtrade/freqtrade/blob/9a2f03a6bf8408f155591304c78aab20ca5c44cc/freqtrade/templates/sample_strategy.py).

### QuantConnect LEAN

The reviewed trailing-order regression example tracks order tickets, waits for fill status and handles order events. Its checks explicitly account for update ordering relative to previous data. It is useful execution reference code, not evidence of an investment edge. [Pinned example](https://github.com/QuantConnect/Lean/blob/80e7843f645673bcbeaab963049f76f20f6785e1/Algorithm.Python/TrailingStopOrderRegressionAlgorithm.py).

Pinned references retrieved through the public GitHub API and raw source:

| Repository / file | Commit | SHA-256 |
|---|---|---|
| freqtrade/freqtrade, freqtrade/templates/sample_strategy.py | 9a2f03a6bf8408f155591304c78aab20ca5c44cc | 18d48d64b955dc9bd1b43f59115c16f2002a881c62c2851ceca64569a6f8651c |
| QuantConnect/Lean, Algorithm.Python/TrailingStopOrderRegressionAlgorithm.py | 80e7843f645673bcbeaab963049f76f20f6785e1 | 6bf373ee5c49b256009b12d39a477100fe390b7896a8286728fa8621429c6f94 |

No third-party code was copied into Meu. Reuse of source would require checking its license and matching its semantics to Meu's broker adapters.

## 6. Select the release internally

The following is a proposed Meu development protocol, not new test evidence:

1. **Correct measurement first.** Add pre-window warmup; align sizing and daily-loss accounting; model the intended live order type; use lower-resolution data to examine ambiguous stop/target bars where possible.
2. **Freeze a small candidate set.** Keep current crossover as control; evaluate one EMA pullback specification and one dual-channel Donchian specification. Repair the range strategy separately.
3. **Separate development from evaluation chronologically.** Select settings on earlier data, freeze them and evaluate later periods without tuning against those results. Once viewed and used to change a rule, a period is no longer untouched.
4. **Evaluate the actual deployment universe.** Include multiple eligible liquid perpetuals, rising/falling/ranging periods and the account allocations Meu intends to support. Declare the universe and liquidity rules before selecting winners.
5. **Use cost stress and nearby parameters.** Compare net expectancy, drawdown, trade coverage, turnover and holding time. Check whether a narrow parameter peak or one market/month explains the advantage.
6. **Forward-test execution.** Confirm prospective signal timing, submission, missed/partial fills, protection and restart recovery. A paper fill at a price is not a proof of a real queue fill.
7. **Promote one reviewed release per strategy.** Require acceptable declared loss limits, net advantage over its control, execution correctness and sufficient observations to assess uncertainty. There is no magic trade-count threshold that proves an edge.
8. **Allow no winner.** If every candidate fails, do not publish the least-negative one as profitable. Improve the identified mechanism or leave that strategy unavailable for automatic live selection.

TradingView documents selection/overfitting risks and evaluation on untouched data. Bailey and coauthors examine how searching many backtests can produce misleading winners. [TradingView validation guidance](https://www.tradingview.com/pine-script-docs/concepts/strategies/), [probability of backtest overfitting](https://www.davidhbailey.com/dhbpapers/backtest-prob.pdf).

Indicator stability and causality are separate correctness gates. Freqtrade's recursive analysis checks sensitivity to startup history; its lookahead analysis compares sliced executions to detect future leakage, while documenting coverage limitations. Meu should implement equivalent checks in its own TypeScript engine rather than installing another trading runtime. [Recursive analysis](https://www.freqtrade.io/en/stable/recursive-analysis/), [lookahead analysis](https://www.freqtrade.io/en/stable/lookahead-analysis/).

## 7. Low-capital product behavior

The same strategy should retain its economic logic across account sizes. Allocation changes feasible quantity; it should not silently change a trend strategy into a short-stop scalper.

Meu should compute minimum viable allocation from contract rounding, stop loss plus costs, collateral, leverage ceiling, exposure and shared-account headroom. Explain a rejection in money terms. Prefer an eligible liquid instrument over increasing leverage to hide an unaffordable minimum contract.

Keep user setup focused on exchange, market, allocation, loss tolerance and trading style. Derive the reviewed strategy's periods, stop logic and execution behavior internally. Show the reason for a hold or exit in plain language. LLM agents can assist research and explanation, with shared deterministic execution budgets; model confidence is not a validated reason to relax them.

## 8. Code priorities

| Priority | Module | Concrete next work |
|---|---|---|
| 1 | shared/trading/delta-data.ts and backtest orchestration | Separate causal warmup from scored period |
| 1 | shared/trading/perpetualBacktest.ts, paperTrading.ts, live executor | Comparable fill, sizing and daily accounting assumptions |
| 2 | shared/trading/strategies.ts | Specify dual entry/exit Donchian channels and one EMA pullback method |
| 2 | Shared range entry decision | Promote cost-aware, position-aware behavior only after validation |
| 3 | shared/trading/exitPolicy.ts and live protection adapter | Evaluate documented exit mechanics; verified amendment and recovery before live support |
| 4 | Offline comparison tooling | Frozen candidates, held-out results, costs and reproducible release decision |
| 5 | Frontend | One reviewed strategy implementation; concise setup and decision explanations |

Related evidence: previous strategy audit (local evidence, excluded from Git), [exit comparison and live limitations](EXIT_MANAGEMENT.md), [small-account plan](SMALL_ACCOUNT_TRADING_PLAN.md).

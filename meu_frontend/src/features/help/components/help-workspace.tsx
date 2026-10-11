'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Topic = {
  id: string; title: string; summary: string;
  paragraphs?: string[]; steps?: string[];
  fields?: { name: string; meaning: string }[];
  questions?: { question: string; answer: string }[];
  links?: { label: string; href: string }[];
};
const topics: Topic[] = [
  {
    id: 'charts', title: 'Charts and market research', summary: 'View Indian-market research history and exchange candles with Meu indicators.',
    steps: ['Open Charts → Meu charts. Choose Yahoo for stocks and indices, Delta India for USD perpetuals, or Binance USD-M for USDT perpetuals. These charts need no paid Zerodha data subscription.', 'Search by company, index or ticker. Yahoo uses ^NSEI for Nifty 50, ^NSEBANK for Nifty Bank, .NS for NSE equities and .BO for BSE equities. Crypto search lists public production perpetual markets.', 'Choose an agent ticker to open its mapped market, or use View chart on the agent details page. This is read-only; it does not alter the agent or submit orders. Sandbox and unsupported exchanges are excluded from the agent picker.', 'Choose 5m, 15m, 1h or 1d candles. Toggle EMA 20/50 or Bollinger 20/2; volume and RSI 14 appear below price. Drag to pan, scroll/pinch to zoom or use Fit history. Auto refresh runs every 60 seconds for Yahoo and 30 seconds for crypto while the page is active.', 'The optional TradingView tab retains its symbol search, indicators, drawing tools and global overview. NSE embeds are not supported; use Meu charts for Indian history.'],
    paragraphs: ['Meu renders up to 750 bars using the free Lightweight Charts library. Data is fetched through authenticated server endpoints with timeouts, validation and short shared public-data caches. Fetched time, last candle start and Yahoo provider quote time are shown in IST. The latest candle may be forming. Older candles can indicate a closed market or a delayed feed; a successful refresh is not proof of a fresh trade price.', 'Yahoo is an unofficial research source and can be delayed, blocked or incomplete. The free Zerodha Personal plan does not provide candle history; Meu does not depend on a paid Kite subscription for these charts. Delta and Binance charts use their own public production candles, not interchangeable prices. No currency conversion takes place.', 'Chart indicators describe the displayed candles; they do not reproduce agent decisions automatically. Trades, positions and protective-order overlays are not implemented here. Use Strategies for backtests and agent details for run evidence.', 'If data refresh fails, Meu keeps the previously fetched chart visible with an error and a retry action. Selecting another market never displays the previous market’s history. Chart/theme changes reset chart view; chart drawings are available only in the optional TradingView widget.'],
    links: [{ label: 'Open Charts', href: '/charts' }, { label: 'TradingView widget data availability', href: 'https://www.tradingview.com/widget-docs/faq/data/' }],
  },
  {
    id: 'getting-started', title: 'Getting started', summary: 'How the workspace and background services fit together.',
    paragraphs: [
      'Meu lets you configure trading agents, connect exchanges, test deterministic strategies and monitor executions. The frontend is the control panel. The scheduler queues active agents, a trading worker evaluates them, and the notification service processes activity notifications. Keeping a browser tab open is not required for trading; the background services and their database/queue connections must remain available.',
      'LLM agents use a model to make decisions within execution guards. Rule-based agents evaluate predefined signals without calling an LLM. Stock Hybrid agents run EMA rules first and invoke an LLM only on an actionable crossover. A RUNNING badge expresses activation state; recent successful runs and the next scheduled run show whether execution is actually progressing.',
    ],
    steps: [
      'Add your exchange connection in Exchanges. Crypto algorithm execution currently requires production Delta India market data.',
      'For LLM or stock Hybrid trading, add an AI provider key in Credentials. Pure algorithms do not require an AI credential.',
      'Create an agent, review its settings and choose whether to start it. New agents are paused by default.',
      'Use the agent detail page to review run history and status. Check the exchange directly for live orders and positions.',
    ],
    links: [{ label: 'Connect an exchange', href: '/exchanges' }, { label: 'Manage credentials', href: '/credentials' }],
  },
  {
    id: 'connections', title: 'Exchange and AI connections', summary: 'Broker keys, provider credentials, sandbox mode and IP allowlists.',
    fields: [
      { name: 'Broker', meaning: 'Select the adapter for your account. Delta India is the supported deterministic crypto adapter; Zerodha supports stock EMA/Hybrid. Saving a connection alone does not activate an agent.' },
      { name: 'Exchange API key / Secret', meaning: 'Credentials issued by the exchange for server-side account access and order submission. Store them in Exchanges, not the AI credential form. Saved secrets are encrypted and not returned in the connection list.' },
      { name: 'Sandbox mode', meaning: 'Selects a supported test endpoint for an adapter. It is different from algorithm Paper mode. Current deterministic Delta algorithms require production public market data even when their funds and fills are simulated.' },
      { name: 'Connection / Credential name', meaning: 'An optional name for a saved key, shown together with its broker or AI provider type in cards and selectors. Names can be edited without replacing the saved secret. Blank key fields on edit keep the current encrypted key.' },
      { name: 'Amazon Bedrock', meaning: 'Uses the official Vercel AI SDK Bedrock Converse provider. Save a Bedrock API key and its AWS region, such as ap-south-1. Then select this credential when creating an LLM or stock Hybrid agent and enter an available model ID or inference-profile ID/ARN. The model must support tool calling. Access, region availability and key expiry are controlled by AWS; an AWS access key ID is not a Bedrock API key.' },
      { name: 'Provider type / API key', meaning: 'Credentials is for AI providers. Choose the matching provider and one of its compatible models. A pure algorithm does not consume an LLM key.' },
    ],
    paragraphs: ['If your exchange requires an IP allowlist, use the public outbound IP of the machine running the trading worker. A browser address or localhost address is not the worker’s exchange-facing IP. A changed network or hosting IP can invalidate the allowlist.', 'Zerodha also requires a valid broker session/access token. An expired or unavailable session can skip execution. Review the connection state and reconnect through the supported broker flow.'],
    links: [{ label: 'Exchange connections', href: '/exchanges' }, { label: 'AI provider credentials', href: '/credentials' }],
  },
  {
    id: 'create-agent', title: 'Create and start an agent', summary: 'The setup flow, supported markets and activation behavior.',
    steps: [
      'Open Agents → New Agent. Enter a recognizable name and select the asset class and strategy.',
      'For LLM Trading, choose the AI provider, select one of its saved credentials, then search the provider model list by name or ID. Response settings contains temperature. Configure capital and risk next; position/day limits and cost buffers are expandable. An LLM agent uses the built-in trading prompt; it does not require a backtest or a named algorithm.',
      'For Crypto + Rule Based Algorithm, choose EMA crossover, Donchian breakout or Bollinger + RSI. Choose Paper or Live, candle timeframe, direction, ATR brackets, leverage and margin budget.',
      'Select an exchange you own, then use the searchable ticker picker. Delta algorithms use product symbols such as XRPUSD, one ticker and one open position per agent. The stock EMA runner supports multiple stock symbols through Zerodha.',
      'Set Check market every, then allocated capital and risk limits. Exchange selection fills USD for Delta, USDT for Binance or INR for Zerodha. No conversion is performed. Review configuration shows money ceilings before saving; exchange minimums and shared limits can still prevent an entry.',
      'Choose Create paused agent. For crypto algorithms, contract terms and indicator history are checked on the server. A prior backtest is optional; Backtest last 30 days uses the same parameters over the last 30 completed UTC days.',
      'Open the created agent and review its configuration. Paper uses simulated funds. Different tickers may run on the same exchange. Keep one live owner per ticker, including LLM and algorithm agents. Pause other live agents only if Start needs an account-wide margin-mode change. Start prepares and verifies saved isolated leverage; an account-wide margin-mode change requires no positions or orders anywhere on the account. The ticker must be flat on its first start. Click Start Agent to automatically prepare the settings and activate real order execution; no separate confirmation is required.',
    ],
    paragraphs: ['LLM agents use the editable agent form. Delta and Binance USD-M LLM agents that select native-stop sizing also use verified Start preparation. Automatic leverage is available within their saved ceiling. Crypto algorithms can be edited while paused. Strategy or risk changes start a new state revision. Paper changes require a fresh-portfolio acknowledgement; live changes require a flat ticker, no pending orders and reconciled ownership. Existing positions and pending orders require review before replacing a live agent; never start multiple live owners for the same exchange ticker. Crypto Hybrid, market-research agents and Telegram/Slack channels are not implemented yet.'],
    links: [{ label: 'Create an agent', href: '/agents/create' }, { label: 'Review your agents', href: '/agents' }],
  },
  {
    id: 'llm-agents', title: 'Create and operate an LLM agent', summary: 'Model decisions, provider credentials, execution guards and running costs.',
    steps: [
      'In Credentials, save an AI provider key. In Exchanges, save the separate broker connection used for your trading account.',
      'Open Agents → New Agent, choose LLM Trading and the asset class. In Agent intelligence, choose the provider and its saved credential, then open LLM model to search the current catalog. Select an owned exchange and the permitted tickers.',
      'Set allocated capital, entry-notional percentage, daily loss, simultaneous positions and daily entry limits. These fields constrain orders even when the model proposes a larger quantity.',
      'Choose the polling cycle and temperature. Create the paused agent, review its configuration, then start it. The scheduler and workers must remain online.',
      'Review the model’s run summary and the actual exchange orders and positions. A model can hold without submitting an order, and an execution guard can refuse a proposed trade.',
    ],
    fields: [
      { name: 'What the model receives', meaning: 'The crypto runner supplies market indicators, recent fills, open positions, a balance summary, trading-policy limits and up to five completed run memories from the same configuration. The current prompt is built into Meu; the form does not yet provide a custom system-prompt editor or a market-research agent.' },
      { name: 'Decision memory', meaning: 'Crypto and Zerodha LLM agents save a validated decision summary, confirmation conditions and the next position-review plan separately from the full response. Each memory includes a UTC timestamp and guarded broker-operation receipts. A confirmed operation is not proof of a fill: current positions, orders and fills take priority. Missing or malformed summaries use a bounded, explicitly unverified excerpt without another model call. Strategy, ticker, exchange, model, capital or risk changes isolate prior memories; renaming and pausing preserve them. Memories from before this upgrade are excluded because their configuration cannot be verified. Failed runs still pause for review and are not included as completed memories.' },
      { name: 'What the model can do', meaning: 'Use the broker tools available to its adapter to inspect markets and accounts and propose orders. Server-side ownership, symbol, balance and risk checks apply before broker submission. The model does not have unrestricted access to your account.' },
      { name: 'Quantity and risk', meaning: 'The LLM can request a quantity or omit it for the server-calculated maximum. Execution guards reject quantities beyond the allowed budget. Zerodha previews required margin through Kite and uses broker-defined MIS leverage; no arbitrary multiplier can be set. The legacy LLM path caps full entry notional; it does not use the crypto algorithm’s deterministic ATR-based sizing. The same percentage field therefore has a different meaning across these paths.' },
      { name: 'Model / temperature', meaning: 'The model controls which provider model makes decisions. Temperature controls generation variability; lower values generally produce less varied output, but do not guarantee identical decisions or better returns. A model/provider mismatch or unavailable model can cause a run to fail.' },
      { name: 'Model discovery', meaning: 'Meu lists models from the selected provider API using your saved credential on the server. Search matches names and exact IDs, with up to 40 results shown and a five-minute server cache. Changing provider or credential clears the model choice. OpenRouter entries must advertise text output and tool calling. Other providers may not publish capability details; a catalog entry does not confirm tool support or invocation permission. Enter a custom model ID remains available for private models, unavailable catalogs or restricted permissions, and editing preserves existing model IDs.' },
      { name: 'Bedrock model discovery', meaning: 'Meu uses the saved AWS region to list active text foundation models and inference profiles. Your Bedrock API key needs ListFoundationModels and ListInferenceProfiles permissions for complete discovery. If one list is unavailable, the picker keeps the other and explains the missing list. Choose a Converse-compatible tool model or inference profile; listing alone does not confirm access. Custom profile IDs or ARNs remain supported.' },
      { name: 'Polling and AI cost', meaning: 'A shorter polling cycle can produce more model calls. Provider token charges are separate from exchange fees and your allocated trading capital; the allocation does not cap your AI bill. Meu logs token usage but has no per-agent AI-spend cap yet.' },
      { name: 'Stops and leverage', meaning: 'Delta LLM entries must include a native stop-loss price fraction; 0.01 means 1% from entry, not 1× ATR. Choose Position sizing and leverage → Loss at native stop for Delta or Binance USD-M to configure leverage. Binance uses USDT, IOC entry fills and separate conditional stop/target orders; protection acknowledgement is not atomic with the entry. If it fails, an emergency reduction is attempted and account recovery is required. Fixed mode applies your saved target at Start. Meu chooses within my ceiling enables the setLeverage tool: it calculates and verifies minimum viable leverage on a flat ticker, then the LLM must refresh sizing before entry. Full-notional mode cannot credit leverage. ATR periods, simulation costs and algorithm direction controls are not LLM configuration fields.' },
      { name: 'Backtesting / Paper mode', meaning: 'Strategies and the current Paper engine evaluate deterministic crypto algorithms. They do not replay LLM decisions or provide an LLM backtest. A broker sandbox is a separate adapter feature, not the algorithm simulator.' },
    ],
    links: [{ label: 'AI credentials', href: '/credentials' }, { label: 'Create an LLM agent', href: '/agents/create' }],
  },
  {
    id: 'ticker-picker', title: 'Find and select tickers', summary: 'Search available markets without remembering exchange-specific symbols.',
    steps: ['Select the asset class and an owned exchange in the agent form. Changing the exchange clears previous ticker selections.', 'Open Trading Symbols and type a ticker, pair, asset name or company name. Use the arrow keys and Enter to select, or click a result. Search shows up to 30 results; refine it when there are more matches.', 'For an LLM or stock agent, Add Symbol provides another picker. Already selected values are excluded; saving also rejects duplicate aliases for the same market. Crypto algorithms still use one ticker.', 'The Strategies backtest picker uses public production Delta India markets and needs no saved API key. Saved crypto algorithm tickers remain fixed in the editor.'],
    paragraphs: ['Crypto market discovery uses CCXT loadMarkets. The picker exposes active linear perpetuals and filters Delta to USD and Binance to USDT settlement. Spot, inverse, quanto and option contracts are excluded. Market discovery does not add execution support for an exchange whose trading adapter is not implemented.', 'Zerodha uses the Kite NSE instrument CSV and includes NSE equities only. Sign in to Kite through the exchange dashboard today before searching. Futures, options, indices and BSE instruments are not offered by the current stock runner.', 'Crypto metadata is cached server-side for five minutes. Kite metadata is shared for the current India calendar day, with ownership and daily token checks on each request. These are instrument details, not live quotes. Retry a failed list from the picker; unavailable markets and broker execution conditions are checked again on the server.'],
    links: [{label:'Create an agent',href:'/agents/create'},{label:'Open backtests',href:'/strategies'},{label:'Sign in to Kite',href:'/dashboard'}],
  },
  {
    id: 'common-fields', title: 'Identity and market fields', summary: 'Name, strategy, exchange, symbols, polling and model controls.',
    fields: [
      { name: 'Agent name', meaning: 'Your label for identifying the agent. It does not change trading logic.' },
      { name: 'Strategy', meaning: 'LLM Trading uses model decisions. Rule Based Algorithm executes deterministic rules. Hybrid currently combines stock EMA signals with an LLM and is unavailable for crypto.' },
      { name: 'Asset class', meaning: 'Crypto and Stocks use different exchange adapters. Crypto algorithms currently support Delta India; stock algorithm/Hybrid execution requires Zerodha.' },
      { name: 'Exchange', meaning: 'The saved connection used for market data and, in live mode, account access and orders. Select an exchange owned by your account.' },
      { name: 'Trading symbols', meaning: 'Select markets from the exchange-aware picker. Search by product ticker, unified pair or asset/company name. Delta saves product tickers such as XRPUSD; other crypto connections use CCXT unified symbols. Zerodha offers NSE equities such as RELIANCE after today’s Kite login. Duplicate markets and unavailable symbols are rejected when saving.' },
      { name: 'Agent cycles', meaning: 'How frequently the scheduler checks the agent. A 1-minute cycle with a 1-hour candle does not trade every minute: decisions use newly completed hourly candles. Crypto polling cannot be slower than its candle timeframe; a shorter interval reduces the chance of missing one.' },
      { name: 'LLM model and AI credential', meaning: 'Choose a compatible model and saved provider key for LLM/stock Hybrid agents. These fields are not used by pure algorithms. Exchange credentials and AI credentials serve different purposes.' },
      { name: 'Temperature', meaning: 'A model generation setting between 0 and 1. It affects model output variability, not leverage, order risk or guaranteed accuracy.' },
    ],
  },
  {
    id: 'reconciliation', title: 'Reconciliation and recovery', summary: 'Inspect uncertain submissions, broker exposure and retained execution locks.',
    steps: ['Pause all live agents on every connection to the affected Delta account. Pausing does not close positions or cancel orders; inspect protection on Delta.', 'Open Dashboard → Account execution and ownership → Inspect account reconciliation. Run Scan Delta account.', 'Review ownership findings, pending broker orders, managed fills, unresolved operation IDs and recorded lock states. If execution changed during the scan, wait for in-flight operations to finish and scan again.', 'Keep the agent paused when an order is unknown, quantity changed, history is incomplete or a lock remains. Review broker fills and native bracket outcomes before any repair. Never resend an uncertain entry merely because its ID was not found.'],
    paragraphs: ['The scan is diagnostic. It uses saved broker IDs and, for uncertain submissions, client IDs to look up orders. Finding an order is evidence, not an automatic repair. Broker snapshots are read at different times and manual trades can still change the account during inspection.', 'Open Recovery on a Delta exchange card or live crypto agent card. Use Pause live agents, Scan Delta account, then Verify and recover locks. The recovery action does not cancel orders, close positions, adopt manual exposure or resume agents. On a freshly verified flat account with no pending orders and an inactive worker, it repairs managed submissions whose exact broker/client IDs and terminal fill states can be verified, marks stale ownership flat, records the recovery audit and releases only the holding execution’s locks. A cancelled partially filled order is eligible only after its position is closed and pending protection removed on Delta. Unknown broker identities stay blocked; missing orders are not treated as refusals. Risk counters are preserved. Algorithm recovery refreshes completed-candle history and clears only terminal, verified entry tracking. Agents stay paused until you Resume them. For a missed-live-candles pause, Resume performs a limited recovery after other live agents are paused or verified as waiting behind the same failed execution: it verifies a flat Delta account with no open orders, no recorded entry and no broker operation in the failed run, refreshes indicator history and skips stale signals. It records the skipped candle range before releasing only that run’s locks. Other failures still require reconciliation. A clean scan is not proof that Start or entry risk checks will pass. Older positions are not automatically imported.', 'Paper agents have separate simulated portfolios and daily counters. They do not share real settlement balances, account ownership or live locks. Offline multi-agent regressions validate state isolation, simulated protection and replay handling; they do not establish live profitability or broker fill accuracy.'],
    links: [{label:'Open account dashboard',href:'/dashboard'}],
  },
  {
    id: 'account-ownership', title: 'Account ownership and shared limits', summary: 'How different agents share a Delta account without managing each other’s positions.',
    paragraphs: [
      'Delta live LLM and algorithm agents share one execution lock for the actual broker account, even when you save that account as multiple exchange connections. Different tickers can remain active; account operations run in sequence. One live owner is allowed per account/ticker. Running two strategies on the same ticker requires future coordinated execution and is not supported.',
      'Meu records each entry or reduction before sending it, then verifies broker order identity, fills and position quantity. A manual position is not automatically adopted. Manual quantity changes, missing history and uncertain submissions require review. Pausing an agent does not cancel orders or close positions. Do not replace a paused agent while it owns exposure.',
      'The dashboard’s managed-position and recorded-order tables show the last worker verification, not a live broker feed. The portfolio above them remains the broker view. A flat ticker with pending protection is blocked from reuse until those orders are reconciled. Ownership tracking currently applies to Delta live execution, not Binance or paper portfolios.',
      'Daily debits with a product and one matching ownership period are charged to that agent. Unattributed or overlapping debits are conservatively charged to every agent, and all debits count at account level. Profits and deposits do not offset daily losses. This is safety accounting, not a complete profit-and-loss report.',
    ],
    fields: [
      { name: 'Maximum open tickers', meaning: 'The shared simultaneous ticker cap, including pending entries, manual exposure and every agent. Adding to an existing ticker does not open another ticker.' },
      { name: 'Maximum margin (%)', meaning: 'The percentage of current settlement-wallet equity available for total account margin. This cap is checked alongside each agent’s capital and margin budget.' },
      { name: 'Daily loss cap (%)', meaning: 'Based on the lower of current equity and the first equity observed by Meu that India calendar day. It is not reconstructed midnight equity. Negative trading debits and conservative reserves consume this budget. Existing isolated collateral is fully reserved, so another entry can be refused even when a stop would suggest a smaller loss.' },
      { name: 'Maximum notional multiple', meaning: 'The whole account’s gross exposure cap as a multiple of current settlement equity. A value of 3 means total position and pending-entry notional must fit within three times equity. This does not set broker leverage.' },
    ],
    steps: ['Open Dashboard and select your production Delta connection.', 'Expand Shared account risk limits. Pause all live agents on every connection to this same broker account before saving changes.', 'Review the shared limits and each agent’s allocation before resuming. Separate allocations do not reserve independent broker balances. Defaults are initial guard settings, not a recommendation to trade.'],
    links: [{label:'View account tracking',href:'/dashboard'}],
  },
  {
    id: 'capital-risk', title: 'Capital and risk limits', summary: 'How trade risk, exposure, daily counters and currency differ.',
    paragraphs: ['Limits are constraints on new entries, not a promise of maximum realized loss. Stops may slip or fail to fill during gaps or exchange problems. Reductions and protective exits remain permitted when an entry budget has been exhausted.'],
    fields: [
      { name: 'Total allocation / Capital', meaning: 'The budget assigned to the agent. Creating an agent does not transfer or ring-fence funds at the exchange. Delta uses USD API wallet units, Binance perpetuals USDT, and Zerodha INR. Available balance and other account exposure also constrain live orders.' },
      { name: 'Risk at Stop per Trade (%) — Delta algorithm or native-stop LLM', meaning: 'Estimated loss from entry to the rounded native stop, including buffered costs, divided by allocated capital. With a 10 USD allocation and 0.5% risk, this budget is 0.05 USD. This example illustrates the calculation, not a guaranteed loss limit.' },
      { name: 'Maximum Entry Notional (%) — full-notional LLM/stock policy', meaning: 'Caps full entry order value against allocation. This is a different sizing rule from crypto algorithm stop-distance risk. Leverage does not increase this legacy budget.' },
      { name: 'Maximum Daily Loss (%)', meaning: 'Blocks new entries when the configured loss allowance is consumed. Live crypto accounting includes realized debits and conservative exposure/cost reserves; winning trades do not simply replenish it. Delta live, paper and new backtest daily guards reset at India midnight (Asia/Kolkata). Older saved backtests retain their original UTC results. Other crypto exchanges use UTC midnight.' },
      { name: 'Maximum Open Positions', meaning: 'The simultaneous position limit, including pending entries in live guards. On Delta, this counts verified positions and pending entries owned by this agent. A separate shared-account limit counts every account ticker, including manual positions and other agents. Crypto algorithms save a per-agent limit of one. Other adapters still use their existing account checks. It is different from the number of positions opened during a day.' },
      { name: 'Maximum Trades per Day', meaning: 'Limits new entry attempts using durable daily reservations. Exits are not blocked. An uncertain broker outcome can keep a reservation until reconciliation, so the counter is not just a count of completed profitable trades.' },
      { name: 'Maximum Positions Opened per Day', meaning: 'The daily allowance for new position entries. It is reserved before broker submission; a position closing does not restore the daily entry allowance.' },
      { name: 'Maximum Margin (%)', meaning: 'Limits collateral usage against allocated capital. 100% permits full allocated collateral, with costs and account limits still able to reduce the order. It does not set stop-loss risk to 100%. Existing positions and pending orders consume account budgets too.' },
      { name: 'Maximum gross notional', meaning: 'For algorithms the form shows a percentage of allocation: 100% is 1×, 200% is 2×. Generic sizing forms use the equivalent exposure multiple. This is a separate cap on total order/position value; it does not change the loss allowance or guarantee a trade.' },
      { name: 'Automatic leverage and sizing objective', meaning: 'With Automatic selected, leverage is your ceiling. New configurations fund the largest permitted rounded size, then choose the lowest leverage that achieves it. The first-tradable option (also the default for saved agents without an explicit objective) stops at the first leverage permitting a valid order. Both obey existing risk, margin, exposure, costs and account limits. It does not raise budgets or tighten stops. Live changes require a flat ticker with no pending orders; existing positions retain their leverage. An uncertain setting update sends no entry and can be verified using account recovery.' },
      { name: 'Sizing method for LLM agents', meaning: 'Missing policy retains historical full-notional limits. Explicit full-notional policies work on Delta, Binance and supported Zerodha stock paths. Loss at Native Stop currently works for one Delta ticker and requires verified attached protection; Binance/Zerodha stop-risk modes remain unavailable until their protection adapters are completed. Server calculation supplies the bounded crypto quantity. Edit requires the agent to be paused.' },
      { name: 'Fresh entry sizing preview', meaning: 'On a paused supported live crypto agent’s details, calculate a hypothetical entry from fresh account and quote reads. It shows contracts, notional, margin, stop loss, assumed leverage and binding constraint. No orders or settings change. A missing daily equity baseline makes the result provisional. Actual entries recheck everything; this is not a current trade signal.' },
      { name: 'LLM analysis timeframe', meaning: 'Crypto LLM analysis candles are separate from review cadence. New agents default to 15m; older agents without a saved timeframe retain 1m. Primary context uses completed, consecutive candles with aligned indicators. Missing primary data is retried before broker execution; optional missing context is labelled.' },
      { name: 'Low allocation and 100% limits', meaning: 'Permission to use 100% margin does not require risking 100% at the stop. With 20 USD and 2% stop risk the estimated loss budget is 0.40 USD, while order value may be larger. A minimum contract must fit both margin and stop-risk budgets. More leverage reduces collateral but not price loss or fees per contract. Shared account daily-loss caps can still block an entry after you increase margin.' },
      { name: 'Leverage (isolated)', meaning: 'The required Delta leverage, between 1× and 20× in this configuration. It also sets an allocation × leverage exposure cap. Choose a whole-number leverage yourself. Start applies and verifies this saved setting when the ticker has no exposure; account-wide margin-mode changes require the whole account to be flat. Position quantity is calculated from risk, stop distance, capital and margin limits. Saved leverage can be edited while paused and flat; Start prepares the revised value before activation.' },
    ],
  },
  {
    id: 'algorithm-fields', title: 'Algorithms, stops and targets', summary: 'What each available rule and parameter actually does.',
    fields: [
      { name: 'EMA crossover', meaning: 'Signals long when the fast EMA crosses above the slow EMA on a completed candle; signals short on the reverse crossover. It can produce repeated reversals in sideways markets. Fast period must be shorter than slow period.' },
      { name: 'Donchian breakout', meaning: 'Signals long when the completed candle closes above the highest high of the previous lookback candles; short when it closes below their lowest low. The current candle is excluded from that comparison.' },
      { name: 'Bollinger + RSI', meaning: 'Looks for re-entry into a Bollinger band after an oversold/overbought move. Bands use the configured lookback and two standard deviations; RSI uses a fixed 14-period calculation with 30/70 thresholds. Mean-return conditions can fail in strong trends.' },
      { name: 'Candle timeframe', meaning: 'The bar duration used by the crypto strategy: 15 minutes, 1 hour, 4 hours or 1 day. Only completed candles contribute new signals.' },
      { name: 'When to enter', meaning: 'Enter on signal keeps the original closed-candle setup. Follow-through waits for later closes that hold the original setup level and move in the signal direction. Retest waits for a later touch and reclaim of that level. EMA must retain its trend. New crypto algorithms default to one follow-through close, three candles to expire and two candles of rest after an exit. Saved older agents keep immediate entries until edited.' },
      { name: 'Cooldown and protective exits', meaning: 'Cooldown delays new entries after a completed exit, helping avoid rapid repeat trades and fees. Stop-loss, take-profit and opposite-signal exits remain immediate. Retests may miss strong moves; fewer trades do not guarantee better returns. These controls apply to Delta crypto algorithms; the separate stock EMA runner is unchanged.' },
      { name: 'Fast / Slow EMA period', meaning: 'The candle counts for the two EMA averages. The stock runner uses its own stock EMA data path; crypto uses the selected candle timeframe.' },
      { name: 'Breakout lookback / Bollinger period', meaning: 'The number of prior candles used for the channel, or the window used to calculate the band mean and deviation. These controls apply to their corresponding algorithms.' },
      { name: 'ATR period', meaning: 'ATR means Average True Range: a volatility measure, not a prediction of up or down. Each candle’s true range is the largest of high minus low, absolute high minus previous close, and absolute low minus previous close. Meu averages the initial window and then uses Wilder-style smoothing. Period 14 on 1-hour candles means 14 hourly bars. ATR is quoted in price units, not percent.' },
      { name: 'Stop loss × ATR', meaning: 'Sets stop distance from entry as ATR × this multiplier. Hypothetical example: entry 1.50 USD, ATR 0.01 USD and multiplier 2 give a 0.02 USD stop distance: 1.48 for a long or 1.52 for a short. Crypto live execution rounds the native bracket to the exchange price tick. This is an initial bracket, not an automatically trailing ATR stop.' },
      { name: 'Take profit / stop risk', meaning: 'The target-distance multiplier relative to stop distance. A value of 2 targets twice the stop distance. In the 1.50 USD entry / 0.02 USD stop-distance example, the target is 1.54 for a long or 1.46 for a short. It does not mean two times your money or a 2% move; fees and slippage reduce realized reward/risk.' },
      { name: 'Allowed direction', meaning: 'Both, Long only or Short only filters new entries. It does not disable protective exits for an already open position.' },
    ],
    links: [{ label: 'ATR reference — Fidelity', href: 'https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/atr' }],
    paragraphs: ['Quantities are whole contracts. The smallest allowed contract may exceed a small risk or margin budget; the correct result is no entry. Live guards may reduce size compared with a simulation because they use current balance, costs, margin metadata and rounded prices.'],
  },
  {
    id: 'paper-live', title: 'Paper, live and pausing', summary: 'What activation does, and what it does not do.',
    paragraphs: [
      'Paper algorithms consume live public Delta candles but use simulated USD funds. They do not place real orders or use private exchange credentials. The first run initializes the portfolio and indicators; later completed candles advance the simulated state. Paper fees, funding, stops and liquidation remain approximations.',
      'Live algorithms can place real Delta orders. On the first run they require a flat ticker with no pending orders, warm indicators and wait for a fresh candle. Historical entry signals are not replayed just because you start an agent. An initialized or waiting run is normal and does not prove an order was placed.',
      'Pausing stops future agent execution. It does not close live positions, cancel pending orders, or remove native exchange stop/target brackets. Review orders and positions directly at Delta when handling an open trade.',
      'Paper can replay protective exits across a pause while suppressing old entry signals. Live execution cannot reconstruct missed fills: candle gaps, stale backlogs, uncertain submissions, partial fills or changed contract terms require review and may pause the agent. Create a new configuration only after resolving existing ownership and exchange state.',
    ],
  },
  {
    id: 'backtesting', title: 'Run and compare backtests', summary: 'Test historical rules, inspect costs and create agents from saved results.',
    steps: [
      'Open Strategies, select a trading algorithm, Delta product ticker and candle timeframe. Historical research uses public data and places no orders.',
      'Select Start and End in UTC. End is exclusive: an end date excludes that day. Use enough history for indicator warmup; each run is limited to 10,000 candles.',
      'Choose a period purpose. Research is for parameter selection; validation should use an unseen period. These labels do not enforce non-overlapping dates or prevent tuning on validation data.',
      'Choose test capital, risk at the stop and when to enter. Basic mode calculates the daily-loss ceiling as three times risk and supplies indicator/collateral defaults. Expand Advanced settings to override periods, stops, targets, leverage, costs and limits. Opening Advanced makes its daily-loss field explicit.',
      'Run and save the backtest. Inspect the price chart with entry/exit markers, the selected trade explanation, equity, drawdown, fees, funding and warnings. A run with no trades can mean no signal or insufficient contract budget.',
      'Select saved runs for comparison. Compare equivalent periods, costs and capital assumptions. Export a run to retain parameters, contract terms, candles and the data hash.',
      'Optionally create a paused Paper or Live agent from the saved result. It initially uses that snapshot. Editing strategy or risk settings removes the backtest association because the historical result no longer validates those settings. Creating a live agent is separate from activating it.',
    ],
    links: [{ label: 'Open Strategies', href: '/strategies' }],
  },
  {
    id: 'execution-costs', title: 'Slippage, fees, funding and contracts', summary: 'Worked examples of cost assumptions and how they differ from live execution.',
    fields: [
      { name: 'Basis points (bps)', meaning: 'One basis point is 0.01%. Convert bps to a decimal rate by dividing by 10,000: 5 bps = 0.05% = 0.0005, and 10 bps = 0.1% = 0.001.' },
      { name: 'Slippage (bps)', meaning: 'The difference between the expected price and the actual execution price. Meu’s simulator assumes an unfavorable adjustment: at a 100 USD price, 5 bps gives a buy at 100.05 or a sell at 99.95. It also adjusts exits adversely. This assumption is not a broker slippage limit or a guarantee of the fill price; actual liquidity, price movement and latency can produce a different outcome.' },
      { name: 'Spread', meaning: 'The gap between the best bid (buyers’ price) and ask (sellers’ price). It is distinct from the fee. The simulator does not separately reconstruct a historical order book or spread; a slippage assumption cannot reproduce all those costs exactly.' },
      { name: 'Fee (bps)', meaning: 'The modeled trading fee charged on transaction notional, not just margin. With 100 USD notional and 10 bps, the assumed fee is 0.10 USD per side; a same-size entry and exit cost about 0.20 USD before other costs. Actual maker/taker rates and exchange charges may differ. Live guards use current fee metadata and buffered costs as well.' },
      { name: 'Funding per 8h (%)', meaning: 'A constant paper/backtest assumption for perpetual funding, not historical settlements. In the simulator, positive funding means longs pay and shorts receive; a negative rate reverses this. At 100 USD notional and +0.01%, one modeled settlement is 0.01 USD. Live funding follows the exchange, and a zero assumption does not imply zero live funding.' },
      { name: 'Contract size / quantity', meaning: 'Quantity is a count of contracts. Base-asset quantity = contracts × contract size; notional = base quantity × price. For a hypothetical contract size of 1 XRP, 2 contracts at 1.50 USD have 3 USD notional. Meu reads the actual contract size from Delta rather than assuming every ticker uses one base unit.' },
      { name: 'Margin / leverage / liquidation', meaning: 'A rough initial-margin example is 20 USD notional ÷ 2× leverage = 10 USD margin, before exchange tiers and buffers. Leverage multiplies exposure relative to collateral; it does not multiply the agent’s risk allowance. Liquidation can occur when collateral cannot satisfy maintenance requirements. Live guards check exchange margin metadata and stop distance; simulator liquidation remains an approximation.' },
    ],
    paragraphs: ['ATR, stop and target settings define distances. Capital, risk percentage, whole-contract rounding, margin, costs and available balance determine whether a trade is affordable. Increasing a stop multiplier can reduce permitted quantity; increasing leverage does not necessarily make an otherwise rejected trade fit. All numerical examples here are illustrative.'],
    links: [{ label: 'Order execution — Investor.gov', href: 'https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/executing-order' }],
  },
  {
    id: 'editing-agents', title: 'Edit an agent', summary: 'Change paused algorithm settings while preserving historical results.',
    paragraphs: [
      'Use the pencil Edit action in Agents, or Edit settings on the agent detail page. Crypto algorithms use the same fields as New Agent: EMA, Donchian or Bollinger + RSI; periods, timeframe, ATR brackets, direction, leverage, allocation, margin, costs and daily limits. Pause the agent first. Saving leaves it paused; it does not submit orders or alter Delta settings.',
      'Ticker, exchange and Paper/Live mode remain fixed for a saved crypto algorithm so ownership and portfolio history stay attached to the right market. Create another agent to change those fields. Name and polling interval changes preserve the current state and any backtest reference.',
      'Strategy, timeframe, capital, risk and cost changes create a fresh state revision. For paper trading, select the acknowledgement to start a fresh portfolio at the revised capital. Previous portfolios remain stored and can be inspected using Portfolio history on the detail page. A new portfolio warms up indicators before entries. It does not carry simulated positions or profits into the revised configuration.',
      'For live changes, Meu checks the broker ticker under account and execution locks: it must have no positions or pending orders. Active ownership, uncertain submissions and unfinished executions must be reconciled first. Changing settings cannot release these claims. Fresh indicators use a separate cursor; live daily entry counters and broker history are preserved. Start Agent later prepares the revised isolated leverage when safe.',
      'An edit uses the configuration version loaded in your form. If another operation changed it, reload before saving. Strategy and risk edits remove the saved-backtest link; prior backtest results remain unchanged and should be rerun for the revised settings. LLM and stock agents retain their existing editing form. Crypto Hybrid and same-ticker strategy netting remain future work.',
    ],
    links: [{label:'Review and edit agents',href:'/agents'},{label:'Backtest revised settings',href:'/strategies'},{label:'Inspect account reconciliation',href:'/dashboard'}],
  },
  {
    id: 'results', title: 'Read results and their limits', summary: 'Returns, drawdown, equity and reproducibility.',
    fields: [
      { name: 'Net return / Final equity', meaning: 'The simulated change relative to initial capital, after modeled fees and funding. Equity can include unrealized position value; it is different from available cash or exchange wallet balance.' },
      { name: 'Maximum drawdown', meaning: 'The largest modeled peak-to-trough decline in the equity series. It describes that simulated period and is not a bound on future losses.' },
      { name: 'Win rate / Trade count', meaning: 'The proportion of completed trades with positive net P&L, and the number of completed trades. Win rate alone ignores loss size and transaction costs.' },
      { name: 'Benchmark', meaning: 'An unleveraged price-only buy-and-hold comparison. It omits fees and funding and is not an executable futures portfolio.' },
      { name: 'Strategy version / Data hash', meaning: 'Identify the rules version and saved data snapshot for reproducibility. Public contract terms reflect the snapshot time and can differ from historical terms.' },
    ],
    paragraphs: ['The simulator uses closed-candle signals and fills no earlier than the next candle open. It approximates intrabar stop/target ordering and isolated liquidation from trade-price OHLC. Historical mark prices, historical funding, spread, taxes, partial fills and live latency are not modeled. Favorable historical results do not establish future profitability.'],
  },
  {
    id: 'monitoring', title: 'Monitor runs and notifications', summary: 'How to tell activation, execution and order activity apart.',
    paragraphs: [
      'Check agent status, Last run, Next run and run history together. Failed executions pause the agent and produce an error notification; they may not appear as a completed run in history. RUNNING means the agent is enabled; a recent completed worker execution is stronger evidence that it is being processed. A run can hold, wait, initialize indicators, reject an entry or place an order. These are different outcomes.',
      'A short polling cycle with an hourly strategy normally produces many waiting runs between candle closes. The first initialization run does not enter a position. Read the run outcome and confirm live orders at the exchange rather than assuming a scheduled check creates a trade.',
      'Notifications are available in the app. Enable browser notifications and grant permission to receive web push when supported and configured. Denied permissions can be changed in your browser settings. Telegram and Slack notification channels are planned, not available controls.',
      'The dashboard activity chart describes trading activity from available fills; it is not a portfolio equity or profit chart. Exchange positions, pending orders and settled balances remain the account source of truth.',
    ],
    links: [{ label: 'Agent runs', href: '/agents' }, { label: 'Notifications', href: '/notifications' }],
  },
  {
    id: 'troubleshooting', title: 'Troubleshooting', summary: 'Common reasons an agent waits, refuses an entry or pauses.',
    questions: [
      { question: 'The agent is running but has not traded. Is it broken?', answer: 'Check its latest run and next scheduled run. Initialization, waiting for a completed candle, a hold signal, direction filters and an unaffordable minimum contract can all produce no trade. If runs stop updating, check the scheduler, trading worker, database and Redis connection.' },
      { question: 'Why is a small order rejected?', answer: 'One whole contract may exceed the stop-risk or margin allowance. Fees, existing exposure, available balance, daily reservations and Delta margin-tier rules can further reduce the permitted size. Read the reported reason; do not assume a higher leverage setting resolves it.' },
      { question: 'Why does Live require matching isolated leverage?', answer: 'Sizing and protection use the saved leverage and margin assumptions. Start prepares and verifies the saved isolated settings when safe. It blocks margin-mode changes with any account exposure and leverage changes with ticker exposure. Different tickers can run together when account mode already matches. Every subsequent entry verifies the settings again; it never changes leverage on an open position.' },
      { question: 'Why did the agent pause for reconciliation?', answer: 'Temporary data/service errors before an order request and account-lock contention reschedule the agent with backoff. Warnings identify the next retry and lock owner. A pause for review may indicate a partial fill, an unowned or changed position, an ambiguous broker response, changed contract terms or missed candles. Review current exchange orders/positions and the error notification before resuming. Repeatedly restarting does not resolve uncertain account state.' },
      { question: 'Can I edit an algorithm after creation?', answer: 'Yes. Pause it and open Edit settings. Execution changes start a new state revision; paper changes require a fresh-portfolio acknowledgement and live changes require a flat, reconciled ticker. Ticker, exchange and execution mode stay fixed. Name and polling changes preserve current state. See Edit an agent for details.' },
      { question: 'Why does backtesting fail for a date range?', answer: 'Check the exact Delta ticker, available historical data, UTC end date, candle limit and indicator warmup. Incomplete or missing candles are rejected instead of silently inventing data.' },
      { question: 'Why can I not select crypto Hybrid or an algorithm on Binance?', answer: 'Those deterministic execution paths are not implemented. Crypto algorithms currently support Delta India. The Binance adapter is used by the separately guarded LLM path.' },
      { question: 'Will the agent keep running when I close Meu?', answer: 'Yes, if the scheduler, trading worker and supporting services stay online and connected. Closing the frontend tab does not stop an active agent; stopping background services interrupts execution.' },
    ],
  },
];

export function HelpWorkspace() {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState('getting-started');
  const pageRef = useRef<HTMLDivElement>(null);
  const term = query.trim().toLowerCase();
  const visible = useMemo(() => topics.filter(topic => !term || JSON.stringify(topic).toLowerCase().includes(term)), [term]);
  useEffect(() => {
    const page = pageRef.current, root = page?.closest('main');
    if (!page || !root) return;
    const sections = Array.from(page.querySelectorAll<HTMLElement>('section[id]'));
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!sections.length) return;
      const readingLine = root.getBoundingClientRect().top + 32;
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= readingLine) current = section;
        else break;
      }
      if (root.scrollHeight > root.clientHeight && root.scrollTop + root.clientHeight >= root.scrollHeight - 2) current = sections[sections.length - 1];
      setActiveId(current.id);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    schedule();
    root.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const resize = new ResizeObserver(schedule);
    resize.observe(page);
    return () => { root.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); resize.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [visible]);
  return <div ref={pageRef} className="p-6 lg:p-10">
    <header className="mb-8 space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Help &amp; documentation</h1>
      <p className="max-w-[72ch] leading-relaxed text-muted-foreground">Understand Meu, configure an agent and interpret its results. These guides describe the features currently available in the app.</p>
      <div className="flex flex-wrap gap-3"><Button asChild><Link href="/agents/create">Create an agent</Link></Button><Button asChild variant="secondary"><Link href="/strategies">Open Strategies</Link></Button></div>
      <div className="relative max-w-xl"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input id="help-search" aria-label="Search help topics and field meanings" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search fields, backtesting, stops…" className="h-11 pl-11 pr-12"/>{query && <Button type="button" variant="ghost" size="icon" aria-label="Clear help search" onClick={() => setQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2"><X className="size-4"/></Button>}</div>
      <p aria-live="polite" className="text-sm text-muted-foreground">{visible.length} {visible.length === 1 ? 'topic' : 'topics'}{term ? ' matching your search' : ' to explore'}</p>
    </header>
    {visible.length ? <div className="grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Help topics" className="neu-inset p-4 lg:sticky lg:top-6"><h2 className="mb-3 font-semibold">On this page</h2><ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">{visible.map(topic => <li key={topic.id}><a href={`#${topic.id}`} aria-current={activeId === topic.id ? "location" : undefined} className={`block rounded-lg px-3 py-2 text-sm underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${activeId === topic.id ? "bg-accent font-semibold text-foreground shadow-[var(--neu-inset)]" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>{topic.title}</a></li>)}</ul></nav>
      <div className="min-w-0 max-w-4xl space-y-10">{visible.map(topic => <section key={topic.id} id={topic.id} aria-labelledby={`${topic.id}-heading`} className="scroll-mt-6 space-y-5 border-b border-border pb-10 last:border-0">
        <div><h2 id={`${topic.id}-heading`} className="text-xl font-semibold">{topic.title}</h2><p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-muted-foreground">{topic.summary}</p></div>
        {topic.paragraphs?.map(paragraph => <p key={paragraph} className="max-w-[72ch] text-sm leading-7">{paragraph}</p>)}
        {topic.steps && <ol className="max-w-[72ch] list-decimal space-y-4 pl-5 text-sm leading-7 marker:font-semibold">{topic.steps.map(step => <li key={step} className="pl-2">{step}</li>)}</ol>}
        {topic.fields && <dl className="divide-y divide-border">{topic.fields.map(field => <div key={field.name} className="grid gap-2 py-4 first:pt-0 sm:grid-cols-[minmax(140px,1fr)_minmax(0,2fr)] sm:gap-6"><dt className="text-sm font-semibold">{field.name}</dt><dd className="max-w-[72ch] text-sm leading-7 text-muted-foreground">{field.meaning}</dd></div>)}</dl>}
        {topic.questions && <div className="divide-y divide-border">{topic.questions.map(item => <details key={item.question} className="py-3"><summary className="cursor-pointer py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{item.question}</summary><p className="mt-2 max-w-[72ch] text-sm leading-7 text-muted-foreground">{item.answer}</p></details>)}</div>}
        {topic.links && <div className="flex flex-wrap gap-4">{topic.links.map(link => <Link key={link.href} href={link.href} className="text-sm font-medium underline underline-offset-4 hover:text-muted-foreground">{link.label}</Link>)}</div>}
      </section>)}</div>
    </div> : <section className="space-y-3 py-8"><h2 className="text-xl font-semibold">No matching topics</h2><p className="text-sm text-muted-foreground">Try “capital”, “stop”, “timeframe” or “backtest”.</p><Button variant="secondary" onClick={() => setQuery('')}>Show all topics</Button></section>}
  </div>;
}

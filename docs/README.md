# Meu documentation

Source review: **11 October 2026**. This is the maintained entry point. Historical audit reports are evidence from their stated dates; they do not override the current implementation.

## Start here

| Need | Guide |
|---|---|
| Understand what Meu currently does | [User guide and capability matrix](USER_GUIDE.md) |
| Understand processes and execution | [Architecture and diagrams](ARCHITECTURE.md) |
| Find a module, function or its import dependencies | [Module responsibility map](MODULES.md), [generated source/function index](reference/CODE_MAP.md) |
| Understand persistence and identifiers | [Data model and state diagrams](DATA_MODEL.md) |
| Change the code safely | [Development and maintenance](DEVELOPMENT.md) |
| Start the stack, view logs or diagnose a restart | [Containers](CONTAINERS.md), [logging](LOGGING.md) |
| Recover a retained execution | [Delta recovery](DELTA_RECOVERY.md), [reconciliation](RECONCILIATION.md) |
| Review documented strategy mechanics and release selection | [Strategy research and selection](STRATEGY_SELECTION.md) |
| Review trend, breakout and range research across the fixed ticker universe | [Multi-market algorithm research and qualification](MULTI_MARKET_RESEARCH.md) |
| Understand the internal four-hour squeeze candidate and its measured limits | [Squeeze + directional efficiency specification](SQUEEZE_RESEARCH.md) |
| Review the plan for simpler, capital-efficient automated trading | [Small-account trading audit and development plan](SMALL_ACCOUNT_TRADING_PLAN.md) |

## Feature references

- Trading: [exit management and trailing comparison](EXIT_MANAGEMENT.md), [sizing policies and low-capital limits](SIZING_POLICIES.md), [crypto guards and ownership](CRYPTO_TRADING.md), [backtesting](BACKTESTING.md), [paper/live algorithms](PAPER_TRADING.md).
- Intelligence: [providers](AI_PROVIDERS.md), [Bedrock endpoints](BEDROCK.md), [model discovery](MODEL_DISCOVERY.md), [LLM memory](LLM_MEMORY.md).
- Instruments: [CCXT and Kite market discovery](MARKET_DISCOVERY.md).
- Charts: [Meu market charts, Yahoo/exchange data and TradingView](CHARTS.md).
- Source-specific overview: [frontend](../meu_frontend/README.md), [scheduler](../meu/schedulerService/README.md), [notifications](../meu/notificationService/README.md).

## Keep these docs current

Run `make docs` after source changes. It rebuilds the static source/function index without starting services or connecting to accounts. Update the relevant curated diagrams and capability statements when runtime behavior changes. [Maintenance rules](DEVELOPMENT.md#documentation-maintenance) describe which documents belong with which change.

Mermaid diagrams are text in the Markdown files and render in Mermaid-capable Markdown viewers, including GitHub. The generated index is searchable by source path or function name. It records syntax-level calls and imports; dependency injection, provider selection, queues and database relationships need the curated diagrams as well.

## Review boundaries

The docs distinguish implemented features, supported markets and remaining work. Saved backtest results are research artifacts, not evidence of live exchange fills. Paper, historical simulation and live risk checks have different execution assumptions. Audits and regression tests are offline unless an audit explicitly records a read-only runtime check. Documentation and tests never require pasting exchange keys into a report.

- Experimental execution rules and replay evidence (local evidence, excluded from Git): versioned proposal lifecycle, simulation/live changes and measured limitations.
- Trend-aware signal policy v2 (local evidence, excluded from Git): missed-trend correction, directional-noise filters, reproducible comparisons and limits.

## Repository contents

See [repository layout and publishing policy](REPOSITORY.md). Research artifacts, personal screenshots and college submissions are retained locally and excluded from Git. Historical evidence mentioned in guides may be available only in the original workspace.

# Market discovery and ticker selection

Agent creation, the ordinary LLM/stock editor and the Strategies backtest form use the shared `TickerPicker` component. Saved crypto algorithm ticker/exchange/mode identity remains immutable in its editor. The picker is a themed Popover/Command control with keyboard navigation, a 250 ms search debounce, local loading placeholders, empty/error states and retry. Changing the exchange clears prior ticker selections.

## Server API and adapters

The authenticated `exchange.markets` query accepts an owned connection ID, asset scope and a search string of at most 80 characters. Backtests can instead request the public production Delta catalog with `venue: DELTA`; arbitrary URLs or exchange names are not accepted. The API returns at most 30 matching normalized choices and the total matching count, along with a metadata load timestamp. Search ignores case and punctuation and checks native symbols, unified symbols, names and settlement currencies; exact matches rank first. CCXT has no unified text-search endpoint, so Meu implements search over cached metadata.

Crypto discovery calls CCXT `loadMarkets()` without saved private credentials. It uses the configured India production/demo hosts for Delta and linear-futures routing for Binance. It offers only explicitly active, linear, non-inverse, non-quanto perpetuals; Delta is restricted to USD settlement and Binance to USDT. Delta choice values retain native product symbols because the algorithm/backtest path expects them; other crypto choices use CCXT unified symbols. Catalog availability does not imply execution support: current entry adapters and strategy limitations still apply. CCXT adapters that expose no supported perpetuals produce an empty picker.

Zerodha has a dedicated Kite REST adapter for `GET /instruments/NSE`. It requires the user's owned connection and a current-day access token, keeps authorization headers server-side, and parses quoted CSV fields, escaped quotes and CRLF. The instrument response is bounded to 8 MiB and 50,000 rows. Only NSE segment equities are offered, using native trading symbols, company names, lot sizes and tick sizes. Futures/options, indices and BSE listings are excluded because the current stock runner uses NSE equities. The adapter was tested with offline CSV and authentication fixtures; live Kite verification requires an owned account signed in today.

## Caching and validation

Crypto catalogs are cached per exchange/environment for five minutes. NSE metadata is shared per India calendar day, but each query still verifies connection ownership and daily Kite authentication before reading the cache. Concurrent misses for the same catalog share one load. At most four upstream catalog loads and sixteen cached catalogs are retained per frontend process. No account credentials or broker response bodies are returned to the client or stored in catalog entries.

The ordinary agent create/update APIs validate selected symbols against the server catalog and reject duplicate aliases for the same market. Crypto algorithm creation/editing and backtests keep their existing server-side Delta contract/history validation; activation and order execution still verify actual broker market and risk conditions. Browser selection is not proof of funds, permissions, affordability or safe execution. Unknown activity metadata is excluded rather than assumed tradable. Instrument lists are not live price feeds.

No schema migration or dependency installation is needed. This change does not alter running agents or restart workers.

## Verification

`meu_frontend/tests/market-catalog.test.ts` covers endpoint pinning, cache/auth boundaries, supported-market filtering, native/unified aliases, company/asset search, CSV parsing, sanitized failures and bounded results. Public Delta verification successfully loaded the live market catalog and resolved BTCUSD, ETHUSD and XRPUSD without placing orders.

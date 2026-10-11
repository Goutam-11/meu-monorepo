import ccxt, { type Exchange } from "ccxt";
export const TICK_MS = 60 * 1000;
// ccxt exchange map

export const exchangeMap = {
  BINANCE: ccxt.binance,
  BYBIT: ccxt.bybit,
  KRAKEN: ccxt.kraken,
  KUCOIN: ccxt.kucoin,
  DELTA: ccxt.delta,
};

export type ExchangeName = keyof typeof exchangeMap;

/** Pinned endpoints: DELTA means Delta India; stored/custom URLs never override these. */
export function configureCryptoExchange(exchange: Exchange, sandbox: boolean) {
  if (exchange.id === "delta") {
    exchange.urls.api = {
      public: "https://api.india.delta.exchange",
      private: "https://api.india.delta.exchange",
    };
    exchange.urls.test = {
      public: "https://cdn-ind.testnet.deltaex.org",
      private: "https://cdn-ind.testnet.deltaex.org",
    };
  } else if (exchange.id === "binance") {
    exchange.options = {
      ...exchange.options, defaultType: "future", defaultSubType: "linear",
      warnOnFetchOpenOrdersWithoutSymbol: false,
    };
  }
  if (sandbox) exchange.setSandboxMode(true);
}

export function formatSecondsToCycle(seconds: number): string {
  if (seconds % 86400 === 0) {
    return `${seconds / 86400}d`;
  }
  if (seconds % 3600 === 0) {
    return `${seconds / 3600}h`;
  }
  if (seconds % 60 === 0) {
    return `${seconds / 60}m`;
  }
  return `${seconds}s`;
}

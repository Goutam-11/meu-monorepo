import "server-only";
import prisma from "../../../lib/db";
import ccxt, { Balances, Position, Trade } from "ccxt";
import { TRPCError } from "@trpc/server";
import { getKiteDashboardData, isZerodhaExchange } from "./kite";
import { decryptSecret } from "../../../lib/security/encryption";
import { appLog } from "../../../lib/logging/app-logger";
// ccxt exchange map


export const exchangeMap = {
  BINANCE: ccxt.binance,
  BYBIT: ccxt.bybit,
  KRAKEN: ccxt.kraken,
  KUCOIN: ccxt.kucoin,
  DELTA: ccxt.delta,
};

export type ExchangeName = keyof typeof exchangeMap;

export async function getExchangeData(exchangeId: string, userId: string, requestId?: string) {
  if (!exchangeId || typeof exchangeId !== "string") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid exchange ID provided",
    });
  }

  const exchangeData = await prisma.exchange.findUnique({
    where: { id: exchangeId, userId },
  });

  if (!exchangeData) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Exchange not found with the provided ID",
    });
  }

  if (!exchangeData.apiKey || !exchangeData.secret) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Exchange API credentials are missing or invalid",
    });
  }

  const exchangeName = exchangeData.name.toUpperCase() as ExchangeName;

  // Zerodha has no ccxt adapter — served via Kite REST with the stored
  // daily access token. Returns kiteTokenExpired instead of throwing when
  // the token needs re-auth.
  if (isZerodhaExchange(exchangeData.name)) {
    return getKiteDashboardData(exchangeData.id, exchangeData.userId, requestId);
  }

  if (!exchangeMap[exchangeName]) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unsupported exchange type",
    });
  }

  const exchange = new exchangeMap[exchangeName]({
    apiKey: decryptSecret(exchangeData.apiKey),
    secret: decryptSecret(exchangeData.secret),
    timeout: 15000,
  });

  if (exchangeName === "DELTA") {
    exchange.urls.api = { public: "https://api.india.delta.exchange", private: "https://api.india.delta.exchange" };
    exchange.urls.test = { public: "https://cdn-ind.testnet.deltaex.org", private: "https://cdn-ind.testnet.deltaex.org" };
  } else if (exchangeName === "BINANCE") {
    exchange.options = { ...exchange.options, defaultType: "future", defaultSubType: "linear" };
  }

  if (exchangeData.sandbox) {
    exchange.setSandboxMode(true);
  }

  let positions: Position[] = [];
  let trades: Trade[] = [];
  let balance: Balances = { info: { free: 0,used:0,total:0}};

  let positionsError: string | null = null;
  let tradesError: string | null = null;
  let balanceError: string | null = null;
  try {
    positions = await exchange.fetchPositions();
    if (exchangeName === "DELTA") {
      positions = positions.map(position => ({
        ...position,
        contracts: Math.abs(Number(position.contracts)),
        side: Number(position.contracts) < 0 ? "short" : "long",
        unrealizedPnl: position.info?.unrealized_pnl === undefined ? position.unrealizedPnl : Number(position.info.unrealized_pnl),
      }));
    }
  } catch (err) {
    appLog("warn", "exchange.snapshot.failed", { requestId, operation: "exchange.positions", code: "BROKER_ERROR" });
    positionsError = err instanceof Error ? err.message : "Unknown error";
  }

  try {
    trades = await exchange.fetchMyTrades();
  } catch (err) {
    appLog("warn", "exchange.snapshot.failed", { requestId, operation: "exchange.trades", code: "BROKER_ERROR" });
    tradesError = err instanceof Error ? err.message : "Unknown error";
  }

  try {
    balance = await exchange.fetchBalance();
  } catch (err) {
    appLog("warn", "exchange.snapshot.failed", { requestId, operation: "exchange.balance", code: "BROKER_ERROR" });
    balanceError = err instanceof Error ? err.message : "Unknown error";
  }
  
  return {
    positions,
    trades,
    balance,
    positionsError,
    tradesError,
    balanceError,
  };
}

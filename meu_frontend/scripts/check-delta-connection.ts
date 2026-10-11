import ccxt from "../../meu/schedulerService/node_modules/ccxt/js/ccxt.js";
import { PrismaClient } from "../src/generated/prisma/client";
import { decryptSecret } from "../src/lib/encryption";
import { configureCryptoExchange } from "../../meu/schedulerService/src/config/config";
import { fetchCryptoOpenOrders, fetchDailyCryptoLoss } from "../../meu/schedulerService/src/agent/cryptoRisk";

// Read-only broker preflight. Never submits orders, alters account settings,
// starts workers or reserves daily counters. Logs no credentials or raw responses.
const prisma = new PrismaClient();
const exchangeId = process.argv.find(arg => arg.startsWith("--exchange-id="))?.split("=")[1];
const productionAllowed = process.argv.includes("--allow-production-readonly");
let stage = "configuration";
try {
  if (!exchangeId) throw new Error("An explicit exchange ID is required");
  const connection = await prisma.exchange.findUnique({ where: { id: exchangeId } });
  if (!connection || connection.name.toUpperCase() !== "DELTA") throw new Error("Delta connection required");
  if (!connection.sandbox && !productionAllowed) throw new Error("Production reads require an explicit flag");
  const agents = await prisma.agent.findMany({
    where: { exchangeId, userId: connection.userId },
    select: { status: true, capital: true, strategy: true, market: true },
  });
  console.log(JSON.stringify({ environment: connection.sandbox ? "demo" : "production", linkedAgents: agents.length,
    runningAgents: agents.filter(agent => agent.status === "RUNNING").length,
    nonUsdAllocations: agents.filter(agent => agent.capital.currency.toUpperCase() !== "USD").length }));
  const exchange = new ccxt.delta({
    apiKey: decryptSecret(connection.apiKey), secret: decryptSecret(connection.secret),
    timeout: 15000, enableRateLimit: true, verbose: false,
  });
  configureCryptoExchange(exchange, connection.sandbox);
  stage = "markets";
  await exchange.loadMarkets();
  const market = exchange.market("BTCUSD");
  console.log(JSON.stringify({ stage, success: true, symbol: market.symbol, settlement: market.settle,
    contractSize: market.contractSize, linearPerpetual: market.linear === true && market.swap === true }));
  stage = "balance";
  const balance = await exchange.fetchBalance();
  const free = balance.free as unknown as Record<string, number> | undefined;
  const total = balance.total as unknown as Record<string, number> | undefined;
  console.log(JSON.stringify({ stage, success: true, usdBalanceAvailable: Number.isFinite(free?.USD),
    ...(process.argv.includes("--show-balance") ? { freeUsd: free?.USD, totalUsd: total?.USD } : {}) }));
  stage = "positions";
  const positions = await exchange.fetchPositions();
  console.log(JSON.stringify({ stage, success: true, positionCount: positions.length }));
  stage = "pending-orders";
  const orders = await fetchCryptoOpenOrders(exchange);
  console.log(JSON.stringify({ stage, success: true, pendingCount: orders.length }));
  stage = "daily-ledger";
  const loss = await fetchDailyCryptoLoss(exchange, market);
  console.log(JSON.stringify({ stage, success: true, finiteLossAccounting: Number.isFinite(loss) }));
  stage = "trading-preferences";
  const preferences = await exchange.request("users/trading_preferences", "private", "GET", {});
  console.log(JSON.stringify({ stage, success: preferences.success === true,
    autoTopupDisabled: preferences.result?.default_auto_topup === false,
    settlementCurrencyFees: preferences.result?.deto_for_commission === false }));
} catch (error) {
  // Broker errors can contain request details. Emit only the class and a
  // validated API error code; never the message, response context or headers.
  let brokerCode: string | undefined;
  if (error instanceof Error) {
    try {
      const body = error.message.match(/\{[\s\S]*\}$/)?.[0];
      const code = body ? JSON.parse(body)?.error?.code : undefined;
      if (typeof code === "string" && /^[a-zA-Z0-9_]{1,80}$/.test(code)) brokerCode = code;
    } catch { /* A non-JSON provider response remains redacted. */ }
  }
  console.error(JSON.stringify({ stage, success: false, errorType: error instanceof Error ? error.name : "UnknownError", brokerCode }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

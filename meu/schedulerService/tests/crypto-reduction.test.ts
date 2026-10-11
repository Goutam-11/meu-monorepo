import { describe, expect, test } from "bun:test";
import type { Exchange } from "ccxt";
import { getCryptoTools } from "../src/agent/tools/cryptoTools/cryptoTools";
import type { ExecutionSafety } from "../src/agent/tradeGuard";

const policy = {
  symbols: ["BTC/USDT"],
  capital: { allocated: 1000, currency: "USDT" },
  risk: { maxRiskPerTradePct: 1, maxDailyLossPct: 5, maxOpenPositions: 2, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 },
};

function makeTools(side: "long" | "short", contracts = 2) {
  const orders: unknown[][] = [];
  const exchange = {
    market: () => ({ contract: true }),
    fetchPositions: async () => [{ symbol: "BTC/USDT", side, contracts }],
    createOrder: async (...args: unknown[]) => { orders.push(args); return { id: "reduce-1" }; },
  } as unknown as Exchange;
  const safety: ExecutionSafety = {
    agentId: "crypto-agent",
    policy,
    assertActive: async () => {},
    reserveDailyEntry: async () => {},
    executeOrder: async (_intent, execute) => execute(),
  };
  return { tool: getCryptoTools({ exchange, safety }).closePosition, orders };
}

describe("crypto reductions", () => {
  test("closes long positions with sell and short positions with buy, always reduce-only", async () => {
    for (const [positionSide, expectedOrderSide] of [["long", "sell"], ["short", "buy"]] as const) {
      const { tool, orders } = makeTools(positionSide);
      const execute = tool.execute as unknown as (input: { symbol: string; amount: number }) => Promise<{ success: boolean }>;
      const result = await execute({ symbol: "BTC/USDT", amount: 1 });
      expect(result.success).toBe(true);
      expect(orders).toHaveLength(1);
      expect(orders[0]?.[2]).toBe(expectedOrderSide);
      expect(orders[0]?.[5]).toEqual({ reduceOnly: true });
    }
  });

  test("rejects amounts above the current position and symbols outside policy", async () => {
    const { tool, orders } = makeTools("long", 1);
    const execute = tool.execute as unknown as (input: { symbol: string; amount: number }) => Promise<{ success: boolean }>;
    const excess = await execute({ symbol: "BTC/USDT", amount: 2 });
    const foreign = await execute({ symbol: "ETH/USDT", amount: 1 });
    expect(excess.success).toBe(false);
    expect(foreign.success).toBe(false);
    expect(orders).toHaveLength(0);
  });
});

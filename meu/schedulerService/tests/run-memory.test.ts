import { describe, expect, test } from "bun:test";
import { buildRunMemory, formatRunMemory, memoryContext, operationReceipt } from "../src/agents/llm/runMemory";

const decision = { action: "held" as const, symbols: ["XRPUSD"], rationale: "No confirmed breakout.", watchFor: "Hourly close above the channel.", nextReview: "Recheck positions on the next cycle." };
const output = (data: unknown = decision) => `Analysis ${"x".repeat(4000)}\n<MEU_MEMORY>${JSON.stringify(data)}</MEU_MEMORY>`;

describe("LLM decision memory", () => {
  test("keeps the validated summary at the end of a long response without copying leading analysis", () => {
    const memory = buildRunMemory(output(), []);
    expect(memory.summary).toEqual(decision);
    expect(memory.fallback).toBeNull();
    expect(formatRunMemory({ createdAt: new Date(0), memory })).toContain("1970-01-01T00:00:00.000Z");
    expect(JSON.stringify(memory)).not.toContain("xxxx");
  });

  test("malformed, ambiguous and oversized summaries fall back without throwing", () => {
    for (const response of ["<MEU_MEMORY>{broken}</MEU_MEMORY>", output({ ...decision, action: "filled" }), output({ ...decision, rationale: "x".repeat(401) }), output() + output()]) {
      const memory = buildRunMemory(response, []);
      expect(memory.summary).toBeNull();
      expect(memory.fallback!.length).toBeLessThanOrEqual(1200);
      expect(formatRunMemory({ memory })).toContain("unverifiedOutputExcerpt");
    }
  });

  test("legacy fallback preserves final RUN_SUMMARY rather than the beginning", () => {
    const memory = buildRunMemory(`Leading analysis ${"x".repeat(3000)}\nRUN_SUMMARY:\nHeld XRPUSD; await confirmation.`, []);
    expect(memory.fallback).toBe("RUN_SUMMARY:\nHeld XRPUSD; await confirmation.");
  });

  test("receipts are distinct from claims, bounded and exclude arbitrary intent fields", () => {
    const receipt = operationReceipt({ symbol: "XRPUSD", action: "crypto-entry", apiKey: "SECRET", result: "RAW" }, "REFUSED");
    const receipts = Array.from({ length: 20 }, () => receipt);
    const memory = buildRunMemory(output({ ...decision, action: "opened" }), receipts);
    expect(memory.summary!.action).toBe("opened");
    expect(memory.confirmedCount).toBe(0);
    expect(memory.refusedCount).toBe(20);
    expect(memory.operationCount).toBe(20);
    expect(memory.operations).toHaveLength(12);
    expect(JSON.stringify(memory)).not.toContain("SECRET");
    expect(formatRunMemory({ memory })).toContain("not that an order filled");
  });

  test("configuration changes isolate memory while names and lifecycle timestamps preserve it", () => {
    const agent = { exchangeId: "exchange", credentialId: "credential", strategy: "LLM_TRADING", market: { symbols: ["XRPUSD", "BTCUSD"], agentCycles: 900 }, capital: { allocated: 10, currency: "USD" }, risk: { maxTradesPerDay: 1 } };
    const exchange = { name: "DELTA", sandbox: false };
    const context = memoryContext(agent, exchange);
    expect(memoryContext({ ...agent, name: "renamed", updatedAt: new Date(), status: "PAUSED" }, exchange)).toBe(context);
    expect(memoryContext({ ...agent, market: { ...agent.market, symbols: ["BTCUSD", "XRPUSD"] } }, exchange)).toBe(context);
    for (const changed of [{ capital: { allocated: 20 } }, { executionMode: "PAPER" }, { llmModel: "another" }, { risk: { maxTradesPerDay: 2 } }, { market: { symbols: ["ETHUSD"], agentCycles: 900 } }]) {
      expect(memoryContext({ ...agent, ...changed }, exchange)).not.toBe(context);
    }
    expect(memoryContext(agent, { ...exchange, sandbox: true })).not.toBe(context);
  });
});

import { describe, test, expect } from "bun:test";
import { assertOrderAllowed, sizeLongPosition } from "../src/agent/tradeGuard";
import { encryptSecret, decryptSecret } from "../src/config/encryption";

const policy = { symbols: ["INFY"], capital: { allocated: 10000, currency: "INR" },
  risk: { maxRiskPerTradePct: 1, maxDailyLossPct: 5, maxOpenPositions: 3, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 } };
const snapshot = { dailyPnl: 0, exposure: 200, openPositions: 1, availableFunds: 5000 };
describe("order boundaries", () => {
  test("allows bounded order and blocks foreign symbol, excess risk, loss, exposure and unavailable state", () => {
    expect(() => assertOrderAllowed(policy, "INFY", 100, snapshot)).not.toThrow();
    expect(() => assertOrderAllowed(policy, "TCS", 100, snapshot)).toThrow("scope");
    expect(() => assertOrderAllowed(policy, "INFY", 101, snapshot)).toThrow("Per-trade");
    expect(() => assertOrderAllowed(policy, "INFY", 100, { ...snapshot, dailyPnl: -450 })).toThrow("Daily");
    expect(() => assertOrderAllowed(policy, "INFY", 100, { ...snapshot, exposure: 9950 })).toThrow("capital");
    expect(() => assertOrderAllowed(policy, "INFY", 100, { ...snapshot, openPositions: 3 })).toThrow("positions");
    expect(() => assertOrderAllowed(policy, "INFY", 100, { ...snapshot, availableFunds: 99 })).toThrow("funds");
    expect(() => assertOrderAllowed(policy, "INFY", 100, { ...snapshot, dailyPnl: NaN })).toThrow("snapshot");
  });

  test("sizes a long entry within risk, capital, funds and remaining daily-loss budgets", () => {
    expect(sizeLongPosition({ allocated: 10_000, maxRiskPerTradePct: 1, exposure: 0, availableFunds: 1_000, remainingDailyLoss: 300, price: 60 }))
      .toEqual({ quantity: 1, notional: 60, budget: 100 });
    expect(sizeLongPosition({ allocated: 10_000, maxRiskPerTradePct: 10, exposure: 9_000, availableFunds: 1_000, remainingDailyLoss: 1_000, price: 100 }))
      .toEqual({ quantity: 10, notional: 1_000, budget: 1_000 });
    expect(() => sizeLongPosition({ allocated: 10_000, maxRiskPerTradePct: 1, exposure: 0, availableFunds: 1_000, remainingDailyLoss: 0, price: 50 }))
      .toThrow("too small");
  });
});
test("authenticated encryption roundtrip, randomized ciphertext, tamper detection, legacy migration", () => {
  const old = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = "ab".repeat(32);
  try {
    const encrypted = encryptSecret("fake-key");
    expect(encrypted).toStartWith("meu:v1:");
    expect(encrypted).not.toBe(encryptSecret("fake-key"));
    expect(decryptSecret(encrypted)).toBe("fake-key");
    const parts = encrypted.split(":");
    parts[3] = Buffer.alloc(16).toString("base64url");
    expect(() => decryptSecret(parts.join(":"))).toThrow();
    expect(decryptSecret("legacy-fake-key")).toBe("legacy-fake-key");
    process.env.ENCRYPTION_KEY = "bad";
    expect(() => encryptSecret("anything")).toThrow("ENCRYPTION_KEY");
  } finally { if (old === undefined) delete process.env.ENCRYPTION_KEY; else process.env.ENCRYPTION_KEY = old; }
});

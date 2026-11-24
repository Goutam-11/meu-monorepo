import { describe, expect, test } from "bun:test";
import { contractDrift, reviewIsSafe, staleClaimIsSafe } from "../src/reconciler/policy";

const saved = { symbol: "BTCUSD", contractSize: 0.001, minContracts: 1, maintenanceMarginRate: 0.005, settlement: "USD" as const };

describe("reconciler safety policy", () => {
  test("a review with no broker operation and no order intent can resolve automatically", () => {
    expect(reviewIsSafe({ brokerOperationRequested: false }, 0)).toEqual({ safe: true, reason: "no broker operation was requested" });
  });

  test("a review that may have reached a venue stays manual", () => {
    expect(reviewIsSafe({ brokerOperationRequested: true }, 0)).toMatchObject({ safe: false });
    expect(reviewIsSafe({}, 0)).toMatchObject({ safe: false });
    expect(reviewIsSafe({ brokerOperationRequested: false }, 1)).toMatchObject({ safe: false });
  });

  test("a stale claim is safe only without an order intent", () => {
    expect(staleClaimIsSafe(0)).toBe(true);
    expect(staleClaimIsSafe(1)).toBe(false);
  });

  test("contract drift names every changed field", () => {
    expect(contractDrift(saved, { ...saved, contractSize: 0.002, maintenanceMarginRate: 0.01 })).toEqual(["contractSize", "maintenanceMarginRate"]);
    expect(contractDrift(saved, { ...saved })).toEqual([]);
  });
});

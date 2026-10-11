import { expect, test } from "bun:test";
import { isIndianMarketOpen, nextMarketOpen } from "../src/lib/marketHours";

test("equity calendar uses trading holidays and fails closed beyond verified years", () => {
  expect(isIndianMarketOpen(new Date("2026-04-01T10:00:00+05:30"))).toBe(true);
  expect(isIndianMarketOpen(new Date("2026-10-20T10:00:00+05:30"))).toBe(false);
  expect(nextMarketOpen(new Date("2026-10-20T10:00:00+05:30"))?.toISOString()).toBe("2026-10-21T03:45:00.000Z");
  expect(isIndianMarketOpen(new Date("2027-01-04T10:00:00+05:30"))).toBe(false);
  expect(nextMarketOpen(new Date("2027-01-04T10:00:00+05:30"))).toBeNull();
});

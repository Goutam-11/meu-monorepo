import { describe, expect, test } from "bun:test";
import ccxt, { type MarketInterface, type Position } from "ccxt";
import { prepareDeltaStrategyAccount } from "../src/agent/deltaStart";
import { fetchCryptoLeverage } from "../src/agent/cryptoRisk";
import { OrderRejectedError } from "../src/agent/tradeGuard";

function fixture() {
  const exchange = new ccxt.delta();
  const symbol = "BTC/USD:USD";
  const market = { id: "BTCUSD", numericId: 27, symbol, base: "BTC", quote: "USD", settle: "USD", type: "swap", contract: true, swap: true, spot: false, linear: true, inverse: false, active: true, contractSize: 0.001, precision: { amount: 1, price: 0.5 }, limits: { amount: { min: 1, max: 1000 }, cost: { min: 0 } }, info: {} } as unknown as MarketInterface;
  exchange.setMarkets([market]);
  exchange.options.marketsByNumericId = { "27": market };
  let mode = "cross";
  let leverage = 2;
  let preferenceOkay = true;
  let positions: Position[] = [];
  let orders: Record<string, unknown>[] = [];
  let badMarginAck = false;
  let badLeverageAck = false;
  let mismatchModeReadback = false;
  let mismatchLeverageReadback = false;
  const calls: Array<{ path: string; method: string; params: Record<string, unknown> }> = [];
  exchange.request = async (path: string, _api: unknown, method: unknown, params: Record<string, unknown>) => {
    calls.push({ path, method: String(method), params });
    if (path === "orders") return { success: true, result: orders, meta: { after: null } };
    if (path === "users/trading_preferences") return { success: true, result: { default_auto_topup: false, deto_for_commission: preferenceOkay ? false : true } };
    if (path === "users/margin_mode" && method === "PUT") {
      if (!badMarginAck) mode = "isolated";
      return { success: !badMarginAck, result: { margin_mode: badMarginAck ? "cross" : "isolated" } };
    }
    throw new Error(`Unexpected request ${path}`);
  };
  exchange.fetchPositions = async () => positions;
  exchange.fetchMarginMode = async () => ({ symbol, marginMode: mismatchModeReadback && mode === "isolated" ? "cross" : mode, info: { id: 123456 } });
  exchange.fetchLeverage = async () => ({ symbol, marginMode: mode, longLeverage: mismatchLeverageReadback ? leverage + 1 : leverage, shortLeverage: mismatchLeverageReadback ? leverage + 1 : leverage, info: {} });
  exchange.setLeverage = async (value: number) => {
    calls.push({ path: "orders/leverage", method: "POST", params: { leverage: value } });
    if (!badLeverageAck) leverage = value;
    return { success: !badLeverageAck, result: {} };
  };
  return {
    exchange, symbol, calls,
    setMode: (value: string) => { mode = value; }, setLeverage: (value: number) => { leverage = value; },
    setPreferences: (value: boolean) => { preferenceOkay = value; }, setPositions: (value: Position[]) => { positions = value; },
    setOrders: (value: Record<string, unknown>[]) => { orders = value; }, setBadMarginAck: () => { badMarginAck = true; },
    setBadLeverageAck: () => { badLeverageAck = true; }, setModeMismatch: () => { mismatchModeReadback = true; },
    setLeverageMismatch: () => { mismatchLeverageReadback = true; },
  };
}

const prepare = (state: ReturnType<typeof fixture>, allowAccountModeChange = true) => prepareDeltaStrategyAccount(
  state.exchange, state.symbol, 5, { allowAccountModeChange, requireFlatSymbol: true },
);
const position = (symbol: string): Position => ({ symbol, contracts: 1, info: { size: "1" } } as unknown as Position);

describe("Delta live start configuration", () => {
  test("sets account margin mode and saved leverage, then verifies both", async () => {
    const state = fixture();
    await expect(prepare(state)).resolves.toEqual({ marginMode: "isolated", leverage: 5, changedMarginMode: true, changedLeverage: true });
    expect(state.calls.filter(call => call.method === "PUT")).toEqual([{ path: "users/margin_mode", method: "PUT", params: { margin_mode: "isolated", subaccount_user_id: "123456" } }]);
    expect(state.calls.some(call => call.path === "orders/leverage" || call.path === "users/margin_mode")).toBe(true);
  });

  test("does not write when isolated margin and leverage already match", async () => {
    const state = fixture(); state.setMode("isolated"); state.setLeverage(5);
    await expect(prepare(state)).resolves.toEqual({ marginMode: "isolated", leverage: 5, changedMarginMode: false, changedLeverage: false });
    expect(state.calls.some(call => call.method === "PUT" || call.method === "POST")).toBe(false);
  });

  test("blocks account-wide margin changes while any position or order exists", async () => {
    for (const setup of [
      (s: ReturnType<typeof fixture>) => s.setPositions([position("ETH/USD:USD")]),
      (s: ReturnType<typeof fixture>) => s.setOrders([{ symbol: "ETH/USD:USD" }]),
    ]) {
      const state = fixture(); setup(state);
      await expect(prepare(state)).rejects.toBeInstanceOf(OrderRejectedError);
      expect(state.calls.some(call => call.method === "PUT")).toBe(false);
    }
  });

  test("blocks leverage changes while the target symbol has a position or order", async () => {
    for (const setup of [
      (s: ReturnType<typeof fixture>) => s.setPositions([position("BTC/USD:USD")]),
      (s: ReturnType<typeof fixture>) => s.setOrders([{ symbol: "BTC/USD:USD" }]),
    ]) {
      const state = fixture(); state.setMode("isolated"); setup(state);
      await expect(prepare(state)).rejects.toBeInstanceOf(OrderRejectedError);
      expect(state.calls.some(call => call.path === "orders/leverage")).toBe(false);
    }
  });

  test("resume preserves matching leverage with exposure but refuses to change it", async () => {
    const state = fixture(); state.setMode("isolated"); state.setLeverage(5);
    state.setPositions([position(state.symbol)]);
    await expect(prepareDeltaStrategyAccount(state.exchange, state.symbol, 5, { allowAccountModeChange: true, requireFlatSymbol: false })).resolves.toMatchObject({ changedLeverage: false });
    state.setLeverage(2);
    await expect(prepareDeltaStrategyAccount(state.exchange, state.symbol, 5, { allowAccountModeChange: true, requireFlatSymbol: false })).rejects.toBeInstanceOf(OrderRejectedError);
    expect(state.calls.some(call => call.method === "POST")).toBe(false);
  });

  test("unknown account identity refuses margin-mode updates", async () => {
    const state = fixture();
    state.exchange.fetchMarginMode = async () => ({ symbol: state.symbol, marginMode: "cross", info: {} });
    await expect(prepare(state)).rejects.toBeInstanceOf(OrderRejectedError);
    expect(state.calls.some(call => call.method === "PUT")).toBe(false);
  });

  test("fresh exposure check prevents a stale snapshot from authorizing a write", async () => {
    const state = fixture();
    let reads = 0;
    state.exchange.fetchPositions = async () => ++reads === 1 ? [] : [position(state.symbol)];
    await expect(prepare(state)).rejects.toBeInstanceOf(OrderRejectedError);
    expect(state.calls.some(call => call.method === "PUT" || call.method === "POST")).toBe(false);
  });

  test("requires user-authorized account mode changes and safe Delta preferences", async () => {
    const cross = fixture();
    await expect(prepare(cross, false)).rejects.toBeInstanceOf(OrderRejectedError);
    expect(cross.calls.some(call => call.method === "PUT")).toBe(false);
    const prefs = fixture(); prefs.setPreferences(false);
    await expect(prepare(prefs)).rejects.toBeInstanceOf(OrderRejectedError);
    expect(prefs.calls.some(call => call.method === "PUT")).toBe(false);
  });

  test("rejects failed acknowledgements and mismatched readbacks", async () => {
    const marginAck = fixture(); marginAck.setBadMarginAck();
    await expect(prepare(marginAck)).rejects.toBeInstanceOf(OrderRejectedError);
    const leverageAck = fixture(); leverageAck.setMode("isolated"); leverageAck.setBadLeverageAck();
    await expect(prepare(leverageAck)).rejects.toBeInstanceOf(OrderRejectedError);
    const modeReadback = fixture(); modeReadback.setModeMismatch();
    await expect(prepare(modeReadback)).rejects.toBeInstanceOf(OrderRejectedError);
    const leverageReadback = fixture(); leverageReadback.setMode("isolated"); leverageReadback.setLeverageMismatch();
    await expect(prepare(leverageReadback)).rejects.toBeInstanceOf(OrderRejectedError);
  });

  test("uses Delta profile margin mode when leverage response omits it and preserves cross mode", async () => {
    const state = fixture();
    state.exchange.fetchLeverage = async () => ({ symbol: state.symbol, marginMode: undefined, longLeverage: 5, shortLeverage: 5, info: {} });
    state.exchange.fetchMarginMode = async () => ({ symbol: state.symbol, marginMode: "isolated", info: {} });
    await expect(fetchCryptoLeverage(state.exchange, state.symbol)).resolves.toMatchObject({ marginMode: "isolated", longLeverage: 5 });
    state.exchange.fetchMarginMode = async () => ({ symbol: state.symbol, marginMode: "cross", info: {} });
    await expect(fetchCryptoLeverage(state.exchange, state.symbol)).resolves.toMatchObject({ marginMode: "cross" });
  });
});

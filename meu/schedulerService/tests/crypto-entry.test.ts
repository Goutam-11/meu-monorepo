import { describe, expect, test } from "bun:test";
import ccxt, { type Balances, type MarketInterface, type Order, type Position } from "ccxt";
import { configureCryptoExchange } from "../src/config/config";
import { cryptoDayStart, fetchDailyCryptoLoss, cryptoEntrySnapshot, previewAutomaticCryptoLeverage } from "../src/brokers/crypto/cryptoRisk";
import { getCryptoTools } from "../src/execution/crypto/cryptoTools";
import { OrderRejectedError, type ExecutionSafety, type TradingPolicy } from "../src/execution/tradeGuard";

function fixture(id: "delta" | "binance" = "delta") {
  const exchange = id === "delta" ? new ccxt.delta() : new ccxt.binance();
  const currency = id === "delta" ? "USD" : "USDT";
  const symbol = `BTC/${currency}:${currency}`;
  const market = {
    id: id === "delta" ? "BTCUSD" : "BTCUSDT", numericId: 27, symbol, base: "BTC", quote: currency, settle: currency,
    type: "swap", contract: true, swap: true, spot: false, linear: true, inverse: false, active: true,
    contractSize: id === "delta" ? 0.001 : 1, taker: 0.0005, maker: 0.0002,
    precision: { amount: id === "delta" ? 1 : 0.001, price: 0.5 },
    limits: { amount: { min: id === "delta" ? 1 : 0.001, max: 10000 }, cost: { min: 0 } },
    info: { settling_asset: { id: 14 }, taker_commission_rate: "0.0005", maintenance_margin: "0.25", initial_margin: "0.5", max_leverage_notional: "100000", initial_margin_scaling_factor: "0.0000025", maintenance_margin_scaling_factor: "0.00000125" },
  } as unknown as MarketInterface;
  exchange.setMarkets([market]);
  exchange.options.marketsByNumericId = { "27": market };
  const placed: unknown[][] = [];
  const reservations: Array<{ symbol: string; opensPosition: boolean }> = [];
  const failures: unknown[] = [];
  const requests: Array<{ path: string; params: Record<string, unknown> }> = [];
  const positions: Position[] = [];
  const pending: Record<string, unknown>[] = [];
  const transactions: Record<string, unknown>[] = [];
  let automaticTopup = false;
  let isolated = true;
  let free: number | undefined = 1000;
  const policy: TradingPolicy = {
    symbols: [id === "delta" ? "BTCUSD" : symbol], capital: { allocated: 10000, currency },
    risk: { maxRiskPerTradePct: 5, maxDailyLossPct: 10, maxOpenPositions: 2, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 },
  };
  exchange.request = async (path: string, _api: unknown, _method: unknown, params: Record<string, unknown>) => {
    requests.push({ path, params });
    if (path === "orders") return { success: true, result: pending, meta: { after: null } };
    if (path === "wallet/transactions") return { success: true, result: transactions, meta: { after: null } };
    if (path === "users/trading_preferences") return { success: true, result: { default_auto_topup: automaticTopup, deto_for_commission: false } };
    throw new Error(`Unexpected request ${path}`);
  };
  exchange.fetchBalance = async () => ({ free: { [currency]: free }, info: { multiAssetsMargin: false } }) as unknown as Balances;
  exchange.fetchPositions = async () => positions;
  exchange.fetchLeverage = async () => ({ info: {}, symbol, marginMode: isolated ? "isolated" : "cross", longLeverage: 5, shortLeverage: 5 });
  exchange.fetchLeverages=async symbols=>Object.fromEntries((symbols??[symbol]).map(s=>[s,{info:{},symbol:s,marginMode:isolated?"isolated":"cross",longLeverage:5,shortLeverage:5}]));
  exchange.fetchMarketLeverageTiers=async()=>[{minNotional:0,maxNotional:100000,maintenanceMarginRate:0.005,maxLeverage:20,info:{}}];
  exchange.fetchPositionMode = async () => ({ hedged: false });
  exchange.fetchLedger = async () => [];
  exchange.fetchOpenOrders = async () => [];
  exchange.fetchTicker = async () => ({ symbol, bid: 99999.5, ask: 100000.5, last: 100000, markPrice: 100000 }) as never;
  exchange.createOrder = async (...args) => { placed.push(args); return { id: "entry-1", symbol, info: args[5] } as Order; };
  const safety: ExecutionSafety = {
    agentId: "delta-agent", policy, assertActive: async () => {},
    reserveDailyEntry: async (symbol, opensPosition) => { reservations.push({ symbol, opensPosition }); },
    executeOrder: async (_intent, execute) => {
      try { return await execute(); } catch (error) { failures.push(error); throw error; }
    },
  };
  const tools = getCryptoTools({ exchange, safety });
  type Input = { symbol: string; side: "buy" | "sell"; amount?: number; price?: number; stop_loss?: number; take_profit?: number };
  const enter = (input: Partial<Input> = {}) => (tools.createBuyOrder.execute as unknown as (i: Input) => Promise<{ success: boolean; error?: string; data?: { sizing: { amount: number; notional: number } } }>)({
    symbol: policy.symbols[0]!, side: "buy", price: 100000, ...(id === "delta" ? { stop_loss: 0.01, take_profit: 0.02 } : {}), ...input,
  });
  return { exchange, market, placed, reservations, failures, requests, positions, pending, transactions, policy, safety, tools, enter,
    setAutoTopup: (value: boolean) => { automaticTopup = value; }, setIsolated: (value: boolean) => { isolated = value; }, setFree: (value: number | undefined) => { free = value; } };
}

describe("guarded Delta India entries", () => {
  test("opens bounded longs and shorts in whole contracts with native directional brackets", async () => {
    for (const side of ["buy", "sell"] as const) {
      const state = fixture();
      const result = await state.enter({ side });
      expect(result.success).toBe(true);
      expect(result.data?.sizing.amount).toBe(4);
      expect(result.data?.sizing.notional).toBe(400);
      expect(state.placed[0]?.slice(0, 5)).toEqual(["BTC/USD:USD", "limit", side, 4, 100000]);
      expect(state.placed[0]?.[5]).toMatchObject({ post_only: true, bracket_stop_trigger_method: "mark_price",
        bracket_stop_loss_price: side === "buy" ? "99000" : "101000",
        bracket_take_profit_price: side === "buy" ? "102000" : "98000" });
      expect(state.reservations).toEqual([{ symbol: "BTC/USD:USD", opensPosition: true }]);
      expect(String((state.placed[0]?.[5] as Record<string, unknown>).clientOrderId).length).toBeLessThanOrEqual(32);
    }
  });

  test("refuses excessive size, foreign scope, wrong currency, missing stop, cross margin, top-up and missing funds", async () => {
    const cases = [
      { setup: (s: ReturnType<typeof fixture>) => {}, input: { amount: 5 } },
      { setup: (s: ReturnType<typeof fixture>) => { s.policy.symbols = []; }, input: {} },
      { setup: (s: ReturnType<typeof fixture>) => { s.policy.capital.currency = "INR"; }, input: {} },
      { setup: (s: ReturnType<typeof fixture>) => {}, input: { stop_loss: undefined } },
      { setup: (s: ReturnType<typeof fixture>) => { s.setIsolated(false); }, input: {} },
      { setup: (s: ReturnType<typeof fixture>) => { s.setAutoTopup(true); }, input: {} },
      { setup: (s: ReturnType<typeof fixture>) => { s.setFree(undefined); }, input: {} },
    ];
    for (const entry of cases) {
      const state = fixture(); entry.setup(state);
      expect((await state.enter({ symbol: "BTCUSD", ...entry.input })).success).toBe(false);
      expect(state.placed).toHaveLength(0);
      expect(state.reservations).toHaveLength(0);
    }
  });

  test("counts realized losses, fees and funding without offsetting them with winning trades or deposits", async () => {
    const state = fixture();
    const amounts = [-490, -5, -5, 10000, -2000];
    const types = ["pnl", "commission", "funding", "pnl", "withdrawal"];
    amounts.forEach((amount, i) => state.transactions.push({ id: i + 1, asset_id: 14, amount: String(amount), transaction_type: types[i], created_at: new Date().toISOString() }));
    state.policy.risk.maxDailyLossPct = 5;
    expect((await state.enter()).success).toBe(false);
    expect(state.placed).toHaveLength(0);
    const ledgerRequest = state.requests.find(request => request.path === "wallet/transactions")!;
    expect(ledgerRequest.params.start_time).toBe(cryptoDayStart("delta") * 1000);
    expect(ledgerRequest.params.asset_ids).toBe("14");
  });

  test("accounts for pending entry notional and does not count same-symbol additions as new positions", async () => {
    const state = fixture();
    state.policy.risk.maxDailyLossPct = 5;
    state.pending.push({ id: 12, product_id: 27, size: 2, unfilled_size: 2, side: "buy", order_type: "limit_order", limit_price: "100000", state: "open", reduce_only: false });
    const result = await state.enter();
    expect(result.success).toBe(true);
    expect(result.data?.sizing.amount).toBe(2);
    expect(state.reservations[0]?.opensPosition).toBe(false);
  });

  test("rejects an incomplete snapshot and keeps the reservation when the broker response is lost", async () => {
    const readFailure = fixture();
    readFailure.exchange.fetchBalance = async () => { throw new Error("balance timed out"); };
    expect((await readFailure.enter()).success).toBe(false);
    expect(readFailure.failures[0]).toBeInstanceOf(OrderRejectedError);
    expect(readFailure.placed).toHaveLength(0);
    const uncertain = fixture();
    uncertain.exchange.createOrder = async () => { throw new Error("response lost after acceptance"); };
    expect((await uncertain.enter()).success).toBe(false);
    expect(uncertain.reservations).toHaveLength(1);
    expect(uncertain.failures[0]).not.toBeInstanceOf(OrderRejectedError);
  });

  test("a reached daily cap blocks the broker call", async () => {
    const state = fixture();
    state.safety.reserveDailyEntry = async () => { throw new OrderRejectedError("daily cap reached"); };
    expect((await state.enter()).error).toContain("daily cap reached");
    expect(state.placed).toHaveLength(0);
  });

  test("normalizes Delta signed shorts and closes with a reduce-only BUY", async () => {
    const state = fixture();
    state.positions.push({ symbol: "BTC/USD:USD", contracts: -2, side: "sell", info: { size: -2 } } as Position);
    const result = await (state.tools.closePosition.execute as unknown as (i: { symbol: string; amount: number }) => Promise<{ success: boolean }>)({ symbol: "BTCUSD", amount: 2 });
    expect(result.success).toBe(true);
    expect(state.placed[0]?.[2]).toBe("buy");
    expect(state.placed[0]?.[5]).toEqual({ reduceOnly: true });
  });

  test("rejects opposite entries and includes isolated collateral and auto-top-up in account checks", async () => {
    for (const change of ["opposite", "collateral", "topup"] as const) {
      const state = fixture();
      state.policy.risk.maxDailyLossPct = 5;
      state.positions.push({ symbol: "BTC/USD:USD", contracts: 2, entryPrice: 100000, info: {
        size: change === "opposite" ? -2 : 2, margin_mode: "isolated", auto_topup: change === "topup",
        mark_price: "100000", margin: change === "collateral" ? "600" : "40",
      } } as Position);
      expect((await state.enter()).success).toBe(false);
      expect(state.placed).toHaveLength(0);
    }
  });

  test("follows Delta ledger cursors and refuses repeated cursors rather than trading on partial PnL", async () => {
    const state = fixture();
    const now = Date.now();
    const calls: unknown[] = [];
    state.exchange.request = async (_path: string, _api: unknown, _method: unknown, params: Record<string, unknown>) => {
      const after = (params as Record<string, unknown>).after;
      calls.push(after);
      return { success: true, result: [{ id: after ? 2 : 1, asset_id: 14, amount: after ? "-2" : "-5", transaction_type: "pnl", created_at: new Date(now).toISOString() }], meta: { after: after ? null : "next" } };
    };
    expect(await fetchDailyCryptoLoss(state.exchange, state.market, now)).toBe(7);
    expect(calls).toEqual([undefined, "next"]);
    state.exchange.request = async () => ({ success: true, result: [{ id: 1, asset_id: 14, amount: "0", transaction_type: "pnl", created_at: new Date(now).toISOString() }], meta: { after: "repeated" } });
    await expect(fetchDailyCryptoLoss(state.exchange, state.market, now)).rejects.toThrow("pagination");
  });

  test("distinguishes explicit broker refusal from accepted orders missing bracket confirmation", async () => {
    const refused = fixture();
    refused.exchange.createOrder = async () => { throw new ccxt.InvalidOrder("post-only order would take liquidity"); };
    expect((await refused.enter()).success).toBe(false);
    expect(refused.failures[0]).toBeInstanceOf(OrderRejectedError);
    const unprotected = fixture();
    unprotected.exchange.createOrder = async () => ({ id: "accepted", info: {} }) as Order;
    expect((await unprotected.enter()).error).toContain("did not confirm its stop-loss bracket");
    expect(unprotected.failures[0]).not.toBeInstanceOf(OrderRejectedError);
    expect(unprotected.reservations).toHaveLength(1);
  });
});

describe("Binance USD-M entries and complete ledgers", () => {
  test("sizes fractional contracts and checks both regular and conditional open orders", async () => {
    const state = fixture("binance");
    const calls: unknown[] = [];
    state.exchange.fetchOpenOrders = async (_symbol, _since, _limit, params) => { calls.push(params); return []; };
    expect((await state.enter()).success).toBe(true);
    expect(state.placed[0]?.[3]).toBe(0.004);
    expect(state.placed[0]?.[5]).toMatchObject({ postOnly: true });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ trigger: true });
    expect((await state.enter({ stop_loss: 0.01 })).success).toBe(false);
  });

  test("paginates income history and includes funding/fees rather than using a truncated recent trade list", async () => {
    const state = fixture("binance");
    const pages: unknown[] = [];
    const now = Date.now();
    state.exchange.fetchLedger = async (_currency, _since, _limit, params) => {
      const page = (params as Record<string, unknown>)?.page;
      pages.push(page);
      return page === 1
        ? Array.from({ length: 1000 }, (_, i) => ({ id: String(i + 1), timestamp: now, type: "trade", direction: "in", currency: "USDT", amount: 1, info: { incomeType: "REALIZED_PNL" } }))
        : [{ id: "funding", timestamp: now, type: "fee", direction: "out", currency: "USDT", amount: 7, info: { incomeType: "FUNDING_FEE" } }];
    };
    expect(await fetchDailyCryptoLoss(state.exchange, state.market, now)).toBe(7);
    expect(pages).toEqual([1, 2]);
  });

  test("pins Delta India production/demo hosts and Binance linear futures routing", () => {
    const delta = new ccxt.delta();
    configureCryptoExchange(delta, false);
    expect(delta.urls.api).toEqual({ public: "https://api.india.delta.exchange", private: "https://api.india.delta.exchange" });
    const demo = new ccxt.delta();
    configureCryptoExchange(demo, true);
    expect(demo.urls.api).toEqual({ public: "https://cdn-ind.testnet.deltaex.org", private: "https://cdn-ind.testnet.deltaex.org" });
    const binance = new ccxt.binance();
    configureCryptoExchange(binance, false);
    expect(binance.options.defaultType).toBe("future");
    expect(binance.options.defaultSubType).toBe("linear");
  });

  test("daily income windows use India midnight for Delta and UTC midnight for Binance", () => {
    const now = Date.parse("2026-10-01T18:31:00Z");
    expect(cryptoDayStart("delta", now)).toBe(Date.parse("2026-10-01T18:30:00Z"));
    expect(cryptoDayStart("binance", now)).toBe(Date.parse("2026-10-01T00:00:00Z"));
  });
});

function enableFutures(state: ReturnType<typeof fixture>) {
  state.policy.futures = { leverage: 5, maxMarginPct: 25, maxNotional: state.policy.capital.allocated * 5,
    maintenanceMarginRate: 0.0025, feeBps: 5, slippageBps: 2 };
}

describe('protected Delta futures sizing', () => {
  test('small allocation uses isolated leverage and risk at stop rather than full notional', async () => {
    const s=fixture(); s.policy.capital.allocated=25; s.policy.risk.maxRiskPerTradePct=1;
    s.setFree(0.8); enableFutures(s);
    const result=await s.enter({price:2000,amount:1});
    expect(result.success).toBe(true);
    expect(result.data?.sizing.notional).toBe(2);
    expect(result.data?.sizing.notional).toBeGreaterThan(25*0.01);
    expect(s.placed).toHaveLength(1);
    // The same free balance cannot afford that contract at 1x.
    const unleveraged=fixture(); unleveraged.policy.capital.allocated=25; enableFutures(unleveraged);
    unleveraged.policy.futures!.leverage=1; unleveraged.policy.futures!.maxNotional=25; unleveraged.setFree(0.8);
    unleveraged.exchange.fetchLeverage=async()=>({symbol:'BTC/USD:USD',info:{},marginMode:'isolated',longLeverage:1,shortLeverage:1});
    expect((await unleveraged.enter({price:2000,amount:1})).success).toBe(false);
    expect(unleveraged.placed).toHaveLength(0);
  });
  test('preview requires a native stop and rounds the same price as the submitted bracket', async () => {
    const s=fixture(); enableFutures(s);
    const preview=s.tools.calculatePositionSize.execute as unknown as (input: Record<string,unknown>)=>Promise<{success:boolean;data?:{amount:number;price:number;riskAtStop:number;marginRequired:number}}>;
    expect((await preview({symbol:'BTCUSD',side:'buy',price:100000})).success).toBe(false);
    const sized=await preview({symbol:'BTCUSD',side:'sell',price:100000,stop_loss:0.010003});
    expect(sized.success).toBe(true);
    const entry=await s.enter({side:'sell',amount:sized.data!.amount,stop_loss:0.010003});
    expect(entry.success).toBe(true);
    expect(sized.data!.riskAtStop).toBeLessThanOrEqual(500);
    expect(sized.data!.marginRequired).toBeLessThanOrEqual(1000);
    expect(s.placed[0]![5]).toMatchObject({bracket_stop_loss_price:'101000.5'});
  });
  test('separately caps margin, exposure, costs and daily loss headroom', async () => {
    for(const failure of ['margin','exposure','daily','fees','leverage','liquidation','fraction','maintenance'] as const) {
      const s=fixture(); enableFutures(s);
      let stop=0.01;
      if(failure==='margin')s.policy.futures!.maxMarginPct=0.01;
      if(failure==='exposure')s.policy.futures!.maxNotional=50;
      if(failure==='daily')s.transactions.push({id:1,asset_id:14,amount:'-999',transaction_type:'funding',created_at:new Date().toISOString()});
      if(failure==='fees')s.setFree(20.01); // 20 USD margin plus buffered costs cannot fit.
      if(failure==='leverage')s.policy.futures!.leverage=2;
      if(failure==='liquidation')stop=0.25;
      if(failure==='maintenance'){const resolve=s.exchange.market.bind(s.exchange);s.exchange.market=symbol=>{const m=resolve(symbol);return {...m,info:{...m.info,maintenance_margin:'10'}};};}
      const result=await s.enter({amount:failure==='fraction'?1.5:1,stop_loss:stop});
      expect(result.success, failure).toBe(false);
      expect(s.placed).toHaveLength(0);
      expect(s.reservations).toHaveLength(0);
    }
  });
  test('existing collateral and pending orders consume account-wide margin, exposure and loss reserve', async () => {
    const occupied=fixture(); enableFutures(occupied); occupied.policy.risk.maxDailyLossPct=5;
    occupied.positions.push({symbol:'BTC/USD:USD',contracts:2,entryPrice:100000,unrealizedPnl:-10,info:{size:2,margin_mode:'isolated',auto_topup:false,mark_price:'100000',margin:'495'}} as Position);
    expect((await occupied.enter({amount:1})).success).toBe(false);
    expect(occupied.placed).toHaveLength(0);
    const pending=fixture(); enableFutures(pending); pending.policy.risk.maxDailyLossPct=1;
    pending.pending.push({id:12,product_id:27,size:5,unfilled_size:5,side:'buy',order_type:'limit_order',limit_price:'100000',state:'open',reduce_only:false});
    expect((await pending.enter({amount:1})).success).toBe(false);
    expect(pending.placed).toHaveLength(0);
  });
});

test('protected sizing caps at the base maintenance tier and refuses missing tier metadata', async () => {
  const s=fixture(); enableFutures(s);
  const resolve=s.exchange.market.bind(s.exchange);
  let tier: string|undefined='150';
  s.exchange.market=symbol=>{const m=resolve(symbol);return {...m,info:{...m.info,max_leverage_notional:tier}};};
  const entry=await s.enter();
  expect(entry.success).toBe(true);
  expect(entry.data?.sizing.amount).toBe(1);
  expect(entry.data!.sizing.notional).toBeLessThanOrEqual(150);
  tier=undefined;
  expect((await s.enter()).success).toBe(false);
  expect(s.placed).toHaveLength(1);
});

test('pending entries reserve saved fee and slippage costs against daily headroom', async () => {
  const s=fixture(); s.policy.capital.allocated=1000; s.policy.risk.maxDailyLossPct=5; enableFutures(s);
  s.policy.futures!.feeBps=100; s.policy.futures!.slippageBps=50;
  s.pending.push({id:12,product_id:27,size:2,unfilled_size:2,side:'buy',order_type:'limit_order',limit_price:'100000',state:'open',reduce_only:false});
  expect((await s.enter({amount:1})).success).toBe(false);
  expect(s.placed).toHaveLength(0);
  expect(s.reservations).toHaveLength(0);
});

test('ownership reservation precedes broker submission and acknowledgement', async () => {
  const state = fixture(), calls: string[] = [];
  state.safety.crypto = {
    scopeSnapshot: async snapshot => { calls.push('snapshot'); return snapshot; },
    assertOwnsPosition: async () => {},
    recordSubmission: async () => { calls.push('reserve'); },
    recordAccepted: async () => { calls.push('accepted'); },
    recordRefused: async () => { calls.push('refused'); },
  };
  const submit = state.exchange.createOrder.bind(state.exchange);
  state.exchange.createOrder = async (...args) => { expect(calls.at(-1)).toBe('reserve');calls.push('broker');return submit(...args); };
  expect((await state.enter()).success).toBe(true);
  expect(calls).toEqual(['snapshot','reserve','broker','accepted']);
});

describe('explicit cross-agent sizing policies',()=>{
  test('Delta LLM uses native stop loss risk and same deterministic preview/submission',async()=>{
    const s=fixture();s.policy.capital.allocated=25;s.policy.risk.maxRiskPerTradePct=1;s.setFree(0.8);
    s.policy.sizing={version:1,mode:'STOP_LOSS',leverage:5,maxMarginPct:100,maxExposureMultiple:5,feeBps:5,slippageBps:2};
    const preview=s.tools.calculatePositionSize.execute as unknown as (input:Record<string,unknown>)=>Promise<{success:boolean;data?:{amount:number;riskAtStop:number;notional:number}}>;
    const sized=await preview({symbol:'BTCUSD',side:'buy',price:2000,stop_loss:0.01});
    expect(sized.success).toBe(true);
    expect(sized.data!.notional).toBeGreaterThan(25*0.01);
    expect(sized.data!.riskAtStop).toBeLessThanOrEqual(0.25);
    const entered=await s.enter({price:2000,amount:sized.data!.amount});
    expect(entered.success).toBe(true);expect(s.placed).toHaveLength(1);
    expect(s.placed[0]![5]).toMatchObject({bracket_stop_loss_price:'1980'});
  });
  test('wrong saved leverage, unsupported Binance stop sizing, minimums and shared account cap refuse before submission',async()=>{
    const delta=fixture();delta.policy.sizing={version:1,mode:'STOP_LOSS',leverage:2,maxMarginPct:100,maxExposureMultiple:2,feeBps:10,slippageBps:5};
    expect((await delta.enter()).error).toContain('leverage differs');expect(delta.placed).toHaveLength(0);
    const binance=fixture('binance');binance.policy.sizing={...delta.policy.sizing};
    expect((await binance.enter({stop_loss:0.01})).error).toContain('tracked account');expect(binance.placed).toHaveLength(0);
    const small=fixture();small.policy.capital.allocated=20;small.policy.sizing={...delta.policy.sizing,mode:'NOTIONAL',leverage:1,maxExposureMultiple:1};
    expect((await small.enter()).error).toContain('No tradable quantity');expect(small.placed).toHaveLength(0);
  });
  test('Binance full-notional policy preserves fractional broker lots with separate margin budget',async()=>{
    const s=fixture('binance');s.policy.sizing={version:1,mode:'NOTIONAL',leverage:1,maxMarginPct:1,maxExposureMultiple:1,feeBps:10,slippageBps:5};
    expect((await s.enter()).success).toBe(false); // 100 collateral budget cannot cover minimum 0.001 BTC plus fees.
    expect(s.placed).toHaveLength(0);
    s.policy.sizing.maxMarginPct=2;
    expect((await s.enter()).success).toBe(true);expect(s.placed[0]![3]).toBe(0.001);
  });
});


test('live automatic sizing calculates minimum leverage without broker writes or expanding loss limits',async()=>{
 const s=fixture();s.policy.capital.allocated=25;s.policy.risk.maxRiskPerTradePct=1;s.setFree(0.8);enableFutures(s);s.policy.futures!.maxMarginPct=100;
 const snapshot=await cryptoEntrySnapshot(s.exchange,s.market,s.policy);
 const auto=previewAutomaticCryptoLeverage(s.exchange,s.market,s.policy,snapshot,2000,{side:'buy',stopPrice:1980});
 expect(auto.leverage).toBe(3);expect(auto.sizing.amount).toBe(1);expect(auto.sizing.riskAtStop).toBeLessThanOrEqual(0.25);
 expect(s.placed).toHaveLength(0);expect(snapshot.leverage.longLeverage).toBe(5);expect(s.policy.futures!.leverage).toBe(5);
 expect(()=>previewAutomaticCryptoLeverage(s.exchange,s.market,s.policy,snapshot,2000,{side:'buy',stopPrice:1000})).toThrow('limits were not increased');
});


describe('LLM automatic leverage tool',()=>{
  function automatic() {
    const state=fixture();
    state.policy.capital.allocated=60;
    state.policy.risk.maxRiskPerTradePct=5;
    state.policy.risk.maxDailyLossPct=10;
    state.policy.sizing={version:1,mode:'STOP_LOSS',leverageMode:'AUTO',leverage:4,maxMarginPct:100,maxExposureMultiple:4,feeBps:10,slippageBps:5};
    let current=4;
    const settings:number[]=[];
    state.exchange.fetchMarginMode=async()=>({marginMode:'isolated',info:{}}) as never;
    state.exchange.fetchLeverage=async()=>({symbol:state.market.symbol,marginMode:'isolated',longLeverage:current,shortLeverage:current,info:{}});
    state.exchange.setLeverage=async(value)=>{settings.push(value);current=value;return {success:true,result:{leverage:String(value)}}};
    const call=()=> (state.tools.setLeverage.execute as unknown as (input:unknown)=>Promise<{success:boolean;error?:string}>)({symbol:'BTCUSD',side:'buy',stop_loss:0.01});
    return {...state,settings,call};
  }
  test('chooses minimum viable leverage, then entry uses verified broker setting without raising saved ceiling',async()=>{
    const state=automatic();expect((await state.call()).success).toBe(true);expect(state.settings).toEqual([2]);
    expect(state.policy.sizing?.leverage).toBe(4);expect(state.placed).toHaveLength(0);
    expect(await state.enter()).toMatchObject({success:true});expect(state.placed).toHaveLength(1);
  });
  test('fixed sizing and insufficient stop-risk budget cannot mutate leverage',async()=>{
    const state=automatic();state.policy.sizing!.leverageMode='FIXED';expect((await state.call()).success).toBe(false);
    state.policy.sizing!.leverageMode='AUTO';state.policy.risk.maxRiskPerTradePct=0.01;expect((await state.call()).success).toBe(false);expect(state.settings).toEqual([]);
  });
  test('foreign ticker or an open position cannot mutate leverage',async()=>{
    const state=automatic();state.positions.push({symbol:state.market.symbol,contracts:1,side:'long',notional:100,initialMargin:25,unrealizedPnl:0} as Position);
    expect((await state.call()).success).toBe(false);expect(state.settings).toEqual([]);
  });
  test('lost setting response is uncertain and no entry order is placed',async()=>{
    const state=automatic();state.exchange.setLeverage=async()=>{throw new Error('timeout');};
    expect(await state.call()).toMatchObject({success:false,error:expect.stringContaining('No entry order was sent')});
    expect(state.failures.at(-1)?.constructor.name).toBe('DeltaLeverageUncertainError');expect(state.placed).toHaveLength(0);
  });
});

describe('pure venue target-size leverage previews',()=>{
  async function targetFixture(id:'delta'|'binance') {
    const state=fixture(id);
    state.policy.capital.allocated=100;state.policy.risk.maxRiskPerTradePct=10;state.policy.risk.maxDailyLossPct=30;state.setFree(100);
    state.policy.sizing={version:1,mode:'STOP_LOSS',leverageMode:'AUTO',autoSizing:'TARGET_RISK',leverage:5,maxMarginPct:100,maxExposureMultiple:5,feeBps:10,slippageBps:5};
    const snapshot=await cryptoEntrySnapshot(state.exchange,state.market,state.policy);
    return {...state,snapshot,market:state.exchange.market(state.market.symbol)};
  }
  test('Delta and Binance use the common maximum-size and lowest-funding leverage objective without broker writes',async()=>{
    for(const id of ['delta','binance'] as const) {
      const s=await targetFixture(id);
      let writes=0;s.exchange.setLeverage=async()=>{writes++;throw new Error('No setting write allowed');};
      const target=previewAutomaticCryptoLeverage(s.exchange,s.market,s.policy,s.snapshot,10000,{side:'buy',stopPrice:9500});
      expect(target.leverage).toBe(2);expect(target.sizing.amount).toBe(id==='delta'?18:0.018);
      expect(target.sizing.riskAtStop).toBeLessThanOrEqual(10);expect(target.sizing.marginRequired).toBeLessThanOrEqual(100);
      expect(target.diagnostics).toMatchObject({targetFunded:true,fundedAmount:target.sizing.amount});
      s.policy.sizing!.autoSizing=undefined;
      const legacy=previewAutomaticCryptoLeverage(s.exchange,s.market,s.policy,s.snapshot,10000,{side:'buy',stopPrice:9500});
      expect(legacy.leverage).toBe(1);expect(legacy.sizing.amount).toBe(id==='delta'?9:0.009);
      expect(s.snapshot.leverage.longLeverage).toBe(5);expect(s.policy.sizing!.leverage).toBe(5);
      expect(writes).toBe(0);expect(s.placed).toHaveLength(0);
    }
  });
  test('exchange maxima, available margin and account-wide exposure/loss caps reduce target without relaxing limits',async()=>{
    for(const id of ['delta','binance'] as const) {
      const s=await targetFixture(id);
      s.market.limits.amount!.max=id==='delta'?4:0.004;
      const broker=previewAutomaticCryptoLeverage(s.exchange,s.market,s.policy,s.snapshot,10000,{side:'buy',stopPrice:9500});
      expect(broker.sizing.amount).toBe(id==='delta'?4:0.004);expect(broker.leverage).toBe(1);
      s.market.limits.amount!.max=10000;s.snapshot.availableFunds=10;
      const fallback=previewAutomaticCryptoLeverage(s.exchange,s.market,s.policy,s.snapshot,10000,{side:'buy',stopPrice:9500});
      expect(fallback.sizing.amount).toBe(id==='delta'?4:0.004);expect(fallback.diagnostics.targetFunded).toBe(false);
      expect(fallback.sizing.marginRequired).toBeLessThanOrEqual(10);
      s.snapshot.availableFunds=100;
      s.snapshot.account={limits:{maxOpenPositions:1,maxMarginPct:100,maxDailyLossPct:1,maxNotionalMultiple:0.2},equity:100,dailyEquity:100,realizedLosses:0,existingLossReserve:0,marginUsed:0,notionalExposure:0,openSymbols:new Set()};
      const account=previewAutomaticCryptoLeverage(s.exchange,s.market,s.policy,s.snapshot,10000,{side:'buy',stopPrice:9500});
      expect(account.sizing.riskAtStop).toBeLessThanOrEqual(1);expect(account.sizing.notional).toBeLessThanOrEqual(20);
      s.snapshot.account.realizedLosses=1;
      expect(()=>previewAutomaticCryptoLeverage(s.exchange,s.market,s.policy,s.snapshot,10000,{side:'buy',stopPrice:9500})).toThrow('Account-wide');
      expect(s.placed).toHaveLength(0);
    }
  });
});

 test('failed daily-counter reservation is refused before any broker submission',async()=>{
  const state=fixture();
  state.safety.reserveDailyEntry=async()=>{throw new OrderRejectedError('Daily entry counter could not be reserved (database error 224). No broker order was sent.');};
  const result=await state.enter();
  expect(result.success).toBe(false);expect(result.error).toContain('No broker order was sent');
  expect(state.placed).toHaveLength(0);expect(state.failures[0]).toBeInstanceOf(OrderRejectedError);
 });

import { afterAll, describe, expect, mock, test } from "bun:test";
import type { ExecutionSafety } from "../src/agent/tradeGuard";

mock.module("@/lib/marketHours", () => ({ isIndianMarketOpen: () => true }));
const { kiteAgentTag } = await import("../src/agent/tools/zerodhaTools/stockTools");

const policy = {
  symbols: ["INFY"],
  capital: { allocated: 10_000, currency: "INR" },
  risk: { maxRiskPerTradePct: 1, maxDailyLossPct: 5, maxOpenPositions: 3, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 },
};

function makeTools(snapshot: {
  net?: Array<Record<string, unknown>>;
  day?: Array<Record<string, unknown>>;
  orders?: Array<Record<string, unknown>>;
  cash?: number;
  holdings?: Array<Record<string, unknown>>;
}, agentId = "agent-A") {
  const placed: unknown[] = [];
  const cancelled: string[] = [];
  const kc = {
    getPositions: async () => ({ net: snapshot.net ?? [], day: snapshot.day ?? [] }),
    getOrders: async () => snapshot.orders ?? [],
    orderMargins:async (orders: Array<{tradingsymbol:string;exchange:string;quantity:number;price:number}>)=>orders.map(o=>({tradingsymbol:o.tradingsymbol,exchange:o.exchange,total:o.quantity*o.price/5,leverage:5,charges:{total:1}})),
    getMargins: async () => ({ equity: { available: { cash: snapshot.cash } } }),
    getHoldings: async () => snapshot.holdings ?? [],
    placeOrder: async (_variety: string, params: unknown) => { placed.push(params); return { order_id: `order-${placed.length}` }; },
    cancelOrder: async (_variety: string, orderId: string) => { cancelled.push(orderId); return { order_id: orderId }; },
  };
  const safety: ExecutionSafety = {
    agentId,
    policy,
    assertActive: async () => {},
    reserveDailyEntry: async () => {},
    executeOrder: async (_intent, execute) => execute(),
  };
  return { tools: (async () => (await import("../src/agent/tools/zerodhaTools/stockTools")).getZerodhaTools({ kc: kc as never, safety }))(), placed, cancelled };
}

const validOrder = {
  exchange: "NSE", tradingsymbol: "INFY", transaction_type: "BUY", quantity: 1,
  product: "MIS", order_type: "LIMIT", price: 50, validity: "DAY", tag: "caller-controlled",
};

describe("Kite order bounds use authoritative snapshots", () => {
  test("permits bounded long entry and side-aware reduction only", async () => {
    const entry = makeTools({ cash: 1000 });
    const entryTool = (await entry.tools).placeOrder;
    const execute = entryTool.execute as unknown as (params: typeof validOrder) => Promise<{ ok: boolean }>;
    expect((await execute(validOrder)).ok).toBe(true);
    expect(entry.placed).toHaveLength(1);
    expect((entry.placed[0] as { tag: string }).tag).toBe(kiteAgentTag("agent-A"));

    const reduction = makeTools({
      cash: 0,
      net: [{ exchange: "NSE", product: "MIS", tradingsymbol: "INFY", quantity: 2, average_price: 100, last_price: 100 }],
    });
    const reductionTool = (await reduction.tools).placeOrder;
    const reduce = reductionTool.execute as unknown as (params: typeof validOrder) => Promise<{ ok: boolean }>;
    const result = await reduce({ ...validOrder, transaction_type: "SELL", quantity: 2 });
    expect(result.ok).toBe(true);
    expect(reduction.placed).toHaveLength(1);
  });

  test("missing funds snapshot, over-close, and new short entry fail before broker call", async () => {
    const missingFunds = makeTools({});
    const missingFundsTool = (await missingFunds.tools).placeOrder;
    const execute = missingFundsTool.execute as unknown as (params: typeof validOrder) => Promise<{ ok: boolean }>;
    expect((await execute(validOrder)).ok).toBe(false);
    expect(missingFunds.placed).toHaveLength(0);

    const position = { exchange: "NSE", product: "MIS", tradingsymbol: "INFY", quantity: 1, average_price: 100, last_price: 100 };
    const overClose = makeTools({ cash: 1000, net: [position] });
    const overCloseTool = (await overClose.tools).placeOrder;
    const close = overCloseTool.execute as unknown as (params: typeof validOrder) => Promise<{ ok: boolean }>;
    expect((await close({ ...validOrder, transaction_type: "SELL", quantity: 2 })).ok).toBe(false);
    expect(overClose.placed).toHaveLength(0);

    const shortEntry = makeTools({ cash: 1000 });
    const shortTool = (await shortEntry.tools).placeOrder;
    const sell = shortTool.execute as unknown as (params: typeof validOrder) => Promise<{ ok: boolean }>;
    expect((await sell({ ...validOrder, transaction_type: "SELL" })).ok).toBe(false);
    expect(shortEntry.placed).toHaveLength(0);
  });

  test("agent-specific tag prevents another same-symbol agent from listing or cancelling the order", async () => {
    const ownerTag = kiteAgentTag("agent-A");
    expect(ownerTag).toHaveLength(20);
    expect(kiteAgentTag("agent-B")).not.toBe(ownerTag);
    const sharedOrders = [{ order_id: "owned-order", tradingsymbol: "INFY", status: "OPEN", tag: ownerTag }];
    const owner = makeTools({ orders: sharedOrders }, "agent-A");
    const other = makeTools({ orders: sharedOrders }, "agent-B");
    const ownerTools = await owner.tools;
    const otherTools = await other.tools;

    const fetchOwnerOrders = ownerTools.fetchOrders.execute as unknown as () => Promise<Array<{ order_id: string }>>;
    const fetchOtherOrders = otherTools.fetchOrders.execute as unknown as () => Promise<Array<{ order_id: string }>>;
    expect((await fetchOwnerOrders()).map(order => order.order_id)).toEqual(["owned-order"]);
    expect(await fetchOtherOrders()).toEqual([]);

    const cancelOwner = ownerTools.cancelOrder.execute as unknown as (input: { order_id: string }) => Promise<{ ok: boolean }>;
    const cancelOther = otherTools.cancelOrder.execute as unknown as (input: { order_id: string }) => Promise<{ ok: boolean }>;
    expect((await cancelOther({ order_id: "owned-order" })).ok).toBe(false);
    expect(other.cancelled).toHaveLength(0);
    expect((await cancelOwner({ order_id: "owned-order" })).ok).toBe(true);
    expect(owner.cancelled).toEqual(["owned-order"]);
  });
});

afterAll(() => mock.restore());

import { instrumentTools } from "@/lib/toolLogging";
import { KiteConnect, type Exchanges, type TransactionType, type Product, type OrderType, type Validity } from "kiteconnect";
import { createHash } from "node:crypto";

type Kite = InstanceType<typeof KiteConnect>;
import { assertOrderAllowed, OrderRejectedError, sizeLongPosition, type ExecutionSafety } from "../../tradeGuard";
import { isIndianMarketOpen } from "@/lib/marketHours";
import { tool } from "ai";
import { z } from "zod";
import { logger, errMeta } from "@/lib/logger";

const log = logger.child({ module: "stockTools" });

export function kiteAgentTag(agentId: string): string {
  return `m${createHash("sha256").update(agentId).digest("hex").slice(0, 19)}`;
}

export type KiteOrderParams = {
  exchange: Exchanges;
  tradingsymbol: string;
  transaction_type: TransactionType;
  quantity: number;
  product: Product;
  order_type: OrderType;
  price?: number;
  trigger_price?: number;
  validity: Validity;
  tag?: string;
};

/** The broker determines MIS leverage; a preview never places an order. */
export async function previewKiteOrderMargin(kc:Kite,params:KiteOrderParams) {
  if(!params.price||params.price<=0||!Number.isSafeInteger(params.quantity)||params.quantity<1)throw new OrderRejectedError('A positive price and whole quantity are required for the broker margin preview');
  const rows=await kc.orderMargins([{...params,variety:'regular',price:params.price,trigger_price:params.trigger_price ?? 0}]);
  const row=rows[0];
  if(rows.length!==1||row?.tradingsymbol!==params.tradingsymbol||row.exchange!==params.exchange||!Number.isFinite(row.total)||row.total<0||!Number.isFinite(row.leverage)||row.leverage<=0||!Number.isFinite(row.charges?.total)||row.charges.total<0)throw new OrderRejectedError('Kite margin preview could not be verified; no order was sent');
  return {requiredMargin:row.total,brokerLeverage:row.leverage,estimatedCharges:row.charges.total,product:params.product,notional:params.quantity*params.price};
}

export async function submitKiteOrder(kc: Kite, safety: ExecutionSafety | undefined, params: KiteOrderParams) {
  try {
    if (!safety) throw new Error("Execution authorization is required");
    const scopedTag = kiteAgentTag(safety.agentId);
    const res = await safety.executeOrder({ ...params, tag: scopedTag }, async () => {
      if (!isIndianMarketOpen()) throw new OrderRejectedError("Market is closed");
      if (params.exchange !== "NSE" || params.product !== "MIS" || params.order_type !== "LIMIT" || !params.price) {
        throw new OrderRejectedError("Only NSE MIS LIMIT orders have verified risk accounting");
      }
      if (safety.policy.capital.currency !== "INR") throw new OrderRejectedError("Kite capital must be INR");
      let positions: Awaited<ReturnType<Kite["getPositions"]>>;
      let orders: Awaited<ReturnType<Kite["getOrders"]>>;
      let margins: Awaited<ReturnType<Kite["getMargins"]>>;
      let holdings: Awaited<ReturnType<Kite["getHoldings"]>>;
      try {
        [positions, orders, margins, holdings] = await Promise.all([
          kc.getPositions(), kc.getOrders(), kc.getMargins(), kc.getHoldings(),
        ]);
      } catch {
        throw new OrderRejectedError("Could not verify account risk state; no order was sent");
      }
      if (holdings.some(h => h.quantity !== 0) || positions.net.some(p => p.product !== "MIS" && p.quantity !== 0)) {
        throw new OrderRejectedError("Dedicated MIS account required: holdings/carry exposure cannot be attributed safely");
      }
      const pending = orders.filter(o => !["COMPLETE", "REJECTED", "CANCELLED"].includes(o.status));
      if (pending.some(o => o.product !== "MIS" || o.order_type !== "LIMIT" || !o.price)) {
        throw new OrderRejectedError("Unbounded pending orders prevent risk accounting");
      }
      const current = positions.net.find(p => p.exchange === params.exchange && p.product === params.product && p.tradingsymbol === params.tradingsymbol);
      const pendingExits = pending.filter(o => o.tradingsymbol === params.tradingsymbol && o.transaction_type === params.transaction_type)
        .reduce((n, o) => n + Math.max(0, o.quantity - o.filled_quantity), 0);
      const reducing = current && (params.transaction_type === "SELL" ? current.quantity > 0 : current.quantity < 0) &&
        params.quantity + pendingExits <= Math.abs(current.quantity);
      if (!safety.policy.symbols.includes(params.tradingsymbol)) throw new OrderRejectedError("Symbol outside agent scope");
      const losses = positions.day.reduce((total, p) => total + Math.min(0, Number(p.pnl)), 0);
      const exposure = positions.net.reduce((total, p) => total + Math.abs(p.quantity) * Math.max(Number(p.last_price), Number(p.average_price)), 0) +
        pending.reduce((total, o) => total + Math.max(0, o.quantity - o.filled_quantity) * Number(o.price), 0);
      // Reserve the full notional of all open exposure as potential loss.
      if (!reducing) {
        if (positions.net.some(p => p.quantity < 0)) throw new OrderRejectedError("Existing short liabilities prevent bounded entry risk");
        const availableFunds = Number(margins.equity?.available?.cash);
        const dailyPnl = losses - exposure;
        const openPositionSymbols = new Set([
          ...positions.net.filter(p => p.quantity !== 0).map(p => p.tradingsymbol),
          ...pending.filter(o => o.transaction_type === "BUY").map(o => o.tradingsymbol),
        ]);
        const sizing = sizeLongPosition({
          sizing: safety.policy.sizing,
          allocated: safety.policy.capital.allocated,
          maxRiskPerTradePct: safety.policy.risk.maxRiskPerTradePct,
          exposure,
          availableFunds,
          remainingDailyLoss: Math.max(0, safety.policy.capital.allocated * safety.policy.risk.maxDailyLossPct / 100 - Math.max(0, -dailyPnl)),
          price: params.price!,
        });
        if (params.quantity > sizing.quantity) {
          throw new OrderRejectedError(`Requested quantity exceeds the bounded size of ${sizing.quantity}`);
        }
        assertOrderAllowed(safety.policy, params.tradingsymbol, params.quantity * params.price!, {
          dailyPnl,
          exposure,
          openPositions: openPositionSymbols.size,
          availableFunds,
        });
        if (params.transaction_type !== "BUY") throw new OrderRejectedError("New short exposure has no bounded loss guarantee");
        const opensPosition = (!current || current.quantity === 0) &&
          !pending.some(o => o.tag === scopedTag && o.tradingsymbol === params.tradingsymbol && o.transaction_type === "BUY");
        let margin;
        try {margin=await previewKiteOrderMargin(kc,params);}catch(error){throw new OrderRejectedError(`Broker margin preview failed: ${error instanceof Error?error.message:'unavailable'}`);}
        const marginCeiling=safety.policy.capital.allocated*(safety.policy.sizing?.maxMarginPct ?? 100)/100;
        if(margin.requiredMargin+margin.estimatedCharges>Math.min(availableFunds,marginCeiling))throw new OrderRejectedError('Broker-required margin and charges exceed the available allocation allowance');
        await safety.assertActive();
        await safety.reserveDailyEntry(params.tradingsymbol, opensPosition);
      }
      return kc.placeOrder("regular", {
        exchange: params.exchange,
        tradingsymbol: params.tradingsymbol,
        transaction_type: params.transaction_type,
        quantity: params.quantity,
        product: params.product,
        order_type: params.order_type,
        price: params.price,
        trigger_price: params.trigger_price,
        validity: params.validity,
        tag: scopedTag,
      });
    });
    log.info({ orderId: res.order_id, symbol: params.tradingsymbol }, "Zerodha order placed");
    return { ok: true as const, order_id: res.order_id };
  } catch (err) {
    log.error(errMeta(err), "placeOrder failed");
    return { ok: false as const, error: (err as Error).message };
  }
}

/**
 * Zerodha (Kite Connect) toolset factory.
 *
 * NOTE: tools are bound to a specific authenticated KiteConnect instance
 * (access token set by the token manager). No orders are placed at import
 * time — only when the LLM invokes a tool during a run.
 */
export function getZerodhaTools({ kc, safety }: { kc: Kite; safety?: ExecutionSafety }) {
  return instrumentTools({
    placeOrder: tool({
      description:
        "Place an NSE MIS LIMIT order during market hours in a dedicated INR intraday account. New entries must be BUY and pass capital, position and full-notional loss limits. SELL may only reduce an existing long; BUY may reduce an existing short. Other exchanges, products and order types are rejected.",
      inputSchema: z.object({
        exchange: z.enum(["NSE", "BSE", "NFO"]).default("NSE"),
        tradingsymbol: z.string().describe('e.g. "INFY", "RELIANCE"'),
        transaction_type: z.enum(["BUY", "SELL"]),
        quantity: z.number().int().positive(),
        product: z.enum(["MIS", "CNC", "NRML"]).default("MIS"),
        order_type: z.enum(["MARKET", "LIMIT", "SL", "SL-M"]).default("LIMIT"),
        price: z.number().positive().optional().describe("required for LIMIT"),
        trigger_price: z.number().positive().optional().describe("required for SL/SL-M"),
        validity: z.enum(["DAY", "IOC"]).default("DAY"),
        tag: z.string().optional(),
      }),
      execute: async (params: KiteOrderParams) => submitKiteOrder(kc, safety, params),
    }),

    cancelOrder: tool({
      description: "Cancel an open order placed by this agent for one of its allowed symbols.",
      inputSchema: z.object({
        order_id: z.string(),
      }),
      execute: async ({ order_id }: { order_id: string }) => {
        try {
          if (!safety) throw new Error("Execution authorization is required");
          await safety.assertActive();
          const scopedTag = kiteAgentTag(safety.agentId);
          const res = await safety.executeOrder({ order_id, action: "cancel", tag: scopedTag }, async () => {
            const order = (await kc.getOrders()).find(o => o.order_id === order_id);
            if (!order || !safety.policy.symbols.includes(order.tradingsymbol) || order.tag !== scopedTag || ["COMPLETE", "REJECTED", "CANCELLED"].includes(order.status)) {
              throw new Error("Order is outside this agent's scope or is no longer pending");
            }
            return kc.cancelOrder("regular", order_id);
          });
          return { ok: true, order_id: res.order_id ?? order_id };
        } catch (err) {
          log.error(errMeta(err), "cancelOrder failed");
          return { ok: false, error: (err as Error).message };
        }
      },
    }),

    fetchOrders: tool({
      description: "Fetch this agent's orders for its allowed symbols with their status (OPEN, COMPLETE, CANCELLED, REJECTED).",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          if (!safety) throw new Error("Execution authorization is required");
          const orders = await kc.getOrders();
          return orders
            .filter((o) => o.tag === kiteAgentTag(safety.agentId) && safety.policy.symbols.includes(o.tradingsymbol))
            .map((o) => ({
              order_id: o.order_id,
              tradingsymbol: o.tradingsymbol,
              transaction_type: o.transaction_type,
              quantity: o.quantity,
              filled: o.filled_quantity,
              price: o.average_price,
              status: o.status,
              product: o.product,
              tag: o.tag ?? undefined,
            }));
        } catch (err) {
          log.warn(errMeta(err), "Kite read tool failed");
          return { ok: false, error: (err as Error).message };
        }
      },
    }),

    fetchPositions: tool({
      description: "Fetch open intraday/F&O positions with day PnL.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const { net } = await kc.getPositions();
          return net
            .filter((p) => p.quantity !== 0)
            .map((p) => ({
              tradingsymbol: p.tradingsymbol,
              exchange: p.exchange,
              product: p.product,
              quantity: p.quantity,
              average_price: p.average_price,
              last_price: p.last_price,
              day_pnl: (p as { pnl?: number }).pnl ?? 0,
              unrealized_pnl: (p as { pnl?: number }).pnl ?? 0,
            }));
        } catch (err) {
          log.warn(errMeta(err), "Kite read tool failed");
          return { ok: false, error: (err as Error).message };
        }
      },
    }),

    fetchHoldings: tool({
      description: "Fetch the delivery (CNC) holdings portfolio with current value and PnL.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const holdings = await kc.getHoldings();
          return holdings.map((h) => ({
            tradingsymbol: h.tradingsymbol,
            quantity: h.quantity,
            average_price: h.average_price,
            last_price: h.last_price,
            pnl: h.pnl,
          }));
        } catch (err) {
          log.warn(errMeta(err), "Kite read tool failed");
          return { ok: false, error: (err as Error).message };
        }
      },
    }),

    fetchQuote: tool({
      description: 'Fetch live quote (LTP, OHLC, depth) for one or more instruments, e.g. ["INFY","TCS"].',
      inputSchema: z.object({
        symbols: z.array(z.string()).min(1).max(10).describe('NSE symbols like "INFY"'),
      }),
      execute: async ({ symbols }: { symbols: string[] }) => {
        try {
          const keys = symbols.map((s) => (s.includes(":") ? s : `NSE:${s}`));
          const q = await kc.getQuote(keys);
          return Object.entries(q).map(([key, v]) => {
            const quote = v as Record<string, unknown>;
            return {
              symbol: key,
              last_price: quote.last_price,
              ohlc: quote.ohlc,
              volume: quote.volume,
              depth: quote.depth,
            };
          });
        } catch (err) {
          log.warn(errMeta(err), "Kite read tool failed");
          return { ok: false, error: (err as Error).message };
        }
      },
    }),

    fetchHistorical: tool({
      description:
        "Fetch historical candles for an instrument token. interval: minute, 5minute, 15minute, 60minute, day. from/to format YYYY-MM-DD HH:MM:SS.",
      inputSchema: z.object({
        instrument_token: z.number().describe("numeric instrument token from instruments lookup"),
        interval: z.enum(["minute", "5minute", "15minute", "60minute", "day"]),
        from: z.string(),
        to: z.string(),
      }),
      execute: async (p: {
        instrument_token: number;
        interval: "minute" | "5minute" | "15minute" | "60minute" | "day";
        from: string;
        to: string;
      }) => {
        try {
          const candles = await kc.getHistoricalData(
            p.instrument_token,
            p.interval,
            p.from,
            p.to,
          );
          return candles.slice(-120).map((c) => ({
            date: c.date,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          }));
        } catch (err) {
          log.warn(errMeta(err), "Kite read tool failed");
          return { ok: false, error: (err as Error).message };
        }
      },
    }),

    previewOrderMargin: tool({
      description:'Read-only Kite margin preview for an allowed NSE MIS LIMIT entry. Shows broker-determined leverage, required collateral and estimated charges. No arbitrary leverage setting is supported and this does not grant stop-risk sizing credit.',
      inputSchema:z.object({symbol:z.string(),quantity:z.number().int().positive(),price:z.number().positive()}),
      execute:async({symbol,quantity,price})=>{
        try {
          if(!safety||!safety.policy.symbols.includes(symbol))throw new OrderRejectedError('Symbol outside agent scope');
          await safety.assertActive();
          return {success:true,data:await previewKiteOrderMargin(kc,{exchange:'NSE',tradingsymbol:symbol,transaction_type:'BUY',quantity,price,product:'MIS',order_type:'LIMIT',validity:'DAY'})};
        }catch(error){return {success:false,error:error instanceof Error?error.message:'Margin preview unavailable'};}
      },
    }),
    fetchMargins: tool({
      description: "Fetch available margin/funds per segment (equity, commodity).",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const m = await kc.getMargins();
          const equity = m.equity as Record<string, unknown> | undefined;
          return {
            available: equity?.available,
            utilised: equity?.utilised,
            net: equity?.net,
          };
        } catch (err) {
          log.warn(errMeta(err), "Kite read tool failed");
          return { ok: false, error: (err as Error).message };
        }
      },
    }),
  });
}

export type ZerodhaTools = ReturnType<typeof getZerodhaTools>;

import { KiteConnect } from "kiteconnect";
import { sizeLongPosition, type ExecutionSafety } from "../../execution/tradeGuard";
import { submitKiteOrder } from "../../execution/kite/stockTools";
import { getKiteEmaSignals } from "./kiteEmaSignals";
import type { EmaCrossoverParams } from "@/algorithms/emaCrossover";

type Kite = InstanceType<typeof KiteConnect>;

function getLastPrice(quotes: Record<string, unknown>, symbol: string) {
  const quote = quotes[`NSE:${symbol}`] as { last_price?: number } | undefined;
  const price = Number(quote?.last_price);
  if (!Number.isFinite(price) || price <= 0) throw new Error(`No valid NSE quote for ${symbol}`);
  return price;
}

export async function runKiteEmaStrategy({
  kc,
  safety,
  symbols,
  params,
}: {
  kc: Kite;
  safety: ExecutionSafety;
  symbols: string[];
  params: EmaCrossoverParams;
}) {
  const signals = await getKiteEmaSignals(kc, symbols, params);
  const outcomes: string[] = [];

  for (const signal of signals) {
    if (signal.decision.action === "hold") {
      outcomes.push(`${signal.symbol}: hold`);
      continue;
    }
    const quote = await kc.getQuote([`NSE:${signal.symbol}`]) as Record<string, unknown>;
    const price = getLastPrice(quote, signal.symbol);
    let quantity: number;
    let side: "BUY" | "SELL";

    if (signal.decision.action === "enter") {
      side = "BUY";
      const [positions, orders, margins] = await Promise.all([kc.getPositions(), kc.getOrders(), kc.getMargins()]);
      const pending = orders.filter(order => !["COMPLETE", "REJECTED", "CANCELLED"].includes(order.status));
      const exposure = positions.net.reduce((total, position) => total + Math.abs(position.quantity) * Math.max(Number(position.last_price), Number(position.average_price)), 0) +
        pending.reduce((total, order) => total + Math.max(0, order.quantity - order.filled_quantity) * Number(order.price), 0);
      const losses = positions.day.reduce((total, position) => total + Math.min(0, Number(position.pnl)), 0);
      const dailyPnl = losses - exposure;
      const remainingDailyLoss = Math.max(0, safety.policy.capital.allocated * safety.policy.risk.maxDailyLossPct / 100 - Math.max(0, -dailyPnl));
      const sizing = sizeLongPosition({
        sizing: safety.policy.sizing,
        allocated: safety.policy.capital.allocated,
        maxRiskPerTradePct: safety.policy.risk.maxRiskPerTradePct,
        exposure,
        availableFunds: Number(margins.equity?.available?.cash),
        remainingDailyLoss,
        price,
      });
      quantity = sizing.quantity;
    } else {
      side = "SELL";
      quantity = Math.floor(signal.positionQuantity);
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        outcomes.push(`${signal.symbol}: exit skipped because no whole-share long position is available`);
        continue;
      }
    }

    const result = await submitKiteOrder(kc, safety, {
      exchange: "NSE",
      tradingsymbol: signal.symbol,
      transaction_type: side,
      quantity,
      product: "MIS",
      order_type: "LIMIT",
      price,
      validity: "DAY",
    });
    outcomes.push(`${signal.symbol}: ${signal.decision.action} ${side} ${quantity} @ ${price} — ${result.ok ? result.order_id : result.error}`);
  }

  return outcomes.join("\n");
}

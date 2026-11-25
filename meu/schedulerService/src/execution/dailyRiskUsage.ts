import { marketDate, type MarketTimezone } from '../../../../shared/trading/marketDay';
import type { Db } from "mongodb";
import { OrderRejectedError, type TradingPolicy } from "./tradeGuard";
import { COLLECTIONS } from "../../../../shared/persistence/collections";

type UsageRecord = {
  _id: string;
  agentId: string;
  marketDate: string;
  timezone: string;
  tradesReserved: number;
  positionsOpenedReserved: number;
  updatedAt: Date;
};

/** Atomically reserves a daily entry before the broker side effect. Ambiguous entries stay consumed. */
export async function reserveDailyEntry(
  db: Db,
  agentId: string,
  policy: TradingPolicy,
  symbol: string,
  opensPosition: boolean,
  { timezone = "Asia/Kolkata", now = new Date() }: { timezone?: MarketTimezone; now?: Date } = {},
) {
  const day = marketDate(now.getTime() / 1000, timezone);
  const id = `${agentId}:${timezone}:${day}`;
  const usage = db.collection<UsageRecord>(COLLECTIONS.AgentDailyRiskUsage);
  const tradeCount = { $ifNull: ["$tradesReserved", 0] };
  const positionCount = { $ifNull: ["$positionsOpenedReserved", 0] };
  const filter = {
    _id: id,
    $expr: {
      $and: [
        { $lt: [tradeCount, policy.risk.maxTradesPerDay] },
        { $or: [{ $eq: [opensPosition, false] }, { $lt: [positionCount, policy.risk.maxPositionsOpenedPerDay] }] },
      ],
    },
  };
  const update = [{
    $set: {
      agentId: { $ifNull: ["$agentId", { $literal: agentId }] },
      marketDate: { $ifNull: ["$marketDate", { $literal: day }] },
      timezone: { $ifNull: ["$timezone", { $literal: timezone }] },
      tradesReserved: { $add: [tradeCount, 1] },
      positionsOpenedReserved: { $add: [positionCount, opensPosition ? 1 : 0] },
      updatedAt: "$$NOW",
    },
  }];

  try {
    // MongoDB forbids $expr in an upsert predicate. Initialize by unique ID only;
    // the conditional increment below remains the atomic daily-limit boundary.
    try {
      await usage.updateOne({ _id: id }, { $setOnInsert: {
        agentId, marketDate: day, timezone, tradesReserved: 0, positionsOpenedReserved: 0, updatedAt: now,
      } }, { upsert: true });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await usage.updateOne(filter, update);
      if (result.matchedCount) return { marketDate: day, timezone };

      const current = await usage.findOne({ _id: id });
      if (current && current.tradesReserved >= policy.risk.maxTradesPerDay) {
        throw new OrderRejectedError("Maximum trades for this agent and market day reached");
      }
      if (opensPosition && current && current.positionsOpenedReserved >= policy.risk.maxPositionsOpenedPerDay) {
        throw new OrderRejectedError("Maximum positions opened for this agent and market day reached");
      }
    }
    throw new OrderRejectedError("Could not reserve the daily entry safely; no broker order was sent");
  } catch (error) {
    if (error instanceof OrderRejectedError) throw error;
    const code = (error as { code?: unknown } | null)?.code;
    throw new OrderRejectedError(`Daily entry counter could not be reserved${Number.isSafeInteger(code) ? ` (database error ${code})` : ''}. No broker order was sent. Retry after database connectivity or configuration is restored; do not reset the daily counters.`);
  }
}

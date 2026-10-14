import { describe, expect, test } from "bun:test";
import type { Db } from "mongodb";
import { reserveDailyEntry } from "../src/execution/dailyRiskUsage";
import type { TradingPolicy } from "../src/execution/tradeGuard";

function makeDb() {
  const records = new Map<string, { _id: string; agentId: string; marketDate: string; timezone: string; tradesReserved: number; positionsOpenedReserved: number; updatedAt: Date }>();
  const collection = {
    updateOne: async (filter: Record<string, unknown>, update: unknown, options?: {upsert?:boolean}) => {
      if (filter.$expr && options?.upsert) throw Object.assign(new Error("$expr is not allowed in an upsert"), {code:224});
      if (!filter.$expr) {
        const id=String(filter._id);
        if (!records.has(id)) records.set(id,{_id:id,...(update as {$setOnInsert: Omit<NonNullable<ReturnType<typeof records.get>>, "_id">}).$setOnInsert});
        return {matchedCount:1,upsertedCount:0};
      }
      const id = String(filter._id);
      const expr = filter.$expr as { $and: unknown[] };
      const tradesLimit = ((expr.$and[0] as { $lt: unknown[] }).$lt[1]) as number;
      const positionRule = expr.$and[1] as { $or: unknown[] };
      const opensPosition = Boolean(((positionRule.$or[0] as { $eq: unknown[] }).$eq[0]));
      const positionsLimit = ((positionRule.$or[1] as { $lt: unknown[] }).$lt[1]) as number;
      const current = records.get(id) ?? {
        _id: id, agentId: "", marketDate: "", timezone: "", tradesReserved: 0, positionsOpenedReserved: 0, updatedAt: new Date(0),
      };
      if (current.tradesReserved >= tradesLimit || (opensPosition && current.positionsOpenedReserved >= positionsLimit)) {
        return {matchedCount:0,upsertedCount:0};
      }
      current.agentId = "agent-a";
      current.marketDate = "2026-10-01";
      current.timezone = "Asia/Kolkata";
      current.tradesReserved++;
      if (opensPosition) current.positionsOpenedReserved++;
      current.updatedAt = new Date();
      records.set(id, current);
      return { matchedCount: 1, upsertedCount: 0 };
    },
    findOne: async ({ _id }: { _id: string }) => records.get(_id) ?? null,
  };
  return { db: { collection: () => collection } as unknown as Db, records };
}

const policy: TradingPolicy = {
  symbols: ["INFY", "TCS"],
  capital: { allocated: 10_000, currency: "INR" },
  risk: {
    maxRiskPerTradePct: 1,
    maxDailyLossPct: 5,
    maxOpenPositions: 2,
    maxTradesPerDay: 2,
    maxPositionsOpenedPerDay: 1,
  },
};

describe("durable daily entry reservations", () => {
  test("counts each entry order while only flat-to-open entries consume the position cap", async () => {
    const { db, records } = makeDb();
    const now = new Date("2026-10-01T05:00:00.000Z");
    await reserveDailyEntry(db, "agent-a", policy, "INFY", true, { now });
    await reserveDailyEntry(db, "agent-a", policy, "INFY", false, { now });
    const usage = [...records.values()][0]!;
    expect(usage.marketDate).toBe("2026-10-01");
    expect(usage.tradesReserved).toBe(2);
    expect(usage.positionsOpenedReserved).toBe(1);
  });

  test("fails closed when either daily cap is reached", async () => {
    const byPositions = makeDb();
    await reserveDailyEntry(byPositions.db, "agent-a", policy, "INFY", true, { now: new Date("2026-10-01T05:00:00.000Z") });
    await expect(reserveDailyEntry(byPositions.db, "agent-a", policy, "TCS", true, { now: new Date("2026-10-01T05:00:00.000Z") }))
      .rejects.toThrow("Maximum positions opened");

    const byTrades = makeDb();
    await reserveDailyEntry(byTrades.db, "agent-a", policy, "INFY", false, { now: new Date("2026-10-01T05:00:00.000Z") });
    await reserveDailyEntry(byTrades.db, "agent-a", policy, "TCS", false, { now: new Date("2026-10-01T05:00:00.000Z") });
    await expect(reserveDailyEntry(byTrades.db, "agent-a", policy, "INFY", false, { now: new Date("2026-10-01T05:00:00.000Z") }))
      .rejects.toThrow("Maximum trades");
  });
});

for (const timezone of ['Asia/Kolkata','UTC'] as const) {
  test(`${timezone}: durable reservation IDs reset exactly at local midnight`, async () => {
    const {db,records}=makeDb();
    const boundary=Date.parse(timezone==='UTC'?'2026-10-02T00:00:00Z':'2026-10-01T18:30:00Z');
    const before=new Date(boundary-1),after=new Date(boundary);
    await reserveDailyEntry(db,'agent-a',policy,'INFY',false,{timezone,now:before});
    await reserveDailyEntry(db,'agent-a',policy,'INFY',false,{timezone,now:before});
    await expect(reserveDailyEntry(db,'agent-a',policy,'INFY',false,{timezone,now:before})).rejects.toThrow('Maximum trades');
    await reserveDailyEntry(db,'agent-a',policy,'INFY',false,{timezone,now:after});
    expect([...records.keys()]).toEqual([`agent-a:${timezone}:2026-10-01`,`agent-a:${timezone}:2026-10-02`]);
    expect(records.get(`agent-a:${timezone}:2026-10-02`)!.tradesReserved).toBe(1);
  });
}

test('concurrent first reservations never exceed the daily cap',async()=>{
 const {db,records}=makeDb();
 const outcomes=await Promise.allSettled(Array.from({length:12},()=>reserveDailyEntry(db,'agent-a',policy,'INFY',false,{now:new Date('2026-10-01T05:00:00Z')})));
 expect(outcomes.filter(x=>x.status==='fulfilled')).toHaveLength(2);
 expect([...records.values()][0]!.tradesReserved).toBe(2);
});
test('database failures before entry become explicit safe refusals',async()=>{
 for(const code of [224,undefined]) {
  const db={collection:()=>({updateOne:async()=>{throw Object.assign(new Error('private database connection details'),{code});}})} as unknown as Db;
  await expect(reserveDailyEntry(db,'agent-a',policy,'INFY',true)).rejects.toThrow('No broker order was sent');
  try{await reserveDailyEntry(db,'agent-a',policy,'INFY',true);}catch(e){expect((e as Error).name).toBe('OrderRejectedError');expect((e as Error).message).not.toContain('private database');}
 }
});

import { PrismaClient } from "../src/generated/prisma/client";

// MongoDB does not migrate existing embedded documents when Prisma fields change.
// Only missing/null new fields are filled. Existing configured limits are preserved.
const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();
const fields = { maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 } as const;
try {
  const before = await prisma.$runCommandRaw({
    aggregate: "Agent",
    pipeline: [
      { $match: { risk: { $type: "object" } } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        ...Object.fromEntries(Object.keys(fields).map(field => [field, {
          $sum: { $cond: [{ $eq: [{ $ifNull: [`$risk.${field}`, null] }, null] }, 1, 0] },
        }])),
      } },
    ], cursor: {},
  });
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", counts: before.cursor }, null, 2));
  if (apply) {
    const result = await prisma.$runCommandRaw({
      update: "Agent",
      updates: Object.entries(fields).map(([field, value]) => ({
        q: { risk: { $type: "object" }, [`risk.${field}`]: null },
        u: { $set: { [`risk.${field}`]: value } },
        multi: true,
      })),
      ordered: true,
    });
    if (result.writeErrors || result.writeConcernError || result.ok !== 1) {
      throw new Error("Backfill write was not acknowledged");
    }
    console.log(JSON.stringify({ matched: result.n, modified: result.nModified }));
  }
  // Typed decoding reproduces the original failure if any new fields remain incompatible.
  const decoded = await prisma.agent.findMany({ select: { id: true, risk: true } });
  console.log(JSON.stringify({ typedAgentsRead: decoded.length }));
} catch {
  console.error("Agent daily-limit compatibility check failed. No credentials or account data are logged.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

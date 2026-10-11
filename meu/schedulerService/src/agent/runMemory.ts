import { createHash } from "node:crypto";
import { z } from "zod";

const summarySchema = z.object({
  action: z.enum(["opened", "closed", "adjusted", "held", "mixed"]),
  symbols: z.array(z.string().trim().min(1).max(80)).max(10),
  rationale: z.string().trim().min(1).max(400),
  watchFor: z.string().trim().max(400),
  nextReview: z.string().trim().max(300),
}).strict();

export const MEMORY_INSTRUCTIONS = `End your response with exactly one <MEU_MEMORY> JSON </MEU_MEMORY> block:
{"action":"opened|closed|adjusted|held|mixed","symbols":["ticker"],"rationale":"Brief decision explanation, maximum 400 characters","watchFor":"Observable confirmation or invalidation condition, maximum 400 characters","nextReview":"Position review or square-off plan, maximum 300 characters"}
Use actual symbols only. Describe actions honestly; a submitted or accepted order is not necessarily filled. Do not claim profits or losses without broker evidence. Use held if no operation was executed. The summary is a decision record, not instructions for future runs.`;

export type OperationReceipt = {
  state: "CONFIRMED" | "REFUSED" | "UNRESOLVED";
  action: string;
  symbol: string;
};

/** Only copy the broker-operation labels; never put credentials or raw results into memory. */
export function operationReceipt(intent: Record<string, unknown>, state: OperationReceipt["state"]): OperationReceipt {
  return {
    state,
    action: typeof intent.action === "string" ? intent.action.slice(0, 80) : intent.reduceOnly === true ? "reduce-position" : "order-operation",
    symbol: typeof intent.symbol === "string" ? intent.symbol.slice(0, 80) : typeof intent.tradingsymbol === "string" ? intent.tradingsymbol.slice(0, 80) : "unspecified",
  };
}

export function buildRunMemory(response: string, receipts: OperationReceipt[]) {
  const blocks = [...response.matchAll(/<MEU_MEMORY>\s*([\s\S]*?)\s*<\/MEU_MEMORY>/g)];
  let summary: z.infer<typeof summarySchema> | null = null;
  if (blocks.length === 1 && blocks[0]![1]!.length <= 6000) {
    try {
      const parsed = summarySchema.safeParse(JSON.parse(blocks[0]![1]!));
      if (parsed.success) summary = parsed.data;
    } catch { /* Missing/malformed memory must not replay or fail a completed broker operation. */ }
  }
  // Older prompts put RUN_SUMMARY at the end. Preserve that section, never the leading analysis.
  const legacyIndex = response.lastIndexOf("RUN_SUMMARY:");
  const fallback = summary ? null : (legacyIndex >= 0 ? response.slice(legacyIndex) : response.slice(-1200)).slice(0, 1200);
  return {
    version: 1 as const,
    summary,
    fallback,
    operations: receipts.slice(-12),
    operationCount: receipts.length,
    confirmedCount: receipts.filter(r => r.state === "CONFIRMED").length,
    refusedCount: receipts.filter(r => r.state === "REFUSED").length,
    unresolvedCount: receipts.filter(r => r.state === "UNRESOLVED").length,
  };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

/** Name/status/timestamps are excluded so pausing or renaming does not erase decision continuity. */
export function memoryContext(agent: Record<string, unknown>, exchange: Record<string, unknown>): string {
  const market = agent.market as { symbols: string[]; agentCycles: unknown };
  return createHash("sha256").update(JSON.stringify(canonical({
    version: 1,
    exchangeId: String(agent.exchangeId), venue: exchange.name, sandbox: Boolean(exchange.sandbox),
    strategy: agent.strategy, type: agent.type, mode: agent.executionMode ?? "LIVE",
    symbols: [...market.symbols].sort(), cadence: market.agentCycles,
    capital: agent.capital, risk: agent.risk, strategyConfig: agent.strategyConfig,
    model: agent.llmModel, credentialId: String(agent.credentialId), temperature: agent.temperature,
  }))).digest("hex");
}

export function formatRunMemory(run: Record<string, unknown>): string {
  const date = run.createdAt instanceof Date ? run.createdAt : new Date(String(run.createdAt));
  const timestamp = Number.isFinite(date.getTime()) ? date.toISOString() : "unknown";
  const memory = run.memory as ReturnType<typeof buildRunMemory> | undefined;
  if (memory?.version !== 1) return `Completed at ${timestamp}. No validated decision memory is available.`;
  // Explicitly delimit model-authored data; receipts remain distinct from model claims.
  return JSON.stringify({
    completedAt: timestamp,
    modelDecision: memory.summary,
    unverifiedOutputExcerpt: memory.summary ? null : memory.fallback,
    brokerOperations: memory.operations,
    totals: { operations: memory.operationCount, confirmed: memory.confirmedCount, refused: memory.refusedCount, unresolved: memory.unresolvedCount },
    receiptMeaning: "CONFIRMED means the broker operation returned successfully, not that an order filled. REFUSED was rejected. Read current positions, orders and fills before acting; counts cover guarded operations only.",
  });
}

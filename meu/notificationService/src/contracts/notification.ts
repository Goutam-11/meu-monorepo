import { z } from "zod";

// ── Payload contract with schedulerService ─────────────────────────────
export const notificationSchema = z.object({
  deliveryId: z.string().uuid().optional(),
  runId: z.string().max(128).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  type: z.enum(["ERROR", "WARNING", "INFO"]),
  source: z.enum(["AGENT", "EXCHANGE", "SCHEDULER", "SYSTEM"]).catch("SYSTEM"),
  status: z.string().optional(),
  title: z.string(),
  code: z.string(),
  message: z.string().optional(),
  metadata: z.unknown().optional(),
  userId: z.string().min(1),
  agentId: z.string().nullable().optional(),
  exchangeId: z.string().nullable().optional(),
});

/** Scheduler may emit SCHEDULER as a source; the DB enum only knows AGENT|SYSTEM|EXCHANGE */
export const sourceMap = {
  AGENT: "AGENT",
  EXCHANGE: "EXCHANGE",
  SCHEDULER: "SYSTEM",
  SYSTEM: "SYSTEM",
} as const;

export type DeliveryContext = { deliveryId: string; runId?: string; jobId?: string; agentId?: string; exchangeId?: string };

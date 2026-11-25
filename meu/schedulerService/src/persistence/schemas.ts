import { z } from "zod";

// The BullMQ payload is a cross-process contract: the scheduler enqueues it and
// the worker consumes it after a restart, so parse it before touching Mongo.
export const agentJobDataSchema = z.object({
  agentId: z.string().regex(/^[a-f0-9]{24}$/i, "agentId must be a 24-character hex id"),
  userId: z.string().min(1),
  runAt: z.number().int().nonnegative(),
  recoveryFailure: z.object({
    version: z.literal(1),
    runId: z.string().min(1),
    brokerOperationRequested: z.literal(false),
    failedAt: z.string(),
    code: z.string(),
  }).optional(),
});
export type AgentJobData = z.infer<typeof agentJobDataSchema>;

// Execution documents are written by several processes and read by the worker
// and reconciler. Keep the fields those readers branch on in the schema.
export const agentExecutionSchema = z.object({
  _id: z.string().min(1),
  state: z.enum(["STARTED", "REVIEW_REQUIRED", "COMPLETED"]),
  agentId: z.string().min(1),
  startedAt: z.coerce.date(),
  finishedAt: z.coerce.date().optional(),
  reviewReason: z.string().optional(),
  outcome: z.string().optional(),
  failure: z.object({ brokerOperationRequested: z.boolean().optional() }).optional(),
  reconcile: z.object({
    notifiedAt: z.coerce.date().optional(),
    resolvedAt: z.coerce.date().optional(),
    outcome: z.string().optional(),
    reason: z.string().optional(),
  }).optional(),
});
export type AgentExecution = z.infer<typeof agentExecutionSchema>;

export const executionLockSchema = z.object({
  _id: z.string().min(1),
  executionId: z.string().min(1),
  createdAt: z.coerce.date(),
  kind: z.string().optional(),
  state: z.string().optional(),
});
export type ExecutionLock = z.infer<typeof executionLockSchema>;

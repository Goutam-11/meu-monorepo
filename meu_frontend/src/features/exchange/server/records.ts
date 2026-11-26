import { z } from 'zod';

// Raw-driver reads still exist for recovery and reconciliation. These schemas
// keep the row shapes explicit instead of trusting a generic type parameter.
export const lockRowSchema = z.object({
  _id: z.string().min(1),
  executionId: z.string().min(1),
  kind: z.string().optional(),
  state: z.string().optional(),
  createdAt: z.object({ $date: z.string() }).optional(),
});
export type LockRow = z.infer<typeof lockRowSchema>;

export const executionRowSchema = z.object({
  _id: z.string().min(1),
  state: z.string().min(1),
  agentId: z.string().min(1),
  reviewReason: z.string().optional(),
  startedAt: z.object({ $date: z.string() }).optional(),
  finishedAt: z.object({ $date: z.string() }).optional(),
  recovery: z.record(z.string(), z.any()).optional(),
  failure: z.object({
    stage: z.string().optional(),
    errorType: z.string().optional(),
    brokerOperationRequested: z.boolean().optional(),
  }).optional(),
});
export type ExecutionRow = z.infer<typeof executionRowSchema>;

export const intentRowSchema = z.object({
  _id: z.string().min(1),
  executionId: z.string().min(1),
  state: z.string().min(1),
  intent: z.object({
    symbol: z.string().optional(),
    clientOrderId: z.string().optional(),
    order_id: z.string().optional(),
    action: z.string().optional(),
    leverage: z.number().optional(),
    leverageCeiling: z.number().optional(),
  }).default({}),
});
export type IntentRow = z.infer<typeof intentRowSchema>;

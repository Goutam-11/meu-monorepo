import { describe, expect, test } from "bun:test";
import { agentExecutionSchema, agentJobDataSchema } from "../src/persistence/schemas";

describe("cross-process persistence schemas", () => {
  test("accepts a valid scheduler payload and rejects a malformed agent id", () => {
    expect(agentJobDataSchema.safeParse({ agentId: "a".repeat(24), userId: "owner", runAt: 1 }).success).toBe(true);
    const invalid = agentJobDataSchema.safeParse({ agentId: "bad", userId: "owner", runAt: 1 });
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.error.issues[0]?.path).toEqual(["agentId"]);
  });

  test("parses an execution document and rejects an unknown state", () => {
    const valid = agentExecutionSchema.safeParse({
      _id: "exec-1", state: "REVIEW_REQUIRED", agentId: "a".repeat(24), startedAt: new Date(0),
      failure: { brokerOperationRequested: false },
    });
    expect(valid.success).toBe(true);
    expect(agentExecutionSchema.safeParse({ _id: "exec-1", state: "UNKNOWN", agentId: "a".repeat(24), startedAt: new Date(0) }).success).toBe(false);
  });
});

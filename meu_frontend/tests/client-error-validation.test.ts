import { describe, expect, it } from "bun:test";
import { parseClientReport, readBoundedJsonBody } from "@/lib/client-error-validation";
import { reportClientError } from "@/lib/client-error-report";
import { safeLogCode, safeProcedureName } from "@/lib/log-safety";

describe("client error report validation", () => {
  it("accepts only the fixed source and event pairs", () => {
    expect(parseClientReport({ source: "query", event: "query_failed" })).toEqual({
      source: "query",
      code: "CLIENT_QUERY_FAILED",
    });
    expect(parseClientReport({ source: "query", event: "render_failed" })).toBeNull();
    expect(parseClientReport({ source: "mutation", event: "mutation_failed" })).toEqual({
      source: "mutation",
      code: "CLIENT_MUTATION_FAILED",
    });
    expect(parseClientReport({ source: "__proto__", event: "toString" })).toBeNull();
    expect(parseClientReport({ source: "query", event: "toString" })).toBeNull();
    expect(parseClientReport(Object.create({ source: "query", event: "query_failed" }))).toBeNull();
  });

  it("stops reading a streamed body after the byte limit", async () => {
    const req = new Request("http://localhost/api/client-errors", {
      method: "POST",
      body: new Blob([new Uint8Array(513)]).stream(),
      // Node's Request requires duplex for a streaming request body.
      duplex: "half",
    } as RequestInit);
    expect(await readBoundedJsonBody(req, 512)).toEqual({ ok: false, reason: "too_large" });
  });

  it("parses a small JSON body", async () => {
    const req = new Request("http://localhost/api/client-errors", {
      method: "POST",
      body: JSON.stringify({ source: "dashboard", event: "render_failed" }),
      headers: { "Content-Type": "application/json" },
    });
    const result = await readBoundedJsonBody(req, 512);
    expect(result.ok).toBe(true);
  });

  it("does nothing when reporting is called during server rendering", () => {
    expect(() => reportClientError("query", "query_failed")).not.toThrow();
  });

  it("keeps logged procedure names and error codes on fixed allowlists", () => {
    expect(safeProcedureName("agents.getAll")).toBe("trpc.agents.getAll");
    expect(safeProcedureName("token=attacker-controlled")).toBe("trpc.procedure");
    expect(safeLogCode("provider token leaked in message")).toBe("INTERNAL_SERVER_ERROR");
  });
});

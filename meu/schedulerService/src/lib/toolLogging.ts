import type { ToolSet } from "ai";
import { logger, errMeta } from "./logger";

const log = logger.child({ module: "tools" });

/** Observe tool outcomes without logging arguments, account data or provider text. */
export function instrumentTools<T extends ToolSet>(tools: T): T {
  for (const [toolName, tool] of Object.entries(tools)) {
    const execute = tool.execute;
    if (!execute) continue;
    tool.execute = async (...args) => {
      const startedAt = Date.now();
      log.info({ event: "tool.started", toolName }, "Agent tool started");
      try {
        const result = await execute(...args);
        const unsuccessful = result && typeof result === "object" &&
          (("success" in result && result.success === false) || ("ok" in result && result.ok === false));
        const fields = { event: unsuccessful ? "tool.unsuccessful" : "tool.completed", toolName, durationMs: Date.now() - startedAt };
        if (unsuccessful) log.warn(fields, "Agent tool returned an unsuccessful result");
        else log.info(fields, "Agent tool finished");
        return result;
      } catch (err) {
        log.error({ event: "tool.failed", toolName, durationMs: Date.now() - startedAt, ...errMeta(err) }, "Agent tool failed");
        throw err;
      }
    };
  }
  return tools;
}

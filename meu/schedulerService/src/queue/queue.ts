import { Queue } from "bullmq";
import { redis } from "@/lib/redis";
import { logger, errMeta } from "@/lib/logger";

const log = logger.child({ module: "queue" });

export const AGENT_QUEUE_NAME = "agent-execution";

export const agentQueue = new Queue(AGENT_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    // Keep recent history for inspection instead of deleting immediately
    removeOnComplete: { age: 3600, count: 1000 },
    // Keep failed jobs (DLQ-ish) for post-mortem; capped so Redis doesn't grow unbounded
    removeOnFail: { count: 5000 },
    attempts: 1,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

agentQueue.on("error", (err) => {
  log.error(errMeta(err), "Agent queue error");
});

// TODO: re-enable once real exchange sync logic exists in the worker
// export const exchangeQueue = new Queue("exchange-execution", {
//   connection: redis,
//   defaultJobOptions: {
//     removeOnComplete: { age: 3600, count: 1000 },
//     removeOnFail: { count: 5000 },
//     attempts: 1,
//     backoff: { type: "exponential", delay: 5000 },
//   },
// });

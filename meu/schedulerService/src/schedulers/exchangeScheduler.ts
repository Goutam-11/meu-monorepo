// DISABLED: the exchange-execution queue and worker are stubs with no real
// sync logic. Re-enable this scheduler, the exchangeQueue in src/queue/queue.ts
// and the exchange worker in src/workers/worker.ts together once sync is implemented.

// import { exchangeQueue } from "@/queue/queue";
// import { TICK_MS } from "@/config/config";
// import { logger } from "@/lib/logger";
//
// export function startExchangeScheduler() {
//   setInterval(async () => {
//     const now = Date.now();
//     // enqueue one dedupe-able job per active exchange (not per tick)
//   }, TICK_MS);
// }

export {};

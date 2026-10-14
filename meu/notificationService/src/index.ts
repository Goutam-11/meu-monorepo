import { main } from "./runtime/start-service";
import { log, errMeta } from "./infrastructure/logger";

if (import.meta.main) main().catch((err) => {
  log.fatal({ event: "service.startup_failed", ...errMeta(err) }, "Notification service startup failed");
  process.exit(1);
});

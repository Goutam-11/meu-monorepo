export type LogLevel = "info" | "warn" | "error";
export type LogEvent =
  | "agent.recovery.completed"
  | "agent.recovery.failed"
  | "exchange.recovery.completed"
  | "exchange.recovery.failed"
  | "agent.start.preflight.completed"
  | "agent.start.preflight.failed"
  | "trpc.mutation.completed"
  | "trpc.query.completed"
  | "trpc.query.failed"
  | "trpc.request.rejected"
  | "exchange.snapshot.failed"
  | "exchange.route.failed"
  | "client.error.reported"
  | "push.request.completed"
  | "push.request.failed";
export type LogCode =
  | "PARSE_ERROR" | "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "METHOD_NOT_SUPPORTED"
  | "TIMEOUT" | "CONFLICT" | "PRECONDITION_FAILED" | "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE"
  | "UNPROCESSABLE_CONTENT" | "PRECONDITION_REQUIRED" | "TOO_MANY_REQUESTS" | "CLIENT_CLOSED_REQUEST"
  | "INTERNAL_SERVER_ERROR" | "BAD_GATEWAY" | "BROKER_ERROR" | "REQUEST_FAILED"
  | "CLIENT_QUERY_FAILED" | "CLIENT_MUTATION_FAILED" | "CLIENT_SETTINGS_LOAD_FAILED" | "CLIENT_SETTINGS_SAVE_FAILED"
  | "CLIENT_RENDER_FAILED" | "CLIENT_SUBSCRIPTION_FAILED" | "CLIENT_PUSH_UNSUBSCRIBE_FAILED" | "CLIENT_PUSH_NOT_CONFIGURED";
export type LogOperation = "trpc.backtests.createAgent" | "trpc.backtests.paperState" | "trpc.backtests.paperSessions" | "trpc.backtests.catalog" | "trpc.backtests.run" | "trpc.backtests.list" | "trpc.backtests.get" | "trpc.backtests.chart" | "trpc.backtests.export" | "trpc.backtests.delete" | "trpc.procedure" | "trpc.request" | "trpc.agents.getAll" | "trpc.agents.getOne" | "trpc.agents.create"
  | "trpc.agents.delete" | "trpc.agents.statusChange" | "trpc.agents.update" | "trpc.agents.updateCryptoAlgorithm" | "trpc.agents.runs" | "trpc.agents.entryPreview"
  | "trpc.exchange.markets" | "trpc.exchange.getAll" | "trpc.exchange.getPaginated" | "trpc.exchange.create" | "trpc.exchange.getOne"
  | "trpc.exchange.update" | "trpc.exchange.delete" | "trpc.exchange.kiteAuth" | "trpc.exchange.kiteLoginUrl" | "trpc.exchange.executionState" | "trpc.exchange.updateAccountRisk" | "trpc.exchange.reconciliation" | "trpc.exchange.recoverExecution" | "trpc.exchange.pauseForRecovery"
  | "trpc.credentials.getAll" | "trpc.credentials.listAll" | "trpc.credentials.getByType" | "trpc.credentials.create"
  | "trpc.credentials.getOne" | "trpc.credentials.update" | "trpc.credentials.delete" | "trpc.credentials.models"
  | "trpc.notifications.onUpdate" | "trpc.notifications.getAll" | "trpc.notifications.getOne"
  | "trpc.notifications.getUnread" | "trpc.notifications.delete" | "trpc.notifications.markAllRead" | "trpc.notifications.markAsRead"
  | "trpc.settings.getUi" | "trpc.settings.updateUi" | "trpc.exData.getById" | "exchange.snapshot" | "exchange.positions"
  | "exchange.trades" | "exchange.balance" | "kite.positions" | "kite.trades" | "kite.balance"
  | "push.subscribe" | "push.unsubscribe" | "trpc.charts.candles" | "trpc.charts.search" | "trpc.charts.agents";
export type LogSource = "query" | "mutation" | "settings" | "dashboard" | "notification";
const procedureNames = new Set<LogOperation>([
  "trpc.charts.candles", "trpc.charts.search", "trpc.charts.agents",
  "trpc.backtests.createAgent", "trpc.backtests.paperState", "trpc.backtests.paperSessions",
  "trpc.backtests.catalog", "trpc.backtests.run", "trpc.backtests.list", "trpc.backtests.get", "trpc.backtests.chart", "trpc.backtests.export", "trpc.backtests.delete",
  "trpc.agents.getAll", "trpc.agents.getOne", "trpc.agents.create", "trpc.agents.delete", "trpc.agents.statusChange", "trpc.agents.update", "trpc.agents.updateCryptoAlgorithm", "trpc.agents.runs", "trpc.agents.entryPreview",
  "trpc.exchange.markets", "trpc.exchange.getAll", "trpc.exchange.getPaginated", "trpc.exchange.create", "trpc.exchange.getOne", "trpc.exchange.update", "trpc.exchange.delete", "trpc.exchange.kiteAuth", "trpc.exchange.kiteLoginUrl", "trpc.exchange.executionState", "trpc.exchange.updateAccountRisk", "trpc.exchange.reconciliation", "trpc.exchange.recoverExecution", "trpc.exchange.pauseForRecovery",
  "trpc.credentials.getAll", "trpc.credentials.listAll", "trpc.credentials.getByType", "trpc.credentials.create", "trpc.credentials.getOne", "trpc.credentials.update", "trpc.credentials.delete", "trpc.credentials.models",
  "trpc.notifications.onUpdate", "trpc.notifications.getAll", "trpc.notifications.getOne", "trpc.notifications.getUnread", "trpc.notifications.delete", "trpc.notifications.markAllRead", "trpc.notifications.markAsRead",
  "trpc.settings.getUi", "trpc.settings.updateUi", "trpc.exData.getById",
]);
const logCodes = new Set<LogCode>([
  "PARSE_ERROR", "BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "METHOD_NOT_SUPPORTED",
  "TIMEOUT", "CONFLICT", "PRECONDITION_FAILED", "PAYLOAD_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE",
  "UNPROCESSABLE_CONTENT", "PRECONDITION_REQUIRED", "TOO_MANY_REQUESTS", "CLIENT_CLOSED_REQUEST",
  "INTERNAL_SERVER_ERROR", "BAD_GATEWAY", "BROKER_ERROR", "REQUEST_FAILED", "CLIENT_QUERY_FAILED", "CLIENT_MUTATION_FAILED",
  "CLIENT_SETTINGS_LOAD_FAILED", "CLIENT_SETTINGS_SAVE_FAILED", "CLIENT_RENDER_FAILED", "CLIENT_SUBSCRIPTION_FAILED",
  "CLIENT_PUSH_UNSUBSCRIBE_FAILED", "CLIENT_PUSH_NOT_CONFIGURED",
]);


export function isRequestId(value: string | null | undefined): value is string {
  return Boolean(value && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value));
}

export function safeLogCode(value: string): LogCode {
  return logCodes.has(value as LogCode) ? value as LogCode : "INTERNAL_SERVER_ERROR";
}

export function safeProcedureName(path: string): LogOperation {
  const candidate = `trpc.${path}` as LogOperation;
  return procedureNames.has(candidate) ? candidate : "trpc.procedure";
}

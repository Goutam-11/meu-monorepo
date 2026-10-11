import { LlmMarketDataError } from "../agentFunctions/cmFunctions";
import { DeltaDataError, DeltaDataValidationError } from '../../../../shared/trading/delta-data';
import { MissedLiveCandlesError } from '../agent/cryptoStrategyConfig';
import { OrderRejectedError, DeltaLeverageUncertainError, CryptoSettingsUncertainError, CryptoProtectionError } from '../agent/tradeGuard';

export class ExecutionLockReviewError extends Error {
  constructor(readonly scope:string, readonly ownerExecutionId?:string, readonly ownerState?:string) {
    super('Unresolved or concurrent account execution; review ExecutionLocks before resuming');
    this.name='ExecutionLockReviewError';
  }
}
/** Safe operational details. SDK messages/stack/headers can contain signed credentials. */
export function executionFailure(error: unknown, context: {stage:string;runId:string;scheduledAt:number;mode:string;strategy:string;symbols:string[];lockCount:number;cadenceSeconds?:number;candleTimeframe?:string;llmProvider?:string;llmEndpoint?:string;llmModel?:string;brokerOperationRequested?:boolean;llmRequestTimeoutMs?:number}) {
  const names = new Set(['Error','TimeoutError','AbortError','TypeError','RangeError','SyntaxError','NetworkError','RequestTimeout','AuthenticationError','PermissionDenied','InsufficientFunds','InvalidOrder','RateLimitExceeded','ExchangeError','MongoServerError','AI_APICallError','APICallError']);
  const errorType = error instanceof LlmMarketDataError ? error.name : error instanceof CryptoProtectionError ? 'CryptoProtectionError' : error instanceof DeltaDataError || error instanceof DeltaDataValidationError ? error.name : error instanceof CryptoSettingsUncertainError ? 'CryptoSettingsUncertainError' : error instanceof DeltaLeverageUncertainError ? 'DeltaLeverageUncertainError' : error instanceof MissedLiveCandlesError ? 'MissedLiveCandlesError' : error instanceof OrderRejectedError ? 'OrderRejectedError' : error instanceof Error && names.has(error.name) ? error.name : 'Error';
  const statusValue = error && typeof error==='object' && 'statusCode' in error ? error.statusCode : undefined;
  const httpStatus = typeof statusValue==='number' && Number.isInteger(statusValue) && statusValue>=400 && statusValue<=599 ? statusValue : undefined;
  let code='EXECUTION_FAILED', summary=`Agent execution failed during ${context.stage.replaceAll('_',' ')}.`, nextAction='Keep the agent paused. Inspect account reconciliation and the recorded run ID before resuming; do not repeat uncertain orders.';
  if (error instanceof LlmMarketDataError || error instanceof DeltaDataError || error instanceof DeltaDataValidationError) {code=error.code;summary=error.message;}
  else if (error instanceof MissedLiveCandlesError) {code=error.code;summary=error.message;nextAction='Pause other live agents on this account, inspect positions and orders, then use Resume for verified missed-candle recovery.';}
  else if(error instanceof CryptoProtectionError){code=error.code;summary=error.message;nextAction='Pause linked live agents. Inspect broker positions and protective conditional orders, close any remaining unprotected position on the exchange, then use account recovery. No entry is replayed.';}
  else if (error instanceof DeltaLeverageUncertainError || error instanceof CryptoSettingsUncertainError) {code=error.code;summary=error.message;nextAction='Keep linked live agents paused. Open Exchanges → account recovery, verify the isolated ticker leverage and recover the setting intent. No entry is replayed.';}
  else if (error instanceof OrderRejectedError) {code='EXECUTION_GUARD_REJECTED';summary=/(?:https?:\/\/|api[_-]?key=|authorization|bearer|secret=|token=)/i.test(error.message) ? 'An execution guard rejected this run. Review agent risk settings and account exposure.' : error.message.slice(0,600);}
  else if (['AuthenticationError','PermissionDenied'].includes(errorType) || httpStatus===401 || httpStatus===403) {code='EXECUTION_AUTH_FAILED';summary='The provider or exchange refused authentication or permissions.';nextAction='Check the saved key, permissions, region and IP allowlist. Keep the agent paused until access is verified.';}
  else if (httpStatus && httpStatus>=500) {code='EXECUTION_UPSTREAM_FAILED';summary='The provider or exchange returned a temporary server error.';}
  else if (errorType==='InsufficientFunds') {code='EXECUTION_INSUFFICIENT_FUNDS';summary='The exchange reported insufficient available funds or margin.';}
  else if (errorType==='RateLimitExceeded' || httpStatus===429) {code='EXECUTION_RATE_LIMIT';summary='The provider or exchange rate limited this run.';}
  else if (errorType==='TimeoutError' && ['LLM_TRADING','HYBRID'].includes(context.strategy)) {
    code='LLM_REQUEST_TIMEOUT';
    summary=`${context.llmProvider==='bedrock' ? 'Amazon Bedrock' : 'The LLM provider'} did not finish the LLM request ${context.llmRequestTimeoutMs ? `within ${context.llmRequestTimeoutMs/1000} seconds` : 'before the request deadline'}.`;
    nextAction='The request timed out; this does not prove that model access was denied. Check provider connectivity and latency. If no broker operation was requested, Meu will release the run locks and retry later.';
  }
  else if (['NetworkError','RequestTimeout'].includes(errorType)) {code='EXECUTION_NETWORK_FAILED';summary='A provider or exchange connection failed or timed out.';}
  else if (error instanceof Error && error.message==='Unresolved or concurrent account execution; review ExecutionLocks before resuming') {code='EXECUTION_LOCK_REVIEW';summary='An execution lock is busy, abandoned or retained for review.';}
  let providerReason: string | undefined;
  const llmApiError = ['AI_APICallError','APICallError'].includes(errorType) && ['LLM_TRADING','HYBRID'].includes(context.strategy);
  if (llmApiError && httpStatus && [400,404,422].includes(httpStatus)) {
    code='LLM_REQUEST_REJECTED';
    summary=`The LLM provider rejected the model request (HTTP ${httpStatus}).`;
    nextAction='Check the selected model, provider region, API compatibility, key permissions and generation settings. Correct the configuration before resuming.';
    // Keep approved reasons only; arbitrary provider messages can echo keys,
    // prompts, signed URLs or headers. Never copy the response body.
    try {
      const body = error && typeof error==='object' && 'responseBody' in error ? error.responseBody : undefined;
      const parsed = typeof body==='string' && body.length<10000 ? JSON.parse(body) : undefined;
      const message=parsed?.message ?? parsed?.Message ?? parsed?.error?.message;
      if (message==='Operation not allowed') {
        providerReason='Operation not allowed';code='LLM_OPERATION_NOT_ALLOWED';
        summary=`${context.llmProvider==='bedrock' ? 'Amazon Bedrock' : 'The LLM provider'} refused the LLM request: Operation not allowed (HTTP ${httpStatus}).`;
        nextAction='Check that AWS permits inference for this account, key, model and region, and that the model supports the selected Bedrock API. Test it in the Bedrock console, then resume. This response does not identify which AWS restriction applies.';
      }
    } catch { /* Keep the safe HTTP classification for malformed responses. */ }
  }
  return {
    ...(error instanceof DeltaLeverageUncertainError || error instanceof CryptoSettingsUncertainError ? {brokerSettingOperation:error instanceof CryptoSettingsUncertainError?'crypto-leverage':'delta-leverage',targetLeverage:error.leverage,entryOrderRequested:false} : {}),
    ...(providerReason ? {providerReason} : {}),
    ...(error instanceof ExecutionLockReviewError ? {blockedLockScope:error.scope,lockOwnerExecutionId:error.ownerExecutionId,lockOwnerState:error.ownerState} : {}),
    ...context, code,errorType,summary,nextAction,failedAt:new Date().toISOString(),scheduledAt:new Date(context.scheduledAt).toISOString(),
    ...(httpStatus ? {httpStatus} : {}),...(error instanceof DeltaDataError ? error.details() : {}),
  };
}

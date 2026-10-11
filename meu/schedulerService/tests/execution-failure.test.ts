import {DeltaLeverageUncertainError} from '../src/agent/tradeGuard';
import {test,expect} from 'bun:test';
import {executionFailure} from '../src/workers/executionFailure';
import {DeltaDataError,DeltaDataValidationError} from '../../../shared/trading/delta-data';
import {OrderRejectedError} from '../src/agent/tradeGuard';
const context={stage:'execute_strategy',runId:'run-1',scheduledAt:Date.now(),mode:'LIVE',strategy:'LLM_TRADING',symbols:['BTCUSD'],lockCount:3};
test('SDK error text, stack, headers and signed URLs are never copied to failure records',()=>{
 const error=Object.assign(new Error('Bearer secret https://provider.example?api_key=secret'),{name:'AI_APICallError',statusCode:401,response:{headers:{authorization:'secret'}}});
 const failure=executionFailure(error,context);
 expect(failure).toMatchObject({code:'EXECUTION_AUTH_FAILED',httpStatus:401,errorType:'AI_APICallError',stage:'execute_strategy',runId:'run-1'});
 const saved=JSON.stringify(failure);expect(saved).not.toContain('secret');expect(saved).not.toContain('provider.example');expect(saved).not.toContain('headers');
});
test('public transport failures retain typed detail, and invalid candle validation remains informative',()=>{
 expect(executionFailure(new DeltaDataError('DELTA_DATA_RATE_LIMIT','candle history',2,429,120000),context)).toMatchObject({code:'DELTA_DATA_RATE_LIMIT',endpoint:'candle history',attempts:2,httpStatus:429,retryAfterMs:120000});
 expect(executionFailure(new DeltaDataValidationError('Delta candle history contains a gap.'),context)).toMatchObject({code:'DELTA_DATA_INVALID',summary:'Delta candle history contains a gap.'});
});
test('application-owned guard messages retain the reason while suspicious values are redacted',()=>{
 expect(executionFailure(new OrderRejectedError('Maximum daily trades reached'),context).summary).toBe('Maximum daily trades reached');
 expect(executionFailure(new OrderRejectedError('api_key=secret'),context).summary).not.toContain('secret');
});

test('Bedrock disallowed operation identifies the LLM reason without copying private response fields',()=>{
 const e=Object.assign(new Error('private SDK text'),{name:'AI_APICallError',statusCode:400,responseBody:JSON.stringify({message:'Operation not allowed',key:'synthetic-secret'})});
 const failure=executionFailure(e,{...context,stage:'llm_request',llmProvider:'bedrock',llmModel:'model-id',brokerOperationRequested:false});
 expect(failure).toMatchObject({code:'LLM_OPERATION_NOT_ALLOWED',providerReason:'Operation not allowed',httpStatus:400,stage:'llm_request',llmProvider:'bedrock'});
 expect(failure.summary).toContain('Amazon Bedrock');expect(failure.nextAction).toContain('Bedrock console');expect(JSON.stringify(failure)).not.toContain('synthetic-secret');
 const unknown=executionFailure(Object.assign(new Error('private'),{name:'AI_APICallError',statusCode:400,responseBody:'{"message":"secret https://private"}'}),context);
 expect(unknown.code).toBe('LLM_REQUEST_REJECTED');expect(JSON.stringify(unknown)).not.toContain('private');
});

test('native deadline errors preserve the specific LLM timeout rather than a generic execution failure',()=>{
 const failure=executionFailure(new DOMException('private timeout details','TimeoutError'),{...context,llmProvider:'bedrock',llmRequestTimeoutMs:120000});
 expect(failure).toMatchObject({code:'LLM_REQUEST_TIMEOUT',errorType:'TimeoutError'});
 expect(failure.summary).toContain('120 seconds');expect(failure.summary).toContain('Amazon Bedrock');
 expect(JSON.stringify(failure)).not.toContain('private timeout details');
});


test('automatic leverage failures identify a setting operation and confirm no entry was sent',()=>{
 const failure=executionFailure(new DeltaLeverageUncertainError('BTCUSD',2),{stage:'execute_strategy',runId:'run',scheduledAt:Date.now(),mode:'LIVE',strategy:'ALGO_TRADING',symbols:['BTCUSD'],lockCount:3,brokerOperationRequested:true});
 expect(failure).toMatchObject({code:'DELTA_LEVERAGE_UNCERTAIN',errorType:'DeltaLeverageUncertainError',brokerSettingOperation:'delta-leverage',targetLeverage:2,entryOrderRequested:false});
 expect(failure.summary).toContain('No entry order was sent');expect(failure.nextAction).toContain('account recovery');
});

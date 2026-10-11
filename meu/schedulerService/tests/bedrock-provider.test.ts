import { test, expect } from 'bun:test';
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { llmProviderMap, resolveLLMProvider } from '../src/agent/providers';

test('Bedrock requires explicit saved key and region, without using ambient AWS credentials', () => {
  expect(resolveLLMProvider('bedrock').id).toBe('bedrock');
  for (const config of [{apiKey:'',region:'ap-south-1'},{apiKey:'fixture',region:undefined},{apiKey:'fixture',region:'https://foreign.test'}])
    expect(() => llmProviderMap.bedrock.createModel({...config,model:'amazon.nova-lite-v1:0'})).toThrow('requires');
});
test('native AI SDK Bedrock adapter sends stored bearer key to saved region and completes a tool loop offline', async () => {
  const previous = globalThis.fetch;
  const requests: {url:string;authorization:string|null;body:Record<string,any>}[]=[];
  let inspected = false;
  globalThis.fetch = (async (input, init) => {
    const request = input instanceof Request ? new Request(input,init) : new Request(String(input),init);requests.push({url:request.url,authorization:request.headers.get('authorization'),body:await request.json() as Record<string,any>});
    return Response.json({output:{message:{role:'assistant',content:requests.length===1?[{toolUse:{toolUseId:'inspect-1',name:'inspect',input:{symbol:'XRPUSD'}}}]:[{text:'Checked market'}]}},stopReason:requests.length===1?'tool_use':'end_turn',usage:{inputTokens:5,outputTokens:5,totalTokens:10},metrics:{latencyMs:1}});
  }) as typeof fetch;
  try {
    const result = await generateText({
      model:llmProviderMap.bedrock.createModel({apiKey:'saved-bedrock-key',region:'ap-south-1',model:'amazon.nova-lite-v1:0'}),
      prompt:'Check the market using the inspect tool.',stopWhen:stepCountIs(2),
      tools:{inspect:tool({inputSchema:z.object({symbol:z.string()}),execute:async ({symbol})=>{expect(symbol).toBe('XRPUSD');inspected=true;return{market:'fixture'};}})},
    });
    expect(inspected).toBe(true);expect(result.text).toBe('Checked market');expect(requests).toHaveLength(2);
    expect(requests[0]?.url).toBe('https://bedrock-runtime.ap-south-1.amazonaws.com/model/amazon.nova-lite-v1%3A0/converse');
    expect(requests[0]?.authorization).toBe('Bearer saved-bedrock-key');
    expect(requests[0]?.body.toolConfig.tools[0].toolSpec.name).toBe('inspect');
    expect(JSON.stringify(requests[1]?.body.messages)).toContain('toolResult');
  } finally {globalThis.fetch=previous;}
});

test('Mantle uses the saved region and its exact model ID and completes a client-side tool loop offline', async () => {
 const previous=globalThis.fetch;const requests:{url:string;body:Record<string,any>}[]=[];let inspected=false;
 globalThis.fetch=(async(input,init)=>{
  const request=input instanceof Request?new Request(input,init):new Request(String(input),init);
  expect(request.headers.get('authorization')).toBe('Bearer mantle-fixture-key');
  requests.push({url:request.url,body:await request.json() as Record<string,any>});
  return Response.json({id:'fixture',object:'chat.completion',created:1,model:'openai.gpt-oss-20b',choices:[{index:0,message:requests.length===1?{role:'assistant',content:null,tool_calls:[{id:'inspect-1',type:'function',function:{name:'inspect',arguments:'{"symbol":"XRPUSD"}'}}]}:{role:'assistant',content:'Checked market'},finish_reason:requests.length===1?'tool_calls':'stop'}],usage:{prompt_tokens:5,completion_tokens:5,total_tokens:10}});
 }) as typeof fetch;
 try {
  const result=await generateText({model:llmProviderMap.bedrock.createModel({apiKey:'mantle-fixture-key',region:'us-east-1',bedrockEndpoint:'mantle',model:'openai.gpt-oss-20b'}),prompt:'Inspect only.',stopWhen:stepCountIs(2),tools:{inspect:tool({inputSchema:z.object({symbol:z.string()}),execute:async({symbol})=>{expect(symbol).toBe('XRPUSD');inspected=true;return{market:'fixture'};}})}});
  expect(inspected).toBe(true);expect(result.text).toBe('Checked market');expect(requests).toHaveLength(2);
  expect(requests[0]?.url).toBe('https://bedrock-mantle.us-east-1.api.aws/v1/chat/completions');
  expect(requests[0]?.body.model).toBe('openai.gpt-oss-20b');expect(requests[0]?.body.tools[0].function.name).toBe('inspect');
  expect(requests[1]?.body.messages.some((m:any)=>m.role==='tool'&&m.tool_call_id==='inspect-1')).toBe(true);
 }finally{globalThis.fetch=previous;}
});

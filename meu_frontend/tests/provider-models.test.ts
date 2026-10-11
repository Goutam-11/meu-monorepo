import {afterAll,beforeEach,expect,mock,test} from 'bun:test';
import {CredentialType} from '../src/generated/prisma/enums';

type Row={id:string;userId:string;type:CredentialType;apiKey:string;region:string|null;bedrockEndpoint?:string};
const rows=new Map<string,Row>();let nextId=0;let calls:{url:string;headers:Headers}[]=[];
let handle:(url:URL)=>Response=()=>new Response('{}');
const originalFetch=globalThis.fetch;
mock.module('server-only',()=>({}));
mock.module('@/lib/encryption',()=>({decryptSecret:(value:string)=>value}));
mock.module('@/lib/db',()=>({default:{credentials:{findFirst:async({where}:{where:{id:string;userId:string}})=>{const row=rows.get(where.id);return row?.userId===where.userId?row:null;}}}}));
const {loadCredentialModels,searchCredentialModels,parseProviderModels}=await import('../src/features/credentials/server/models');
const credential=(type:CredentialType,region:string|null=null)=>{const row={id:`key-${++nextId}`,userId:'owner',type,region,apiKey:'PRIVATE-KEY'};rows.set(row.id,row);return row;};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status});
const routerModel=(id:string,parameters=['tools'])=>({id,name:`Name ${id}`,supported_parameters:parameters,architecture:{input_modalities:['text'],output_modalities:['text']}});
beforeEach(()=>{calls=[];globalThis.fetch=(async(input,options)=>{const url=new URL(String(input));calls.push({url:String(url),headers:new Headers(options?.headers)});expect(options?.redirect).toBe('error');return handle(url);}) as typeof fetch;});
afterAll(()=>{globalThis.fetch=originalFetch;mock.restore();});

test('OpenRouter discovers text tool models and searches names and IDs without exposing keys',async()=>{
  const row=credential('OPENROUTER');handle=()=>json({data:[routerModel('a/chat'),routerModel('b/no-tools',[]),routerModel('a/chat'),{...routerModel('c/image'),architecture:{input_modalities:['text'],output_modalities:['image']}}]});
  const catalog=await loadCredentialModels('owner',row.id);
  expect(catalog.models).toHaveLength(1);expect(catalog.models[0]?.tools).toBe('supported');expect(calls[0]?.url).toBe('https://openrouter.ai/api/v1/models');
  expect(calls[0]?.headers.get('Authorization')).toBe('Bearer PRIVATE-KEY');expect(JSON.stringify(catalog)).not.toContain('PRIVATE-KEY');
  expect(searchCredentialModels(catalog,'Name a').total).toBe(1);
});

test('cache hits recheck ownership, rotated keys reload and concurrent requests share a fetch',async()=>{
  const row=credential('NVIDIA_NIM');handle=()=>json({data:[{id:'meta/llama',name:'Llama'}]});
  await Promise.all([loadCredentialModels('owner',row.id),loadCredentialModels('owner',row.id)]);expect(calls).toHaveLength(1);
  await loadCredentialModels('owner',row.id);expect(calls).toHaveLength(1);
  await expect(loadCredentialModels('other-user',row.id)).rejects.toMatchObject({code:'NOT_FOUND'});expect(calls).toHaveLength(1);
  row.apiKey='ROTATED';await loadCredentialModels('owner',row.id);expect(calls).toHaveLength(2);
  expect(calls[1]?.headers.get('Authorization')).toBe('Bearer ROTATED');
});

test('Anthropic uses native authentication and follows cursor pages',async()=>{
  const row=credential('ANTHROPIC');handle=url=>url.searchParams.has('after_id')?json({data:[{id:'claude-second',display_name:'Second'}],has_more:false}):json({data:[{id:'claude-first',display_name:'First'}],has_more:true,last_id:'claude-first'});
  const catalog=await loadCredentialModels('owner',row.id);expect(catalog.models).toHaveLength(2);
  expect(calls[0]?.headers.get('x-api-key')).toBe('PRIVATE-KEY');expect(calls[0]?.headers.get('anthropic-version')).toBe('2023-06-01');
  expect(calls[0]?.headers.has('Authorization')).toBe(false);expect(calls[1]?.url).toContain('after_id=claude-first');
});

test('OpenAI non-chat models are filtered and OpenCode supports environment gateways',async()=>{
  expect(parseProviderModels('OPENAI',[{id:'gpt-chat'},{id:'o3'},{id:'text-embedding-3'},{id:'gpt-image-1'},{id:'whisper-1'}]).map(m=>m.id)).toEqual(['gpt-chat','o3']);
  const previous=process.env.OPENCODE_BASE_URL;process.env.OPENCODE_BASE_URL='https://gateway.example/v1';
  try{const row=credential('OPENCODE');handle=()=>json({data:[{id:'custom/chat'}]});expect((await loadCredentialModels('owner',row.id)).models[0]?.id).toBe('custom/chat');expect(calls[0]?.url).toBe('https://gateway.example/v1/models');}
  finally{if(previous===undefined)delete process.env.OPENCODE_BASE_URL;else process.env.OPENCODE_BASE_URL=previous;}
});

test('upstream and malformed responses are sanitized, and failures are retryable',async()=>{
  const row=credential('OPENAI');handle=()=>new Response('PRIVATE-UPSTREAM-ERROR',{status:401});
  await expect(loadCredentialModels('owner',row.id)).rejects.toMatchObject({code:'BAD_GATEWAY'});
  try{await loadCredentialModels('owner',row.id);}catch(error){expect(String(error)).not.toContain('PRIVATE-UPSTREAM');expect(String(error)).not.toContain('PRIVATE-KEY');}
  handle=()=>json({data:[{id:'gpt-chat'}]});expect((await loadCredentialModels('owner',row.id)).models).toHaveLength(1);
  const malformed=credential('OPENAI');handle=()=>json({wrong:[]});await expect(loadCredentialModels('owner',malformed.id)).rejects.toMatchObject({code:'BAD_GATEWAY'});
});

test('Bedrock pins the saved region, includes active text models and paginated profiles',async()=>{
  const row=credential('AMAZON_BEDROCK','ap-south-1');handle=url=>url.pathname==='/foundation-models'?json({modelSummaries:[{modelId:'amazon.chat',modelName:'Nova',inputModalities:['TEXT'],outputModalities:['TEXT'],modelLifecycle:{status:'ACTIVE'}},{modelId:'amazon.old',inputModalities:['TEXT'],outputModalities:['TEXT'],modelLifecycle:{status:'LEGACY'}}]}):url.searchParams.has('nextToken')?json({inferenceProfileSummaries:[{inferenceProfileId:'unused',inferenceProfileArn:'arn:aws:bedrock:ap-south-1:123:application-inference-profile/custom',inferenceProfileName:'Custom',status:'ACTIVE',type:'APPLICATION'}]}):json({inferenceProfileSummaries:[{inferenceProfileId:'apac.amazon.chat',inferenceProfileName:'Regional',status:'ACTIVE',type:'SYSTEM_DEFINED'}],nextToken:'next-page'});
  const catalog=await loadCredentialModels('owner',row.id);expect(catalog.models).toHaveLength(3);expect(catalog.models.filter(m=>m.kind==='inference-profile')).toHaveLength(2);
  expect(calls.every(c=>new URL(c.url).hostname==='bedrock.ap-south-1.amazonaws.com')).toBe(true);expect(calls[2]?.url).toContain('nextToken=next-page');
  expect(catalog.warnings.join()).toContain('do not confirm');
});

test('Bedrock partial permissions preserve the available catalog and total refusal is actionable',async()=>{
  const row=credential('AMAZON_BEDROCK','us-east-1');handle=url=>url.pathname==='/foundation-models'?json({},403):json({inferenceProfileSummaries:[{inferenceProfileId:'us.chat',status:'ACTIVE',type:'SYSTEM_DEFINED'}]});
  const catalog=await loadCredentialModels('owner',row.id);expect(catalog.models).toHaveLength(1);expect(catalog.warnings.join()).toContain('ListFoundationModels');
  const denied=credential('AMAZON_BEDROCK','us-east-1');handle=()=>json({},403);await expect(loadCredentialModels('owner',denied.id)).rejects.toMatchObject({code:'BAD_GATEWAY'});
  const invalid=credential('AMAZON_BEDROCK','evil.example/');await expect(loadCredentialModels('owner',invalid.id)).rejects.toMatchObject({code:'BAD_REQUEST'});
});

test('search caps results and puts an exact model ID first',()=>{
  const catalog={loadedAt:'fixture',warnings:[],models:Array.from({length:100},(_,index)=>({id:`model-${index}`,name:`Model ${index}`,tools:'unknown' as const,kind:'model' as const}))};
  expect(searchCredentialModels(catalog,'model').models).toHaveLength(40);expect(searchCredentialModels(catalog,'model').total).toBe(100);
  expect(searchCredentialModels(catalog,'model-9').models[0]?.id).toBe('model-9');
});

test('Mantle discovery uses regional /v1/models and changes the catalog cache when endpoint changes',async()=>{
 const row:Row=credential('AMAZON_BEDROCK','us-east-1');row.bedrockEndpoint='mantle';
 handle=()=>json({data:[{id:'openai.gpt-oss-20b'},{id:'openai.gpt-oss-120b'},{id:'amazon.text-embedding'}]});
 const catalog=await loadCredentialModels('owner',row.id);
 expect(catalog.models.map(m=>m.id)).toEqual(['openai.gpt-oss-120b','openai.gpt-oss-20b']);
 expect(calls[0]?.url).toBe('https://bedrock-mantle.us-east-1.api.aws/v1/models');
 expect(calls[0]?.headers.get('Authorization')).toBe('Bearer PRIVATE-KEY');
 expect(JSON.stringify(catalog)).not.toContain('PRIVATE-KEY');
 row.bedrockEndpoint='runtime';handle=url=>url.pathname==='/foundation-models'?json({modelSummaries:[]}):json({inferenceProfileSummaries:[]});
 await loadCredentialModels('owner',row.id);expect(calls).toHaveLength(3);
 const foreign=credential('AMAZON_BEDROCK','https://foreign.test');rows.get(foreign.id)!.bedrockEndpoint='mantle';
 await expect(loadCredentialModels('owner',foreign.id)).rejects.toMatchObject({code:'BAD_REQUEST'});
 expect(calls).toHaveLength(3);
});

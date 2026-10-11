import 'server-only';
import {createHash} from 'node:crypto';
import {TRPCError} from '@trpc/server';
import prisma from '@/lib/db';
import {decryptSecret} from '@/lib/encryption';
import type {CredentialType} from '@/generated/prisma/enums';

export type ModelChoice={id:string;name:string;tools:'supported'|'unknown';kind:'model'|'inference-profile'};
type Catalog={models:ModelChoice[];loadedAt:string;warnings:string[]};
const cache=new Map<string,{data:Catalog;expires:number}>();
const pending=new Map<string,Promise<Catalog>>();
const providers={
  OPENAI:['https://api.openai.com/v1','OPENAI_BASE_URL'],
  OPENROUTER:['https://openrouter.ai/api/v1','OPENROUTER_BASE_URL'],
  NVIDIA_NIM:['https://integrate.api.nvidia.com/v1','NVIDIA_BASE_URL'],
  ANTHROPIC:['https://api.anthropic.com/v1','ANTHROPIC_BASE_URL'],
  OPENCODE:['https://opencode.ai/zen/v1','OPENCODE_BASE_URL'],
} as const;
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const strings=(value:unknown):string[]=>Array.isArray(value)?value.filter((v):v is string=>typeof v==='string'):[];
const label=(value:unknown,fallback:string)=>typeof value==='string'?value.replace(/[\u0000-\u001f]/g,'').slice(0,160):fallback;
const validId=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=512&&!/[\s\u0000-\u001f]/.test(value);

class CatalogFailure extends Error {constructor(public status:number){super('Model catalog request failed');}}
async function readJson(url:URL,headers:Record<string,string>,signal:AbortSignal) {
  const response=await fetch(url,{headers,signal,cache:'no-store',redirect:'error'});
  if(!response.ok)throw new CatalogFailure(response.status);
  if(!response.body)throw new CatalogFailure(502);
  const reader=response.body.getReader();let bytes=0,text='';const decoder=new TextDecoder();
  try {
    for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>8*1024*1024)throw new CatalogFailure(502);text+=decoder.decode(value,{stream:true});}
    text+=decoder.decode();return record(JSON.parse(text));
  } finally {await reader.cancel();}
}

export function parseProviderModels(type:Exclude<CredentialType,'AMAZON_BEDROCK'>,data:unknown):ModelChoice[] {
  if(!Array.isArray(data))throw new CatalogFailure(502);
  return data.flatMap(raw=>{
    const item=record(raw);if(!validId(item.id))return [];
    const id=item.id;
    const parameters=strings(item.supported_parameters);
    if(type==='OPENROUTER') {
      const architecture=record(item.architecture);
      if(!parameters.includes('tools')||!strings(architecture.output_modalities).includes('text')||!strings(architecture.input_modalities).includes('text'))return [];
    }
    // /models can include non-chat products; never offer embeddings, images, audio or rerankers.
    if(/embed|rerank|whisper|tts|dall-e|image|audio|realtime|transcri|moderation|guard|reward/i.test(id))return [];
    if(type==='OPENAI'&&!/^(gpt-|o\d|chatgpt-)/.test(id))return [];
    if(type==='ANTHROPIC'&&!id.startsWith('claude-'))return [];
    return [{id,name:label(item.name??item.display_name,id),tools:parameters.includes('tools')?'supported' as const:'unknown' as const,kind:'model' as const}];
  });
}

async function providerCatalog(type:Exclude<CredentialType,'AMAZON_BEDROCK'>,apiKey:string,signal:AbortSignal):Promise<Catalog> {
  const [defaultURL,env]=providers[type];
  const base=process.env[env]||defaultURL;
  const url=new URL(base.replace(/\/$/,'')+'/models');
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new CatalogFailure(502);
  const headers:Record<string,string>=type==='ANTHROPIC'?{'x-api-key':apiKey,'anthropic-version':'2023-06-01'}:{Authorization:`Bearer ${apiKey}`};
  if(type==='ANTHROPIC')url.searchParams.set('limit','100');
  const models:ModelChoice[]=[];const warnings:string[]=[];const cursors=new Set<string>();
  for(let page=0;page<10;page++) {
    const body=await readJson(url,headers,signal);models.push(...parseProviderModels(type,body.data));
    if(type!=='ANTHROPIC'||!body.has_more)break;
    if(!validId(body.last_id)||cursors.has(body.last_id))throw new CatalogFailure(502);
    cursors.add(body.last_id);url.searchParams.set('after_id',body.last_id);
    if(page===9)warnings.push('The provider returned more than 1,000 models. The catalog is limited to the first ten pages.');
  }
  return {models,loadedAt:new Date().toISOString(),warnings};
}

async function bedrockCatalog(apiKey:string,region:string|null,signal:AbortSignal):Promise<Catalog> {
  if(!/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(region??''))throw new TRPCError({code:'BAD_REQUEST',message:'Save a valid AWS region on this Bedrock credential first.'});
  const base=`https://bedrock.${region}.amazonaws.com`;const headers={Authorization:`Bearer ${apiKey}`};
  const models:ModelChoice[]=[];const warnings:string[]=[];
  let successes=0;
  try {
    const data=await readJson(new URL(base+'/foundation-models?byOutputModality=TEXT'),headers,signal);
    if(!Array.isArray(data.modelSummaries))throw new CatalogFailure(502);
    successes++;
    for(const raw of data.modelSummaries){const item=record(raw);if(!validId(item.modelId)||!strings(item.inputModalities).includes('TEXT')||!strings(item.outputModalities).includes('TEXT')||record(item.modelLifecycle).status!=='ACTIVE')continue;
      models.push({id:item.modelId,name:label(item.modelName,item.modelId),kind:'model',tools:'unknown'});
    }
  } catch {warnings.push('Foundation-model discovery is unavailable for this key or region. Check bedrock:ListFoundationModels permission.');}
  try {
    const url=new URL(base+'/inference-profiles?maxResults=1000');const cursors=new Set<string>();
    for(let page=0;page<10;page++) {
      const data=await readJson(url,headers,signal);
      if(!Array.isArray(data.inferenceProfileSummaries))throw new CatalogFailure(502);
      successes++;
      for(const raw of data.inferenceProfileSummaries){const item=record(raw);if(item.status!=='ACTIVE')continue;
        const id=item.type==='APPLICATION'?item.inferenceProfileArn:item.inferenceProfileId;
        if(validId(id))models.push({id,name:label(item.inferenceProfileName,id),kind:'inference-profile',tools:'unknown'});
      }
      if(!data.nextToken)break;
      if(typeof data.nextToken!=='string'||data.nextToken.length>2048||cursors.has(data.nextToken))throw new CatalogFailure(502);
      cursors.add(data.nextToken);url.searchParams.set('nextToken',data.nextToken);
      if(page===9)warnings.push('Inference-profile discovery was limited to ten pages. Use a custom ID for other profiles.');
    }
  } catch {warnings.push('Inference-profile discovery is incomplete or unavailable. Check bedrock:ListInferenceProfiles permission.');}
  if(!successes)throw new TRPCError({code:'BAD_GATEWAY',message:'Bedrock could not list models with this key and region. Check key expiry and ListFoundationModels / ListInferenceProfiles permissions, or enter a model ID manually.'});
  warnings.push('Bedrock catalog entries do not confirm Converse/tool support or invocation access. Choose a compatible model or inference profile for this region.');
  return {models,loadedAt:new Date().toISOString(),warnings};
}

async function mantleCatalog(apiKey:string,region:string|null,signal:AbortSignal):Promise<Catalog> {
  if(!/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(region??''))throw new TRPCError({code:'BAD_REQUEST',message:'Save a valid AWS region on this Bedrock credential first.'});
  const body=await readJson(new URL(`https://bedrock-mantle.${region}.api.aws/v1/models`),{Authorization:`Bearer ${apiKey}`},signal);
  return {models:parseProviderModels('OPENCODE',body.data),loadedAt:new Date().toISOString(),warnings:[
    'Mantle uses its own model IDs. Listing does not confirm inference or tool access. Choose a model supporting /v1/chat/completions; Responses-only models and models requiring /openai/v1 are not supported by this connection.',
  ]};
}

export async function loadCredentialModels(userId:string,credentialId:string) {
  // Recheck ownership on every request, including cache hits. Never return the decrypted key.
  const credential=await prisma.credentials.findFirst({where:{id:credentialId,userId}});
  if(!credential)throw new TRPCError({code:'NOT_FOUND',message:'AI credential not found.'});
  const base=credential.type==='AMAZON_BEDROCK'?'bedrock':process.env[providers[credential.type][1]]||providers[credential.type][0];
  const key=createHash('sha256').update(JSON.stringify([userId,credentialId,credential.type,credential.region,credential.bedrockEndpoint,credential.apiKey,base])).digest('hex');
  const hit=cache.get(key);if(hit&&hit.expires>Date.now())return hit.data;
  const existing=pending.get(key);if(existing)return existing;
  if(pending.size>=4)throw new TRPCError({code:'TOO_MANY_REQUESTS',message:'Model discovery is busy. Try again shortly.'});
  const task=(async()=>{
    try {
      const secret=decryptSecret(credential.apiKey);const signal=AbortSignal.timeout(20000);
      const data=credential.type==='AMAZON_BEDROCK' ? await (credential.bedrockEndpoint==='mantle' ? mantleCatalog(secret,credential.region,signal) : bedrockCatalog(secret,credential.region,signal)) : await providerCatalog(credential.type,secret,signal);
      data.models=[...new Map(data.models.map(model=>[model.id,model])).values()].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id)).slice(0,10000);
      if(cache.size>=32)cache.delete(cache.keys().next().value!);
      cache.set(key,{data,expires:Date.now()+5*60*1000});return data;
    } catch(error) {
      if(error instanceof TRPCError)throw error;
      if(error instanceof CatalogFailure&&(error.status===401||error.status===403))throw new TRPCError({code:'BAD_GATEWAY',message:'The provider refused model discovery. Check this credential’s key and model-list permissions, or enter a model ID manually.'});
      throw new TRPCError({code:'BAD_GATEWAY',message:'Could not load the provider model list. Retry or enter a model ID manually.'});
    }
  })();
  pending.set(key,task);try{return await task;}finally{pending.delete(key);}
}

export function searchCredentialModels(catalog:Catalog,query:string) {
  const search=query.trim().toLowerCase();
  const matches=catalog.models.filter(model=>`${model.id} ${model.name}`.toLowerCase().includes(search));
  matches.sort((a,b)=>Number(b.id.toLowerCase()===search)-Number(a.id.toLowerCase()===search));
  return {...catalog,models:matches.slice(0,40),total:matches.length};
}

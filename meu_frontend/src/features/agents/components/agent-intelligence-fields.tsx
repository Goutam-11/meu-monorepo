'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useFormContext,useWatch} from 'react-hook-form';
import type {z} from 'zod';
import {CredentialType} from '@/generated/prisma/enums';
import {useAllCredentials} from '@/features/credentials/hooks/use-credentials';
import {ModelPicker} from '@/features/credentials/components/model-picker';
import {agentFormSchema} from '@/features/agents/validation';
import {FormControl,FormDescription,FormField,FormItem,FormLabel,FormMessage} from '@/components/ui/form';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Slider} from '@/components/ui/slider';

const labels:Record<CredentialType,string>={OPENROUTER:'OpenRouter',OPENAI:'OpenAI',ANTHROPIC:'Anthropic',NVIDIA_NIM:'NVIDIA NIM',OPENCODE:'OpenCode Zen',AMAZON_BEDROCK:'Amazon Bedrock'};

export function AgentIntelligenceFields() {
  const form=useFormContext<z.infer<typeof agentFormSchema>>();
  const {data:credentials,isLoading,isError,refetch}=useAllCredentials();
  const assetType=useWatch({control:form.control,name:'type'});
  const credentialId=useWatch({control:form.control,name:'credentialId'});
  const selected=credentials?.find(credential=>credential.id===credentialId);
  const [chosenProvider,setChosenProvider]=useState<CredentialType|''>('');
  const provider=chosenProvider||selected?.type||'';
  const available=credentials?.filter(credential=>credential.type===provider)??[];
  return <section aria-labelledby="intelligence-heading" className="space-y-5 border-t border-border pt-8">
    <h2 id="intelligence-heading" className="text-xl font-semibold">Agent intelligence</h2>
    <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-2"><label id="provider-label" className="text-sm font-medium">AI provider</label><Select value={provider} disabled={isLoading} onValueChange={value=>{setChosenProvider(value as CredentialType);form.setValue('credentialId','',{shouldDirty:true});form.setValue('llmModel','',{shouldDirty:true});}}><SelectTrigger aria-labelledby="provider-label" className="w-full"><SelectValue placeholder="Choose a provider"/></SelectTrigger><SelectContent>{Object.values(CredentialType).map(type=><SelectItem key={type} value={type}>{labels[type]}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Choose the provider, then its saved credential and model.</p></div>
      <FormField control={form.control} name="credentialId" render={({field})=><FormItem><FormLabel>AI provider credential</FormLabel><Select value={field.value} disabled={isLoading||!provider||!available.length} onValueChange={value=>{field.onChange(value);form.setValue('llmModel','',{shouldDirty:true});}}><FormControl><SelectTrigger onBlur={field.onBlur} className="w-full"><SelectValue placeholder={isLoading?'Loading credentials…':'Select a saved credential'}/></SelectTrigger></FormControl><SelectContent>{available.map(credential=><SelectItem key={credential.id} value={credential.id}>{credential.displayName||labels[credential.type]} · {labels[credential.type]}{credential.type==='AMAZON_BEDROCK'?` · ${credential.bedrockEndpoint==='mantle'?'Mantle':'Runtime'}`:''}{credential.region?` · ${credential.region}`:''} · {credential.id.slice(-6)}</SelectItem>)}</SelectContent></Select><FormDescription>{provider&&!available.length&&!isLoading?<>No saved {labels[provider]} credential. <Link className="underline underline-offset-4" href="/credentials">Add one in Credentials</Link>.</>:'Model discovery uses this credential on the server; its key stays private.'}</FormDescription><FormMessage/></FormItem>}/>
      <FormField control={form.control} name="llmModel" render={({field})=><FormItem className="min-w-0"><FormLabel>LLM model</FormLabel><FormControl><ModelPicker key={credentialId||'unselected'} credentialId={credentialId} {...field}/></FormControl><FormDescription>Search by name or ID. Listing a model does not confirm tool support or account access.</FormDescription><FormMessage/></FormItem>}/>

    </div>
    {assetType==='CRYPTO' && <FormField control={form.control} name="strategyConfig.analysisTimeframe" render={({field})=><FormItem><FormLabel>Analysis candle timeframe</FormLabel><Select value={field.value??'1m'} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{['1m','5m','15m','1h','4h'].map(value=><SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><FormDescription>The model reads completed candles at this interval, separately from how often the agent runs. Saved agents without this setting keep 1-minute analysis; higher-timeframe context is included where supported.</FormDescription><FormMessage/></FormItem>}/>}
    <details data-agent-advanced><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Response settings</summary><div className="max-w-md pt-3">      <FormField control={form.control} name="temperature" render={({field})=><FormItem><FormLabel>Temperature ({field.value})</FormLabel><FormControl><Slider min={0} max={1} step={0.1} value={[field.value??0.7]} onValueChange={values=>field.onChange(values[0])}/></FormControl><FormDescription>Controls response variation where supported by the selected model.</FormDescription><FormMessage/></FormItem>}/></div></details>
    {isError&&<p role="alert" className="text-sm text-destructive">Could not load your saved credentials. <button type="button" className="underline underline-offset-4" onClick={()=>refetch()}>Retry credentials</button></p>}
  </section>;
}

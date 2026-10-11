'use client';

import {brokerCapabilities} from '../../../../../shared/trading/brokerCapabilities';
import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {useTRPC} from '@/trpc/client';
import {useFormContext, useWatch} from 'react-hook-form';
import type {z} from 'zod';
import {agentFormSchema} from '../validation';
import {defaultSizingPolicy} from '../../../../../shared/trading/sizing';
import {FormControl,FormDescription,FormField,FormItem,FormLabel,FormMessage} from '@/components/ui/form';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';

export function AgentSizingFields({exchangeName}:{exchangeName?:string}) {
  const form = useFormContext<z.infer<typeof agentFormSchema>>();
  const sizing = useWatch({control:form.control,name:'strategyConfig.sizing'});
  const exchangeId = useWatch({control:form.control,name:'exchangeId'});
  const nativeStop = sizing?.mode === 'STOP_LOSS';
  const capabilities=brokerCapabilities(exchangeName ?? '');
  const supportsStop = capabilities.nativeStop;
  const trpc = useTRPC();
  const account = useQuery(trpc.exchange.executionState.queryOptions({id:exchangeId},{enabled:supportsStop && Boolean(exchangeId) && Boolean(sizing)}));
  return <section className="space-y-5" aria-labelledby="sizing-heading">
    <div><h3 id="sizing-heading" className="text-lg font-medium">Position sizing and leverage</h3><p className="text-sm text-muted-foreground">Choose whether entries are bounded by their full value or by loss at a native stop.</p></div>
    <FormField control={form.control} name="strategyConfig.sizing" render={({field})=><FormItem><FormLabel>Sizing method</FormLabel><Select value={field.value?.mode ?? 'NOTIONAL'} onValueChange={mode=>{
      if (mode==='STOP_LOSS' && field.value?.mode!=='STOP_LOSS') form.setValue('risk.maxRiskPerTradePct',Math.min(form.getValues('risk.maxRiskPerTradePct'),2),{shouldDirty:true,shouldValidate:true});
      field.onChange({...(field.value ?? defaultSizingPolicy),mode,autoSizing:undefined,leverageMode:'FIXED',leverage:mode==='STOP_LOSS'?2:1,maxExposureMultiple:mode==='STOP_LOSS'?2:1});
    }}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="NOTIONAL">Full order value</SelectItem><SelectItem value="STOP_LOSS" disabled={!supportsStop}>Loss at native stop · {capabilities.label}</SelectItem></SelectContent></Select><FormDescription>{nativeStop ? 'One perpetual ticker. Quantity is bounded by estimated stop loss, costs, margin and exposure. Start verifies isolated margin and leverage. Switching here caps risk at 2%; review before saving.' : 'The entry percentage caps full order value plus costs. Choose Loss at native stop to configure supported perpetual leverage.'} {!supportsStop && 'This adapter uses full-notional sizing; protected leveraged sizing is not enabled.'}</FormDescription><FormMessage/></FormItem>}/>
    {!sizing && <Button type="button" variant="outline" onClick={()=>form.setValue("strategyConfig.sizing",{...defaultSizingPolicy},{shouldDirty:true,shouldValidate:true})}>Customize margin and exposure limits</Button>}
    {sizing && <>
      <div className="grid gap-4 sm:grid-cols-2">
        {nativeStop && <FormField control={form.control} name="strategyConfig.sizing.leverageMode" render={({field})=><FormItem><FormLabel>Leverage control</FormLabel><Select value={field.value ?? 'FIXED'} onValueChange={value=>{field.onChange(value);form.setValue('strategyConfig.sizing.autoSizing',value==='AUTO'?(sizing.autoSizing??'TARGET_RISK'):undefined,{shouldDirty:true,shouldValidate:true});}}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="FIXED">Use my fixed leverage</SelectItem><SelectItem value="AUTO">Meu chooses within my ceiling</SelectItem></SelectContent></Select><FormDescription>Automatic mode lets the LLM request verified leverage for the sizing objective selected below. Meu verifies the setting on your exchange; no manual ticker setup is needed.</FormDescription><FormMessage/></FormItem>}/>}
        {nativeStop && sizing.leverageMode==='AUTO' && <FormField control={form.control} name="strategyConfig.sizing.autoSizing" render={({field})=><FormItem><FormLabel>Automatic sizing objective</FormLabel><Select value={field.value??'MINIMUM_ORDER'} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="TARGET_RISK">Fund the permitted position size</SelectItem><SelectItem value="MINIMUM_ORDER">Use the first tradable leverage</SelectItem></SelectContent></Select><FormDescription>Fund the position uses the lowest leverage supporting the largest size inside your risk, margin and exposure budgets. This can increase both gains and losses. Saved agents keep the legacy method unless changed.</FormDescription><FormMessage/></FormItem>}/>}
        {nativeStop && <FormField control={form.control} name="strategyConfig.sizing.leverage" render={({field})=><FormItem><FormLabel>{sizing.leverageMode==='AUTO'?'Maximum leverage (×)':'Isolated leverage (×)'}</FormLabel><FormControl><Input type="number" min={1} max={20} step={1} {...field} onChange={e=>field.onChange(Number(e.target.value))}/></FormControl><FormDescription>Your ceiling is enforced by the server. More leverage reduces collateral needed, not the loss at a given stop.</FormDescription><FormMessage/></FormItem>}/>} 
        <FormField control={form.control} name="strategyConfig.sizing.maxMarginPct" render={({field})=><FormItem><FormLabel>Maximum allocation used as margin (%)</FormLabel><FormControl><Input type="number" min={0.01} max={100} step={0.01} {...field} onChange={e=>field.onChange(Number(e.target.value))}/></FormControl><FormDescription>100% permits the full allocation as collateral; fees and available funds can reduce it.</FormDescription><FormMessage/></FormItem>}/>
        <FormField control={form.control} name="strategyConfig.sizing.maxExposureMultiple" render={({field})=><FormItem><FormLabel>Maximum exposure (× allocation)</FormLabel><FormControl><Input type="number" min={0.01} max={nativeStop?sizing.leverage:1} step={0.01} {...field} onChange={e=>field.onChange(Number(e.target.value))}/></FormControl><FormDescription>Gross order value across positions and pending entries. Cannot exceed saved leverage.</FormDescription><FormMessage/></FormItem>}/>
      </div>
      <details data-agent-advanced><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Fee and slippage buffers <span className="ml-2 font-normal text-muted-foreground">{sizing.feeBps} / {sizing.slippageBps} bps per side</span></summary><div className="grid gap-6 pt-4 sm:grid-cols-2">        <FormField control={form.control} name="strategyConfig.sizing.feeBps" render={({field})=><FormItem><FormLabel>Fee buffer per side (bps)</FormLabel><FormControl><Input type="number" min={0} max={100} step={1} {...field} onChange={e=>field.onChange(Number(e.target.value))}/></FormControl><FormDescription>1 bps = 0.01%. Crypto also uses the broker fee rate and a minimum safety buffer.</FormDescription><FormMessage/></FormItem>}/>
        <FormField control={form.control} name="strategyConfig.sizing.slippageBps" render={({field})=><FormItem><FormLabel>Slippage buffer per side (bps)</FormLabel><FormControl><Input type="number" min={0} max={100} step={1} {...field} onChange={e=>field.onChange(Number(e.target.value))}/></FormControl><FormMessage/></FormItem>}/>
</div></details>
      {supportsStop && <div className="space-y-1 text-sm text-muted-foreground">{account.isPending ? <p>Loading shared account limits…</p> : account.isError ? <p role="alert">Could not load account limits. Review them under Exchanges before starting.</p> : account.data && <p>{account.data.initialized?'Saved shared-account ceilings':'Default shared-account ceilings (verified at first start)'}: {account.data.limits.maxMarginPct}% equity margin · {account.data.limits.maxDailyLossPct}% daily loss · {account.data.limits.maxNotionalMultiple}× equity exposure · {account.data.limits.maxOpenPositions} open tickers. Existing collateral is conservatively reserved against the daily-loss allowance. <Link href={`/exchanges/${exchangeId}`} className="underline underline-offset-4">Review account limits</Link>.</p>}</div>}
      <p className="text-sm text-muted-foreground">Exchange minimums can prevent entry. Stops can slip; more leverage reduces collateral, not the loss at a given stop.</p>
    </>}
    <Link href="/help#capital-risk" className="text-sm underline underline-offset-4">Sizing examples and low-capital limits</Link>
  {capabilities.marginPreview && <p className="text-sm text-muted-foreground">Zerodha determines leverage from its MIS product and current instrument margin rules. The agent can preview broker margin and Meu checks it before submission; no arbitrary leverage multiplier can be set.</p>}
  </section>;
}

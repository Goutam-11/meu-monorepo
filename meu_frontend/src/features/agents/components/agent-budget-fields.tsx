'use client';

import {useFormContext, useWatch} from 'react-hook-form';
import type {ReactNode} from 'react';
import type {z} from 'zod';
import {brokerCapabilities} from '../../../../../shared/trading/brokerCapabilities';
import {agentFormSchema} from '../validation';
import {FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {AgentSizingFields} from './agent-sizing-fields';

export function AgentBudgetFields({exchangeName, algorithm = false, children}: {exchangeName?: string; algorithm?: boolean; children?: ReactNode}) {
  const form = useFormContext<z.infer<typeof agentFormSchema>>();
  const sizingMode = useWatch({control: form.control, name: 'strategyConfig.sizing.mode'});
  const risk = useWatch({control: form.control, name: 'risk'});
  const currency = useWatch({control: form.control, name: 'capital.currency'});
  const settlement = brokerCapabilities(exchangeName ?? '').settlement;
  const stopRisk = algorithm || sizingMode === 'STOP_LOSS';
  return <section id="capital-risk" className="space-y-6 border-t border-border pt-8" aria-labelledby="budget-heading">
    <div><h2 id="budget-heading" className="text-xl font-semibold">Capital and risk</h2><p className="mt-1 text-sm text-muted-foreground">Set your budget and loss limits. Meu sizes entries within them; advanced controls remain available below.</p></div>
    <div className="grid gap-6 sm:grid-cols-2">
      <FormField control={form.control} name="capital.allocated" render={({field}) => <FormItem><FormLabel>Allocated capital</FormLabel><FormControl><Input type="number" min={0.01} step="any" {...field} onChange={event => field.onChange(Number(event.target.value))}/></FormControl><FormDescription>This agent’s budget. Funds stay in the exchange account.</FormDescription><FormMessage/></FormItem>}/>
      <FormField control={form.control} name="capital.currency" render={({field}) => <FormItem><FormLabel>Account currency</FormLabel><FormControl><Input readOnly={Boolean(settlement)} placeholder="Select an exchange first" {...field}/></FormControl><FormDescription>{settlement ? `${settlement} wallet units on ${brokerCapabilities(exchangeName!).label}. Meu does not convert deposit currencies.` : 'Use the settlement currency of the selected account.'}</FormDescription><FormMessage/>{settlement && currency !== settlement && <p role="alert" className="text-sm text-destructive">This account requires {settlement}. <Button type="button" variant="link" onClick={() => form.setValue('capital.currency', settlement, {shouldDirty: true, shouldValidate: true})}>Use {settlement}</Button></p>}</FormItem>}/>
    </div>
    {!algorithm && <details data-agent-advanced><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Sizing method and leverage · {stopRisk ? 'loss at stop' : 'full order value'}</summary><div className="pt-4"><AgentSizingFields exchangeName={exchangeName}/></div></details>}
    {children}
    <div className="grid gap-6 sm:grid-cols-2">
      <FormField control={form.control} name="risk.maxRiskPerTradePct" render={({field}) => <FormItem><FormLabel>{stopRisk ? 'Risk at stop per entry (%)' : 'Maximum entry notional (%)'}</FormLabel><FormControl><Input type="number" min={0.01} max={algorithm ? 10 : 100} step={0.01} {...field} onChange={event => field.onChange(Number(event.target.value))}/></FormControl><FormDescription>{stopRisk ? 'Estimated loss at the stop plus buffered costs, as a share of allocation.' : 'Full order value plus buffered costs, as a share of allocation.'}</FormDescription><FormMessage/></FormItem>}/>
      <FormField control={form.control} name="risk.maxDailyLossPct" render={({field}) => <FormItem><FormLabel>Daily loss limit (%)</FormLabel><FormControl><Input type="number" min={0.01} max={100} step={0.01} {...field} onChange={event => field.onChange(Number(event.target.value))}/></FormControl><FormDescription>Blocks new entries when the allowance is used. Exits remain allowed.</FormDescription><FormMessage/></FormItem>}/>
    </div>
    <details data-agent-advanced className="border-t border-border pt-2">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Position and daily entry limits <span className="ml-2 font-normal text-muted-foreground">{risk.maxOpenPositions} open · {risk.maxTradesPerDay} entries/day</span></summary>
      <div className="grid gap-6 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField control={form.control} name="risk.maxOpenPositions" render={({field}) => <FormItem><FormLabel>Simultaneous positions</FormLabel><FormControl><Input type="number" min={1} max={algorithm ? 1 : 100} step={1} readOnly={algorithm} {...field} onChange={event => field.onChange(Number(event.target.value))}/></FormControl><FormDescription>{algorithm ? 'One ticker and one open position per crypto algorithm.' : 'Maximum positions open at the same time.'}</FormDescription><FormMessage/></FormItem>}/>
        <FormField control={form.control} name="risk.maxTradesPerDay" render={({field}) => <FormItem><FormLabel>Entry orders per day</FormLabel><FormControl><Input type="number" min={1} max={1000} step={1} {...field} onChange={event => field.onChange(Number(event.target.value))}/></FormControl><FormDescription>Entry attempts count; exits and cancellations do not.</FormDescription><FormMessage/></FormItem>}/>
        <FormField control={form.control} name="risk.maxPositionsOpenedPerDay" render={({field}) => <FormItem><FormLabel>New positions per day</FormLabel><FormControl><Input type="number" min={1} max={1000} step={1} {...field} onChange={event => field.onChange(Number(event.target.value))}/></FormControl><FormDescription>Counts transitions from flat to an open position.</FormDescription><FormMessage/></FormItem>}/>
      </div>
    </details>
  </section>;
}

export function AgentConfigurationReview({algorithmSizing}: {algorithmSizing?: {leverage: number; leverageMode: 'FIXED' | 'AUTO'; maxMarginPct: number; maxExposureMultiple: number}}) {
  const {control} = useFormContext<z.infer<typeof agentFormSchema>>();
  const capital = useWatch({control, name: 'capital'});
  const risk = useWatch({control, name: 'risk'});
  const savedSizing = useWatch({control, name: 'strategyConfig.sizing'});
  const market = useWatch({control, name: 'market'});
  const sizing = algorithmSizing ?? savedSizing;
  const stopRisk = Boolean(algorithmSizing) || savedSizing?.mode === 'STOP_LOSS';
  const valid = Number.isFinite(capital.allocated) && capital.allocated > 0 && Number.isFinite(risk.maxRiskPerTradePct) && risk.maxRiskPerTradePct > 0 && risk.maxRiskPerTradePct <= (algorithmSizing ? 10 : 100) && Number.isFinite(risk.maxDailyLossPct) && risk.maxDailyLossPct > 0 && risk.maxDailyLossPct <= 100 && (!sizing || (Number.isFinite(sizing.maxMarginPct) && sizing.maxMarginPct > 0 && sizing.maxMarginPct <= 100 && Number.isFinite(sizing.maxExposureMultiple) && sizing.maxExposureMultiple > 0 && sizing.maxExposureMultiple <= sizing.leverage && Number.isInteger(sizing.leverage) && sizing.leverage >= 1 && sizing.leverage <= 20));
  const amount = (value: number) => `${new Intl.NumberFormat(undefined, {maximumFractionDigits: 2}).format(value)} ${capital.currency}`;
  return <section className="space-y-4 border-t border-border pt-8" aria-labelledby="review-heading">
    <h2 id="review-heading" className="text-xl font-semibold">Review configuration</h2>
    <p className="text-sm text-muted-foreground">{market.symbols.map(symbol => symbol.value).filter(Boolean).join(' · ') || 'Choose a ticker'} · checks every {market.agentCycles}</p>
    {valid ? <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
      {[
        ['Allocation', amount(capital.allocated)],
        [stopRisk ? 'Estimated loss budget per entry' : 'Full order value budget per entry', amount(capital.allocated * risk.maxRiskPerTradePct / 100)],
        ['Daily loss allowance', amount(capital.allocated * risk.maxDailyLossPct / 100)],
        ...(sizing ? [['Maximum collateral', amount(capital.allocated * sizing.maxMarginPct / 100)], ['Maximum gross exposure', amount(capital.allocated * sizing.maxExposureMultiple)]] : []),
        ...(sizing && stopRisk ? [['Leverage', `${sizing.leverageMode === 'AUTO' ? 'Meu chooses up to' : 'Saved target'} ${sizing.leverage}×`]] : []),
      ].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium tabular-nums">{value}</dd></div>)}
    </dl> : <p role="alert" className="text-sm text-destructive">Correct capital and risk inputs to preview the money limits.</p>}
    <p className="max-w-prose text-sm text-muted-foreground">These are saved ceilings, not a trade quote. Exchange minimums, fees, current funds and shared account limits can reduce the size or prevent entry.</p>
  </section>;
}

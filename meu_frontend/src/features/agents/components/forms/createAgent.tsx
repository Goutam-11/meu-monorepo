"use client";

import {DEFAULT_FEE_BUFFER_BPS, DEFAULT_SLIPPAGE_BUFFER_BPS} from '../../../../../../shared/trading/executionCosts';
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import type { Agent } from "@/generated/prisma/client";
import { configuredCryptoAgentSchema, cryptoStrategySettingsSchema } from "@/features/backtests/validation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TickerPicker } from "@/features/markets/components/ticker-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AgentType,
  AgentStrategy,
} from "@/generated/prisma/enums";
import { AgentBudgetFields, AgentConfigurationReview } from "./agent-budget-fields";
import { AgentFormFeedback } from "./agent-form-feedback";
import { brokerCapabilities } from "../../../../../../shared/trading/brokerCapabilities";
import { AgentIntelligenceFields } from "./agent-intelligence-fields";
import { useCreateAgent } from "@/features/agents/hooks/use-agent";
import { CandlestickChartIcon, Plus, Trash2 } from "lucide-react";
import { useSuspenseExchanges } from "@/features/exchange/hooks/use-exchange";
import { agentFormSchema } from "@/features/agents/validation";

const CYCLE_OPTIONS = [
  { label: "1 minute", value: "1m" },
  { label: "5 minutes", value: "5m" },
  { label: "15 minutes", value: "15m" },
  { label: "1 hour", value: "1h" },
  { label: "4 hours", value: "4h" },
  { label: "1 day", value: "1d" },
];
const formSchema = agentFormSchema;

type FormValues = z.infer<typeof formSchema>;
const cryptoFormSchema = z.object({
  ...formSchema.shape,
  risk: formSchema.shape.risk.extend({maxRiskPerTradePct: z.number().positive().max(10)}),
  capital: formSchema.shape.capital.extend({allocated: z.number().positive().max(1e8)}),
}).superRefine((values, ctx) => {
  if (values.market.symbols.length !== 1) ctx.addIssue({ code: "custom", path: ["market", "symbols"], message: "Crypto algorithms support one ticker per agent" });
  if (values.risk.maxOpenPositions !== 1) ctx.addIssue({ code: "custom", path: ["risk", "maxOpenPositions"], message: "Crypto algorithms support one open position" });
  if (values.capital.currency !== "USD") ctx.addIssue({ code: "custom", path: ["capital", "currency"], message: "Delta India algorithms use USD wallet units" });
});

  function parseCycleToSeconds(input: string): number {
    const match = input
      .trim()
      .toLowerCase()
      .match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new Error("Invalid cycle format. Use formats like 5m, 1h, 2d");
    }

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 60 * 60;
      case "d":
        return value * 60 * 60 * 24;
      default:
        throw new Error("Unsupported time unit");
    }
  }

export default function CreateAgentPage({ savedAgent }: { savedAgent?: Agent } = {}) {
  const raw = savedAgent?.strategyConfig as Record<string, unknown> | undefined;
  const parsedSaved = cryptoStrategySettingsSchema.safeParse({symbol:savedAgent?.market.symbols[0],timeframe:raw?.timeframe,strategy:raw,simulation:raw?.simulation});
  const initial = parsedSaved.success ? parsedSaved.data : undefined;
  const [entryTiming, setEntryTiming] = useState(initial?.strategy.entryTiming ?? (savedAgent ? {mode:'immediate' as const,confirmationBars:1,maxWaitBars:3,cooldownBars:0} : {mode:'confirm' as const,confirmationBars:1,maxWaitBars:3,cooldownBars:2}));
  const [timingChanged, setTimingChanged] = useState(false);
  const [autoSizingChanged, setAutoSizingChanged] = useState(false);
  const [restartPaper, setRestartPaper] = useState(false);
  const [configurationError, setConfigurationError] = useState<string>();
  const [configurationErrors, setConfigurationErrors] = useState<Record<string,string>>({});
  const createAgent = useCreateAgent();
  const router = useRouter(), trpc = useTRPC(), queryClient = useQueryClient();
  const [cryptoMode, setCryptoMode] = useState(Boolean(savedAgent));
  const [crypto, setCrypto] = useState({ mode: (savedAgent?.executionMode === 'LIVE' ? 'LIVE' : 'PAPER') as 'PAPER' | 'LIVE', timeframe: initial?.timeframe ?? '1h', lookback: initial?.strategy.lookback ?? 20, atrPeriod: initial?.strategy.atrPeriod ?? 14, stopAtr: initial?.strategy.stopAtr ?? 2, rewardRisk: initial?.strategy.rewardRisk ?? 2, leverage: initial?.simulation.leverage ?? 3, leverageMode:(initial ? initial.simulation.leverageMode ?? 'FIXED' : 'AUTO') as 'FIXED'|'AUTO', autoSizing: (initial?.simulation.autoSizing ?? (savedAgent ? 'MINIMUM_ORDER' : 'TARGET_RISK')) as 'TARGET_RISK'|'MINIMUM_ORDER', maxExposureMultiple:initial?.simulation.maxExposureMultiple ?? initial?.simulation.leverage ?? 2, maxMarginPct: initial?.simulation.maxMarginPct ?? 25, feeBps: initial?.simulation.feeBps ?? DEFAULT_FEE_BUFFER_BPS, slippageBps: initial?.simulation.slippageBps ?? DEFAULT_SLIPPAGE_BUFFER_BPS, fundingRatePct8h: initial?.simulation.fundingRatePct8h ?? 0, direction: initial?.simulation.direction ?? 'both' });
  const createCrypto = useMutation(trpc.backtests.createConfiguredAgent.mutationOptions({
    onSuccess: agent => { toast.success('Algorithm agent created, paused'); void queryClient.invalidateQueries({ queryKey: trpc.agents.getAll.queryKey() }); router.push(`/agents/${agent.id}`); },
    onError: error => toast.error(error.message),
  }));
  const editCrypto = useMutation(trpc.agents.updateCryptoAlgorithm.mutationOptions({
    onSuccess: agent => {
      toast.success('Algorithm settings saved, paused');
      void queryClient.invalidateQueries({queryKey:trpc.agents.getAll.queryKey()});
      void queryClient.invalidateQueries({queryKey:trpc.agents.getOne.queryKey({id:agent.id})});
      void queryClient.invalidateQueries({queryKey:trpc.backtests.paperState.queryKey({agentId:agent.id})});
      void queryClient.invalidateQueries({queryKey:trpc.backtests.paperSessions.queryKey({agentId:agent.id})});
      router.push(`/agents/${agent.id}`);
    },
    onError: error => toast.error(error.message),
  }));
  const backtest = useMutation(trpc.backtests.run.mutationOptions({
    onSuccess: run => router.push(`/strategies?strategy=${run.config.strategy.id}&run=${run.id}`),
    onError: error => toast.error(error.message),
  }));
  const pending = createAgent.isPending || createCrypto.isPending || editCrypto.isPending || backtest.isPending;
  const { data: exchanges, isLoading: isLoadingExchanges } =
    useSuspenseExchanges();
  const form = useForm<FormValues>({
    resolver: zodResolver(cryptoMode ? cryptoFormSchema : formSchema),
    defaultValues: savedAgent ? {
      name:savedAgent.name, strategy:savedAgent.strategy, type:savedAgent.type,
      llmModel:'', credentialId:'', temperature:savedAgent.temperature ?? 0.7,
      exchangeId:savedAgent.exchangeId,
      market:{symbols:savedAgent.market.symbols.map(value=>({value})),agentCycles:CYCLE_OPTIONS.find(option=>parseCycleToSeconds(option.value)===savedAgent.market.agentCycles)?.value ?? `${savedAgent.market.agentCycles}s`},
      strategyConfig:{fastPeriod:initial?.strategy.fastPeriod ?? 12,slowPeriod:initial?.strategy.slowPeriod ?? 26},
      risk:savedAgent.risk, capital:savedAgent.capital,
    } : {
      name: "",
      strategy: AgentStrategy.LLM_TRADING,
      type: AgentType.CRYPTO,
      llmModel: "",
      credentialId: "",
      temperature: 0.7,
      exchangeId: "",
      market: {
        symbols: [{ value: "" }],
        agentCycles: "1h",
      },
      strategyConfig: { fastPeriod: 12, slowPeriod: 26, analysisTimeframe: '15m' },
      risk: {
        maxRiskPerTradePct: 2,
        maxDailyLossPct: 5,
        maxOpenPositions: 3,
        maxTradesPerDay: 10,
        maxPositionsOpenedPerDay: 5,
      },
      capital: {
        allocated: 100,
        currency: "USDT",
      },
    },
  });

  const sizingMode = useWatch({control:form.control,name:"strategyConfig.sizing.mode"});
  const exchangeId = useWatch({control:form.control,name:"exchangeId"});
  const symbols = useWatch({control:form.control,name:"market.symbols"});
  const strategy = useWatch({ control: form.control, name: "strategy" });
  const assetType = useWatch({ control: form.control, name: "type" });
  const cryptoAlgorithm = assetType === AgentType.CRYPTO && strategy === AgentStrategy.ALGO_TRADING;
  const [algorithm, setAlgorithm] = useState(initial?.strategy.id ?? "ema");
  const selectedExchange = exchanges?.find(exchange => exchange.id === exchangeId);
  const singleTicker = cryptoAlgorithm || sizingMode === "STOP_LOSS";
  const strategyExchanges = exchanges?.filter(exchange=>assetType===AgentType.STOCKS
    ? exchange.name.toUpperCase()==='ZERODHA'
    : cryptoAlgorithm ? exchange.name.toUpperCase()==='DELTA'&&!exchange.sandbox : ['DELTA', 'BINANCE'].includes(exchange.name.toUpperCase()) && !(exchange.name.toUpperCase() === 'BINANCE' && exchange.sandbox));

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "market.symbols",
  });

  function enterCryptoAlgorithm() {
    setCryptoMode(true);
    form.setValue("strategyConfig.sizing", undefined);
    form.setValue('capital.currency', 'USD');
    form.setValue('risk.maxOpenPositions', 1);
    form.setValue('risk.maxRiskPerTradePct', 1);
    form.setValue('risk.maxDailyLossPct', 3);
    form.setValue('risk.maxTradesPerDay', 10);
    form.setValue('risk.maxPositionsOpenedPerDay', 5);
    form.setValue('market.agentCycles', crypto.timeframe);
    const fast = Math.min(499, Math.max(2, form.getValues('strategyConfig.fastPeriod')));
    form.setValue('strategyConfig.fastPeriod', fast);
    form.setValue('strategyConfig.slowPeriod', Math.min(500, Math.max(fast + 1, form.getValues('strategyConfig.slowPeriod'))));
    form.setValue('exchangeId', ''); form.setValue("market.symbols",[{value:""}]);
    form.clearErrors();
  }
  function cryptoPayload(values: FormValues) {
    // Editing risk or identity must not silently migrate the saved signal policy.
    return { name: values.name, exchangeId: values.exchangeId, mode: crypto.mode, agentCycles: parseCycleToSeconds(values.market.agentCycles), risk: values.risk, capital: values.capital, config: {
      symbol: values.market.symbols[0].value.trim().toUpperCase(), timeframe: crypto.timeframe,
      strategy: { id: algorithm, fastPeriod: values.strategyConfig.fastPeriod, slowPeriod: values.strategyConfig.slowPeriod, lookback: crypto.lookback, atrPeriod: crypto.atrPeriod, stopAtr: crypto.stopAtr, rewardRisk: crypto.rewardRisk, ...(initial?.strategy.executionRules ? {executionRules: initial.strategy.executionRules} : {}), ...(!savedAgent || initial?.strategy.entryTiming || timingChanged ? {entryTiming} : {}) },
      simulation: { ...(crypto.leverageMode==='AUTO' && (!savedAgent || initial?.simulation.autoSizing || autoSizingChanged) ? {autoSizing:crypto.autoSizing} : {}), initialCapital: values.capital.allocated, leverage: crypto.leverage, ...(crypto.leverageMode==='AUTO'||initial?.simulation.leverageMode?{leverageMode:crypto.leverageMode}:{}), ...(crypto.maxExposureMultiple!==crypto.leverage||initial?.simulation.maxExposureMultiple!==undefined?{maxExposureMultiple:crypto.maxExposureMultiple}:{}), riskPerTradePct: values.risk.maxRiskPerTradePct, maxMarginPct: crypto.maxMarginPct, feeBps: crypto.feeBps, slippageBps: crypto.slippageBps, fundingRatePct8h: crypto.fundingRatePct8h, maxTradesPerDay: values.risk.maxTradesPerDay, maxPositionsOpenedPerDay: values.risk.maxPositionsOpenedPerDay, maxDailyLossPct: values.risk.maxDailyLossPct, direction: crypto.direction },
    } };
  }
  function validateCryptoPayload(values: FormValues) {
    setConfigurationError(undefined);
    setConfigurationErrors({});
    const parsed = configuredCryptoAgentSchema.safeParse(cryptoPayload(values));
    if (parsed.success) return parsed.data;
    const labels: Record<string, string> = {maxMarginPct:'Maximum margin',maxExposureMultiple:'Maximum exposure',leverage:'Leverage',feeBps:'Fee buffer',slippageBps:'Slippage buffer',fundingRatePct8h:'Funding assumption',stopAtr:'Stop loss × ATR',rewardRisk:'Take profit / stop risk',atrPeriod:'ATR period',lookback:'Lookback period',confirmationBars:'Confirmation candles',maxWaitBars:'Maximum candles to wait',cooldownBars:'Candles to rest after exit',agentCycles:'Check interval',strategy:'Indicator periods'};
    const errors: Record<string,string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path.at(-1));
      errors[key] = `${labels[key] ?? key}: ${issue.message}`;
    }
    setConfigurationErrors(errors);
    setConfigurationError(Object.values(errors).join('; '));
    return null;
  }
  function backtestCurrent(values: FormValues) {
    const config = validateCryptoPayload(values);
    if (!config) return;
    const end = Math.floor(Date.now() / 86400000) * 86400;
    backtest.mutate({ ...config.config, start: end - 30 * 86400, end, periodRole: 'research' });
  }
  function onSubmit(values: FormValues) {
    setConfigurationError(undefined);
    if (cryptoAlgorithm) {
      const config = validateCryptoPayload(values);
      if (!config) return;
      if (savedAgent) editCrypto.mutate({...config,id:savedAgent.id,expectedUpdatedAt:savedAgent.updatedAt.toISOString(),restartPaper});
      else createCrypto.mutate(config);
      return;
    }
    let agentCyclesInSeconds: number;

    try {
      agentCyclesInSeconds = parseCycleToSeconds(values.market.agentCycles);
    } catch (err) {
      form.setError("market.agentCycles", {
        message: err instanceof Error ? err.message : "Invalid format",
      });
      return;
    }

    const payload = {
      ...values,
      market: {
        ...values.market,
        agentCycles: agentCyclesInSeconds,
        symbols: values.market.symbols.map((s) => s.value),
      },
    };

    createAgent.mutate(payload);
  }

  return (
    <Card className="mx-auto w-full max-w-5xl border-none bg-background shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">{savedAgent ? "Edit algorithm agent" : "Create trading agent"}</CardTitle>
        <CardDescription>
          {savedAgent ? 'Save changes while paused. Ticker, exchange and execution mode stay with this agent.' : 'Choose a market, a trading approach and money limits. New agents are saved paused.'} <Link href="/help#create-agent" className="underline underline-offset-4">Agent setup guide</Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          {savedAgent?.status === 'RUNNING' && <p role="alert" className="mb-6 text-sm text-destructive">Pause this agent on its detail page before editing. <Link className="underline underline-offset-4" href={`/agents/${savedAgent.id}`}>Review agent</Link></p>}
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <fieldset disabled={pending || savedAgent?.status === 'RUNNING'} className="space-y-8">
            <section id="agent-setup" className="space-y-5">
            <h2 className="text-xl font-semibold">Agent setup</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SOL trend agent" autoComplete="off" maxLength={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="strategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trading approach</FormLabel>
                    <Select
                      disabled={Boolean(savedAgent)}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === AgentStrategy.ALGO_TRADING && assetType === AgentType.CRYPTO) enterCryptoAlgorithm();
                        else { setCryptoMode(false); form.setValue('exchangeId', ''); form.setValue("market.symbols",[{value:""}]); }
                        if (value === AgentStrategy.HYBRID) {
                          form.setValue("strategyConfig.sizing", undefined);
                          form.setValue("type", AgentType.STOCKS, { shouldValidate: true });
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={AgentStrategy.LLM_TRADING}>AI agent · LLM</SelectItem>
                        <SelectItem value={AgentStrategy.ALGO_TRADING}>Rule based algorithm</SelectItem>
                        <SelectItem value={AgentStrategy.HYBRID} disabled={assetType === AgentType.CRYPTO}>Hybrid (Stocks only)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Crypto supports LLM or algorithm trading. Hybrid is currently available for stocks only.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market</FormLabel>
                    <Select
                      disabled={Boolean(savedAgent)}
                      onValueChange={value => { field.onChange(value); form.setValue("strategyConfig.sizing",undefined); if (value === AgentType.CRYPTO && strategy === AgentStrategy.ALGO_TRADING) enterCryptoAlgorithm(); else { setCryptoMode(false); form.setValue('exchangeId', ''); form.setValue("market.symbols",[{value:""}]); } }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={AgentType.CRYPTO} disabled={strategy === AgentStrategy.HYBRID}>Crypto</SelectItem>
                        <SelectItem value={AgentType.STOCKS}>Stocks</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            </section>

            {/* --- SECTION: Market Scope --- */}
            <section id="agent-market" className="space-y-5 border-t border-border pt-8">
              <h2 className="text-xl font-semibold">Market and schedule</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="exchangeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange connection</FormLabel>
                      <Select
                        onValueChange={value=>{field.onChange(value);form.setValue("market.symbols",[{value:""}]);const settlement=brokerCapabilities(exchanges?.find(exchange=>exchange.id===value)?.name ?? "").settlement;if(settlement)form.setValue("capital.currency",settlement,{shouldDirty:true,shouldValidate:true});}}
                        value={field.value}
                        disabled={Boolean(savedAgent) || isLoadingExchanges || !strategyExchanges?.length}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={strategy === AgentStrategy.LLM_TRADING ? "Select an exchange" : cryptoAlgorithm ? "Select a Delta India exchange" : "Add a Zerodha exchange first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(strategyExchanges) &&
                            strategyExchanges.map((exchange) => (
                              <SelectItem key={exchange.id} value={exchange.id}>
                                <div className="flex items-center gap-2">
                                  <CandlestickChartIcon aria-hidden="true" className="size-4 shrink-0" />
                                  {exchange.displayName ? `${exchange.displayName} · ${exchange.name}` : exchange.name}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {strategy === AgentStrategy.LLM_TRADING
                          ? "The exchange will be used to fetch market data and trade."
                          : cryptoAlgorithm ? "Crypto algorithms execute through production Delta India." : "EMA and hybrid strategies execute through Zerodha stocks."}
                      </FormDescription>
                      {!strategyExchanges?.length && <p className="text-sm text-muted-foreground">No compatible connection. <Link href="/exchanges" className="underline underline-offset-4">Add an exchange connection</Link>.</p>}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="market.agentCycles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check market every</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                      
                        <SelectContent>
                          {savedAgent && !CYCLE_OPTIONS.some(option=>parseCycleToSeconds(option.value)===savedAgent.market.agentCycles) && <SelectItem value={`${savedAgent.market.agentCycles}s`}>{savedAgent.market.agentCycles} seconds</SelectItem>}
                          {CYCLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value} disabled={cryptoAlgorithm && parseCycleToSeconds(option.value) > parseCycleToSeconds(crypto.timeframe)}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {cryptoAlgorithm ? "Checks the latest closed candle; incomplete candles do not create signals. This interval cannot exceed the candle timeframe." : "Frequency of market analysis."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Trading tickers</h3>
                  {fields.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`market.symbols.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex gap-2">
                            <FormControl>
                              <TickerPicker {...field} aria-label={`Trading symbol ${index + 1}`} disabled={Boolean(savedAgent) || !exchangeId} exchangeId={exchangeId || undefined} scope={assetType} exclude={symbols.map(s=>s.value)}/>
                            </FormControl>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove ticker ${index + 1}`}
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  {!singleTicker && <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ value: "" })}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add ticker
                  </Button>}
                  {singleTicker && <p className="text-sm text-muted-foreground">One perpetual ticker per agent with this sizing method. Use separate agents for other tickers.</p>}
                  {form.formState.errors.market?.symbols?.root?.message && <p role="alert" className="text-sm text-destructive">{form.formState.errors.market.symbols.root.message}</p>}
                </div>
              </div>
            </section>

            {cryptoAlgorithm && <section className="space-y-5 border-t border-border pt-8">
              <h2 className="text-xl font-semibold">Algorithm settings</h2>
              <p className="text-sm text-muted-foreground">Delta India perpetuals · one ticker per agent. Settings can be edited while paused. Backtesting is optional.</p>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2"><label htmlFor="crypto-algorithm" className="text-sm font-medium">Trading algorithm</label><Select value={algorithm} onValueChange={value=>setAlgorithm(value as typeof algorithm)}><SelectTrigger id="crypto-algorithm" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ema">EMA crossover</SelectItem><SelectItem value="donchian">Donchian breakout</SelectItem><SelectItem value="meanReversion">Bollinger + RSI</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><label htmlFor="crypto-mode" className="text-sm font-medium">Execution mode</label><Select disabled={Boolean(savedAgent)} value={crypto.mode} onValueChange={mode => setCrypto({ ...crypto, mode: mode as 'PAPER' | 'LIVE' })}><SelectTrigger id="crypto-mode" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PAPER">Paper · simulated funds</SelectItem><SelectItem value="LIVE">Live · real funds when activated</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><label htmlFor="crypto-timeframe" className="text-sm font-medium">Candle timeframe</label><Select value={crypto.timeframe} onValueChange={timeframe => {setCrypto({ ...crypto, timeframe: timeframe as typeof crypto.timeframe });if(parseCycleToSeconds(form.getValues("market.agentCycles"))>parseCycleToSeconds(timeframe))form.setValue("market.agentCycles","5m",{shouldDirty:true,shouldValidate:true});}}><SelectTrigger id="crypto-timeframe" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{['15m', '1h', '4h', '1d'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><label htmlFor="crypto-entry-style" className="text-sm font-medium">When to enter</label><Select value={entryTiming.mode} onValueChange={value=>{setTimingChanged(true);setEntryTiming({...entryTiming,mode:value as typeof entryTiming.mode});}}><SelectTrigger id="crypto-entry-style"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="confirm">Wait for confirmation</SelectItem><SelectItem value="retest">Wait for a retest</SelectItem><SelectItem value="immediate">Act on the signal</SelectItem></SelectContent></Select><p className="text-sm text-muted-foreground">{entryTiming.mode==='immediate' ? 'Acts on a closed-candle signal without extra confirmation.' : entryTiming.mode==='confirm' ? `Waits for ${entryTiming.confirmationBars} closed candle(s) to support the signal, for up to ${entryTiming.maxWaitBars} candles.` : `Waits for price to revisit the signal level and close back in its direction, for up to ${entryTiming.maxWaitBars} candles.`} {entryTiming.cooldownBars>0 && `Rests ${entryTiming.cooldownBars} candle(s) after an exit before entering again. `}Timing filters can reduce trades and fees; they can also miss profitable moves. {savedAgent && !initial?.strategy.entryTiming && !timingChanged && 'This saved agent keeps its original immediate entry timing until you change it.'}</p></div>
              </div>
              <p className="text-sm text-muted-foreground">Meu calculates stop distance from market volatility and quantity from your loss budget. Protection: {crypto.stopAtr}× ATR stop, {crypto.rewardRisk}× reward/risk; {crypto.leverageMode==='AUTO'?'automatic leverage up to':'fixed leverage'} {crypto.leverage}×.</p>
              <details data-agent-advanced><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Advanced strategy settings</summary><div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
                <div className="space-y-2"><label htmlFor="crypto-direction" className="text-sm font-medium">Allowed direction</label><Select value={crypto.direction} onValueChange={direction => setCrypto({ ...crypto, direction: direction as typeof crypto.direction })}><SelectTrigger id="crypto-direction" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="both">Long and short</SelectItem><SelectItem value="long">Long only</SelectItem><SelectItem value="short">Short only</SelectItem></SelectContent></Select></div>
                {([{key:'confirmationBars',label:'Confirmation candles',min:1,max:5},{key:'maxWaitBars',label:'Maximum candles to wait',min:1,max:20},{key:'cooldownBars',label:'Candles to rest after exit',min:0,max:20}] as const).map(item=><div key={item.key} className="space-y-2"><label htmlFor={`timing-${item.key}`} className="text-sm font-medium">{item.label}</label><Input id={`timing-${item.key}`} type="number" min={item.min} max={item.max} step={1} value={entryTiming[item.key]} onChange={event=>{setTimingChanged(true);setEntryTiming({...entryTiming,[item.key]:Number(event.target.value)});}}/></div>)}
                {([{ key: 'lookback', label: algorithm === 'donchian' ? 'Breakout lookback' : 'Bollinger period', min: 2, max: 500, step: 1 }, { key: 'atrPeriod', label: 'ATR period', min: 2, max: 500, step: 1 }, { key: 'stopAtr', label: 'Stop loss × ATR', min: 0.1, max: 10, step: 0.1 }, { key: 'rewardRisk', label: 'Take profit / stop risk', min: 0.1, max: 10, step: 0.1 }] as const).filter(item => item.key !== 'lookback' || algorithm !== 'ema').map(item => <div key={item.key} className="space-y-2"><label htmlFor={`crypto-${item.key}`} className="text-sm font-medium">{item.label}</label><Input id={`crypto-${item.key}`} type="number" aria-invalid={Boolean(configurationErrors[item.key])} required min={item.min} max={item.max} step={item.step} value={crypto[item.key]} onChange={e => setCrypto({ ...crypto, [item.key]: Number(e.target.value) })} /></div>)}
              </div>
              </details>
              {crypto.leverageMode==='AUTO' && <p className="text-sm text-muted-foreground">{crypto.autoSizing === 'TARGET_RISK' ? 'Meu funds as much of the permitted position size as current limits allow, then chooses the lowest leverage that achieves that size.' : 'Meu selects the first leverage that permits a valid order within margin and exposure budgets.'} It never raises your risk or margin allowance. Live leverage changes require a flat ticker with no pending orders; existing positions keep their leverage.</p>}
              {crypto.mode === 'LIVE' && <p className="text-sm text-destructive">Live agents can place real orders after activation. Start checks Delta and applies your saved isolated leverage when the account is safe to change. Different tickers can run together; an account-wide margin-mode change requires other live agents to be paused. Native stops cannot guarantee a maximum loss.</p>}
            </section>}
            {strategy !== AgentStrategy.ALGO_TRADING && <AgentIntelligenceFields/>}

            {strategy !== AgentStrategy.LLM_TRADING && (!cryptoAlgorithm || algorithm === "ema") && (
              <details data-agent-advanced className="space-y-5 border-t border-border pt-4">
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Advanced EMA periods</summary><div>
                  <h2 className="sr-only">EMA indicator periods</h2>
                  <p className="text-sm text-muted-foreground">Configure the fast and slow EMA periods.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="strategyConfig.fastPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fast EMA Period</FormLabel>
                        <FormControl>
                          <Input type="number" min={cryptoAlgorithm ? 2 : 1} max={500} step={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="strategyConfig.slowPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slow EMA Period</FormLabel>
                        <FormControl>
                          <Input type="number" min={cryptoAlgorithm ? 3 : 2} max={500} step={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </details>
            )}

            <AgentBudgetFields exchangeName={selectedExchange?.name} algorithm={cryptoAlgorithm}>{cryptoAlgorithm && <details data-agent-advanced className="space-y-5">
              <summary id="algorithm-sizing-heading" className="min-h-11 cursor-pointer py-3 text-sm font-medium">Advanced sizing and leverage · {crypto.leverageMode==='AUTO'?'automatic up to':'fixed'} {crypto.leverage}×</summary>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2"><label id="crypto-leverage-mode-label" className="text-sm font-medium">Leverage control</label><Select value={crypto.leverageMode} onValueChange={value=>setCrypto({...crypto,leverageMode:value as 'FIXED'|'AUTO'})}><SelectTrigger aria-labelledby="crypto-leverage-mode-label"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="FIXED">Use my fixed leverage</SelectItem><SelectItem value="AUTO">Meu chooses within my ceiling</SelectItem></SelectContent></Select></div>
                {crypto.leverageMode==='AUTO' && <div className="space-y-2"><label id="crypto-auto-sizing-label" className="text-sm font-medium">Automatic sizing objective</label><Select value={crypto.autoSizing} onValueChange={value=>{setAutoSizingChanged(true);setCrypto({...crypto,autoSizing:value as 'TARGET_RISK'|'MINIMUM_ORDER'});}}><SelectTrigger aria-labelledby="crypto-auto-sizing-label"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="TARGET_RISK">Fund the permitted position size</SelectItem><SelectItem value="MINIMUM_ORDER">Use the first tradable leverage</SelectItem></SelectContent></Select><p className="text-sm text-muted-foreground">Fund the position chooses the lowest leverage supporting the largest size within all your budgets. It can increase gains and losses compared with the legacy minimum-order method. Existing agents keep their saved method until changed.</p></div>}
                <div className="space-y-2"><label htmlFor="crypto-leverage" className="text-sm font-medium">{crypto.leverageMode==='AUTO'?'Maximum leverage (×)':'Isolated leverage (×)'}</label><Input id="crypto-leverage" type="number" aria-invalid={Boolean(configurationErrors.leverage)} min={1} max={20} step={1} value={crypto.leverage} onChange={e=>setCrypto({...crypto,leverage:Number(e.target.value)})}/></div>
                <div className="space-y-2"><label htmlFor="crypto-maxMarginPct" className="text-sm font-medium">Maximum allocation used as margin (%)</label><Input id="crypto-maxMarginPct" type="number" aria-invalid={Boolean(configurationErrors.maxMarginPct)} min={0.01} max={100} step={0.01} value={crypto.maxMarginPct} onChange={e=>setCrypto({...crypto,maxMarginPct:Number(e.target.value)})}/><p className="text-sm text-muted-foreground">100% permits full allocated collateral after costs.</p></div>
                <div className="space-y-2"><label htmlFor="crypto-exposure" className="text-sm font-medium">Maximum exposure (× allocation)</label><Input id="crypto-exposure" type="number" aria-invalid={Boolean(configurationErrors.maxExposureMultiple)} min={0.01} max={crypto.leverage} step={0.01} value={crypto.maxExposureMultiple} onChange={e=>setCrypto({...crypto,maxExposureMultiple:Number(e.target.value)})}/><p className="text-sm text-muted-foreground">2× permits order value up to twice the allocation. Cannot exceed leverage.</p></div>
              </div>
              <details data-agent-advanced><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Fees, slippage and paper funding</summary><div className="grid gap-6 pt-4 sm:grid-cols-3">{([{key:'feeBps',label:'Fee per side (bps)',min:0,max:100},{key:'slippageBps',label:'Slippage per side (bps)',min:0,max:100},{key:'fundingRatePct8h',label:'Funding per 8h (%)',min:-1,max:1}] as const).map(item=><div key={item.key} className="space-y-2"><label htmlFor={`crypto-${item.key}`} className="text-sm font-medium">{item.label}</label><Input id={`crypto-${item.key}`} type="number" aria-invalid={Boolean(configurationErrors[item.key])} step="any" min={item.min} max={item.max} value={crypto[item.key]} onChange={e=>setCrypto({...crypto,[item.key]:Number(e.target.value)})}/></div>)}</div><p className="mt-3 text-sm text-muted-foreground">1 bps = 0.01%. Live execution also uses broker fees and a safety buffer.</p></details>
            </details>}</AgentBudgetFields>
            <AgentConfigurationReview algorithmSizing={cryptoAlgorithm ? crypto : undefined}/>

            {savedAgent?.executionMode === 'PAPER' && <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={restartPaper} onChange={e=>setRestartPaper(e.target.checked)} className="mt-1"/><span>Start a fresh paper portfolio if strategy, capital or risk settings change. The previous portfolio remains stored. Name and polling changes keep the current portfolio.</span></label>}
            {savedAgent?.executionMode === 'LIVE' && <p className="text-sm text-muted-foreground">Execution changes require a flat ticker, no pending orders and no unresolved ownership. Saving prepares fresh indicators; it does not change Delta leverage or start trading. Start Agent applies the revised isolated leverage when safe.</p>}
            <AgentFormFeedback error={configurationError ?? (editCrypto.isError ? editCrypto.error.message : createCrypto.isError ? createCrypto.error.message : createAgent.isError ? createAgent.error.message : undefined)}/>
            <Button
              type="submit"
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {pending ? (savedAgent ? "Saving settings…" : "Creating paused agent…") : savedAgent ? "Save changes, keep paused" : "Create paused agent"}
            </Button>
            {cryptoAlgorithm && <Button type="button" variant="outline" className="ml-0 w-full sm:ml-3 sm:w-auto" disabled={pending} onClick={() => { void form.handleSubmit(backtestCurrent)(); }}>{backtest.isPending ? 'Running backtest…' : 'Backtest last 30 days'}</Button>}
            </fieldset>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

"use client";

import CreateAgentPage from "./createAgent";
import { useEffect } from "react";
import Link from "next/link";
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
import { AgentType, AgentStrategy } from "@/generated/prisma/enums";
import { AgentBudgetFields, AgentConfigurationReview } from "./agent-budget-fields";
import { AgentFormFeedback } from "./agent-form-feedback";
import {brokerCapabilities} from "../../../../../shared/trading/brokerCapabilities";
import { AgentIntelligenceFields } from "./agent-intelligence-fields";
import { useSuspenseAgent, useUpdateAgent } from "@/features/agents/hooks/use-agent";
import {  CandlestickChartIcon, Plus, Trash2 } from "lucide-react";
import { useSuspenseExchanges } from "@/features/exchange/hooks/use-exchange";
import { agentFormSchema, sizingPolicySchema, analysisTimeframeSchema } from "@/features/agents/validation";

const CYCLE_OPTIONS = [
  { label: "1 minute", value: "1m" },
  { label: "5 minutes", value: "5m" },
  { label: "15 minutes", value: "15m" },
  { label: "1 hour", value: "1h" },
  { label: "4 hours", value: "4h" },
  { label: "1 day", value: "1d" },
];
const formSchema = agentFormSchema.extend({ id: z.string() });

type FormValues = z.infer<typeof formSchema>;

export default function EditAgentPage({id}:{id:string}) {
  const {data:agent} = useSuspenseAgent(id);
  if (agent?.type === AgentType.CRYPTO && agent.strategy === AgentStrategy.ALGO_TRADING && agent.executionMode)
    return <CreateAgentPage key={agent.updatedAt.toISOString()} savedAgent={agent}/>;
  return <LegacyEditAgentPage id={id}/>;
}

function LegacyEditAgentPage({
  id
}:{ id: string }) {
  const { data: agent } = useSuspenseAgent(id);
  const updateAgent = useUpdateAgent();
  const { data: exchanges, isLoading: isLoadingExchanges } =
    useSuspenseExchanges();
  const savedStrategyConfig = agent?.strategyConfig as { fastPeriod?: number; slowPeriod?: number; sizing?: unknown; analysisTimeframe?: unknown } | undefined;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: agent?.id,
      name: agent?.name,
      strategy: agent?.strategy ?? AgentStrategy.LLM_TRADING,
      type: agent?.type ?? AgentType.CRYPTO,
      llmModel: agent?.llmModel ?? "",
      credentialId: agent?.credentialId ?? "",
      temperature: agent?.temperature ?? 0.7,
      exchangeId: agent?.exchangeId ?? "",
      market: {
        symbols: agent?.market?.symbols.map(s => ({ value: s })) ?? [{ value: "" }],
        agentCycles: agent?.market?.agentCycles ? formatSecondsToCycle(agent?.market?.agentCycles) : "1h",
      },
      strategyConfig: {
        fastPeriod: savedStrategyConfig?.fastPeriod ?? 12,
        slowPeriod: savedStrategyConfig?.slowPeriod ?? 26,
        sizing: sizingPolicySchema.safeParse(savedStrategyConfig?.sizing).data,
        analysisTimeframe: analysisTimeframeSchema.safeParse(savedStrategyConfig?.analysisTimeframe).data,
      },
      risk: {
        maxRiskPerTradePct: agent?.risk?.maxRiskPerTradePct ?? 2,
        maxDailyLossPct: agent?.risk?.maxDailyLossPct ?? 5,
        maxOpenPositions: agent?.risk?.maxOpenPositions ?? 3,
        maxTradesPerDay: agent?.risk?.maxTradesPerDay ?? 10,
        maxPositionsOpenedPerDay: agent?.risk?.maxPositionsOpenedPerDay ?? 5,
      },
      capital: {
        allocated: agent?.capital?.allocated ?? 100,
        currency: agent?.capital?.currency ?? "USDT",
      },
    },
  });

  const sizingMode = useWatch({control:form.control,name:"strategyConfig.sizing.mode"});
  const exchangeId = useWatch({control:form.control,name:"exchangeId"});
  const assetType = useWatch({control:form.control,name:"type"});
  const symbols = useWatch({control:form.control,name:"market.symbols"});
  const strategy = useWatch({ control: form.control, name: "strategy" });
  const singleTicker = sizingMode === 'STOP_LOSS';
  const strategyExchanges = exchanges?.filter(exchange=>assetType===AgentType.STOCKS
    ? exchange.name.toUpperCase()==='ZERODHA' : ['DELTA','BINANCE'].includes(exchange.name.toUpperCase()) && !(exchange.name.toUpperCase()==='BINANCE' && exchange.sandbox));
  function formatSecondsToCycle(seconds: number): string {
    if (seconds % 86400 === 0) {
      return `${seconds / 86400}d`;
    }
    if (seconds % 3600 === 0) {
      return `${seconds / 3600}h`;
    }
    if (seconds % 60 === 0) {
      return `${seconds / 60}m`;
    }
    return `${seconds}s`;
  }
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "market.symbols",
  });

  useEffect(() => {
    if (fields.length === 0) append({value: ""});
  }, [fields, append]);

  function parseCycleToSeconds(input: string): number {
    const match = input.trim().toLowerCase().match(/^(\d+)([smhd])$/);
  
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
  
  function onSubmit(values: FormValues) {
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
  
    updateAgent.mutate(payload);
  }

  if (agent?.executionMode) return <section className="space-y-4 p-6"><h1 className="text-2xl font-semibold">Unsupported saved strategy</h1><p className="text-muted-foreground">This execution mode does not match a supported crypto algorithm. Review the configuration before editing.</p><Button asChild variant="secondary"><Link href={`/agents/${agent.id}`}>Review agent</Link></Button></section>;

  return (
    <Card className="mx-auto w-full max-w-5xl border-none bg-background shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Edit trading agent</CardTitle>
        <CardDescription>
          Save settings while paused. Create crypto algorithms directly or from a saved backtest in <Link href="/strategies" className="underline underline-offset-4">Strategies</Link>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="break-all text-xs text-muted-foreground">Agent ID: {agent?.id}</p>
        </div>
        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {agent?.status !== "PAUSED" && <p role="alert" className="text-sm text-destructive">Pause this agent before editing. <Link href={`/agents/${id}`} className="underline underline-offset-4">Review agent</Link></p>}
            <fieldset disabled={updateAgent.isPending || agent?.status !== "PAUSED"} className="space-y-8">
            <h2 className="text-xl font-semibold">Agent setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== AgentStrategy.LLM_TRADING) {
                          if (assetType !== AgentType.STOCKS) {
                            form.setValue("exchangeId", "");
                            form.setValue("market.symbols", [{value:""}]);
                          }
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
                        <SelectItem value={AgentStrategy.ALGO_TRADING}>EMA Algorithm (Stocks)</SelectItem>
                        <SelectItem value={AgentStrategy.HYBRID}>Hybrid (Stocks only)</SelectItem>
                      </SelectContent>
                    </Select>
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
                      onValueChange={value=>{field.onChange(value);form.setValue("exchangeId", "");form.setValue("market.symbols", [{value:""}]);form.setValue("strategyConfig.sizing",undefined);}}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={AgentType.CRYPTO} disabled={strategy !== AgentStrategy.LLM_TRADING}>Crypto</SelectItem>
                        <SelectItem value={AgentType.STOCKS}>Stocks</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* --- SECTION: Market Scope --- */}
            <section className="space-y-5 border-t border-border pt-8">
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
                        disabled={isLoadingExchanges || !strategyExchanges?.length}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={strategy === AgentStrategy.LLM_TRADING ? "Select an exchange" : "Add a Zerodha exchange first"} />
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
                          : "EMA and hybrid strategies currently execute through Zerodha stocks."}
                      </FormDescription>
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
                          {!CYCLE_OPTIONS.some(option=>option.value===form.getValues("market.agentCycles")) && <SelectItem value={form.getValues("market.agentCycles")}>{form.getValues("market.agentCycles")}</SelectItem>}
                          {CYCLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Frequency of market analysis.
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
                              <TickerPicker {...field} aria-label={`Trading symbol ${index + 1}`} disabled={!exchangeId} exchangeId={exchangeId || undefined} scope={assetType} exclude={symbols.map(s=>s.value)}/>
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
                          <FormMessage/>
                        </FormItem>
                      )}
                    />
                  ))}
                  {!singleTicker && <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({value:""})}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add ticker
                  </Button>}
                  {singleTicker && <p className="text-sm text-muted-foreground">Native-stop sizing requires one ticker. Use separate agents for other tickers.</p>}
                </div>
              </div>
            </section>

            {strategy !== AgentStrategy.ALGO_TRADING && <AgentIntelligenceFields/>}

            {strategy !== AgentStrategy.LLM_TRADING && (
              <details data-agent-advanced className="space-y-5 border-t border-border pt-4">
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Advanced EMA periods</summary><div>
                  <h2 className="sr-only">EMA indicator periods</h2>
                  <p className="text-sm text-muted-foreground">Configure the fast and slow periods used by the stock strategy.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="strategyConfig.fastPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fast EMA Period</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={500} step={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
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
                          <Input type="number" min={2} max={500} step={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </details>
            )}

            <AgentBudgetFields exchangeName={exchanges?.find(exchange=>exchange.id===exchangeId)?.name}/>
            <AgentConfigurationReview/>
            <AgentFormFeedback error={updateAgent.isError ? updateAgent.error.message : undefined}/>

            <Button
              type="submit"
              disabled={updateAgent.isPending}
              className="w-full sm:w-auto"
            >
              {updateAgent.isPending ? "Saving settings…" : "Save changes, keep paused"}
            </Button>
            </fieldset>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

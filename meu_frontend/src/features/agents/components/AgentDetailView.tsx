"use client";
import Link from "next/link";
import {EntryPreview} from "./entry-preview";
import {sizingPolicySchema} from "../validation";
import { PaperPortfolio } from "@/features/backtests/components/paper-portfolio";
import { motion, type Variants } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import {
  Activity,
  ShieldCheck,
  Wallet,
  Globe,
  Cpu,
  Clock,
  ChevronRight,
  PauseCircle,
  PlayCircle,
  Pencil,
  ChartCandlestick,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  useStatusChangeAgent,
  useSuspenseAgent,
  useSuspenseRuns,
} from "../hooks/use-agent";
import { useSuspenseExchange } from "@/features/exchange/hooks/use-exchange";
import {
  useCredential,
} from "@/features/credentials/hooks/use-credentials";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export default function AgentDetailView({ agentId }: { agentId: string }) {
  const { data: agent } = useSuspenseAgent(agentId);

  if (!agent) {
    throw new Error("Agent not found"); // or return fallback UI
  }

  const { data: exchange } = useSuspenseExchange(agent.exchangeId);

  const { data: credentials } = useCredential(agent?.credentialId);
  const { data: runs } = useSuspenseRuns(agentId);
  const isRunning = agent?.status === "RUNNING";
  const strategyConfig = agent.strategyConfig as Record<string, unknown> | null;
  const sizing = sizingPolicySchema.safeParse(strategyConfig?.sizing).data;
  const simulation = strategyConfig?.simulation as Record<string, unknown> | undefined;
  const algorithmNames: Record<string, string> = { ema: 'EMA crossover', donchian: 'Donchian breakout', meanReversion: 'Bollinger + RSI' };
  const displaySetting = (value: unknown) => typeof value === 'number' && Number.isFinite(value) || typeof value === 'string' ? String(value) : 'Unavailable';
  const savedLeverage = simulation?.leverageMode==='AUTO' ? `Auto ≤ ${displaySetting(simulation?.leverage)}` : displaySetting(simulation?.leverage);
  const statusChange = useStatusChangeAgent();
  const handleStatusChange = () => {
    statusChange.mutate({
      id: agentId,
      status: isRunning ? "PAUSED" : "RUNNING",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-10 space-y-8 ">
      {/* L1: Header & Identity */}
      <motion.header
        initial="hidden"
        animate="visible"
        custom={0}
        variants={fadeUp}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-primary/15 text-primary ring-1 ring-inset ring-primary/30 flex items-center justify-center text-xl font-extrabold tracking-tight shrink-0">
            {agent.name.split(/[\s-_]+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {agent?.name}
              </h1>
              <Badge
                variant={isRunning ? "default" : "destructive"}
                className="px-3 rounded-full ring-1 ring-inset ring-current/30"
              >
                <span
                  className={`mr-1.5 inline-block h-2 w-2 rounded-full animate-pulse-dot ${
                    isRunning ? "bg-status-running" : "bg-status-paused"
                  }`}
                />
                {agent?.status}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono text-sm tracking-tight truncate">
              {agent?.id}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline"><Link href={`/charts?agent=${agentId}`}><ChartCandlestick aria-hidden="true" className="h-4 w-4" />View chart</Link></Button>
        <Button asChild variant="outline">
          <Link href={`/agents/${agentId}/edit`}><Pencil aria-hidden="true" className="h-4 w-4" />Edit settings</Link>
        </Button>
        {exchange?.name.toUpperCase()==='DELTA' && agent.executionMode!=='PAPER' && <Button asChild variant="secondary"><Link href={`/exchanges/${agent.exchangeId}/reconciliation`}>Account recovery</Link></Button>}
        <Button
          variant="outline"
          className="shrink-0"
          disabled={statusChange.isPending}
          onClick={handleStatusChange}
        >
          {isRunning ? (
            <PauseCircle className="mr-2 h-4 w-4" />
          ) : (
            <PlayCircle className="mr-2 h-4 w-4" />
          )}
          {statusChange.isPending && !isRunning && agent.executionMode === "LIVE" ? "Preparing trading…" : isRunning ? "Pause Agent" : agent.executionMode && !agent.strategyStartedAt ? "Start Agent" : "Resume Agent"}
        </Button>
        </div>
      </motion.header>

      {agent.executionMode ? <div className="space-y-3"><p className="text-sm font-semibold">{agent.executionMode === "PAPER" ? "Paper algorithm · simulated funds only" : "Live algorithm · real Delta orders"}</p><p className="text-sm text-muted-foreground">Pause the agent to edit algorithm and risk settings. Execution changes start a new state revision; live changes require a flat ticker and no pending orders. <Link href={`/agents/${agentId}/edit`} className="underline underline-offset-4">Edit settings</Link> · <Link href="/help#paper-live" className="underline underline-offset-4">Paper, live and pausing guide</Link></p>{agent.executionMode === "PAPER" ? <PaperPortfolio agentId={agentId}/> : <p className="text-xs text-muted-foreground">Native exchange brackets remain active while paused. Pausing the agent does not close live positions or cancel pending orders. Live sizing separately caps loss at the native stop, margin usage and leveraged exposure. Buffered costs and Delta margin-tier limits can reduce sizes compared with the backtest.</p>}</div> : null}
      {agent.executionMode && <Card>
        <CardHeader><CardTitle>Strategy Settings</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p className="max-w-[72ch] text-sm leading-relaxed text-muted-foreground">Leverage can be fixed or calculated within your saved ceiling. Automatic mode selects the minimum viable leverage only for a flat ticker. Position size is calculated from your stop risk, capital, margin and exposure limits. For live trading, Start automatically sets isolated margin and your saved leverage, verifies them, then activates the agent.</p>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Leverage', value: `${savedLeverage}× isolated` },
              { label: 'Auto sizing objective', value: simulation?.leverageMode==='AUTO' ? (simulation.autoSizing==='TARGET_RISK'?'Fund permitted position size':'First tradable leverage (legacy)') : 'Fixed leverage' },
              { label: 'Candle timeframe', value: displaySetting(strategyConfig?.timeframe) },
              { label: 'Allowed direction', value: displaySetting(simulation?.direction) },
              { label: 'Maximum gross notional', value: `${Number(simulation?.maxExposureMultiple ?? simulation?.leverage)*100}% of allocation` },
              { label: 'Maximum margin', value: `${displaySetting(simulation?.maxMarginPct)}% of allocation` },
              ...(strategyConfig?.id === 'ema' ? [{ label: 'Fast / slow EMA', value: `${displaySetting(strategyConfig.fastPeriod)} / ${displaySetting(strategyConfig.slowPeriod)}` }] : [{ label: strategyConfig?.id === 'donchian' ? 'Breakout lookback' : 'Bollinger period', value: displaySetting(strategyConfig?.lookback) }]),
              { label: 'ATR period', value: displaySetting(strategyConfig?.atrPeriod) },
              { label: 'Stop loss distance', value: `${displaySetting(strategyConfig?.stopAtr)} × ATR` },
              { label: 'Take profit / stop risk', value: `${displaySetting(strategyConfig?.rewardRisk)} : 1` },
              { label: 'Fee assumption', value: `${displaySetting(simulation?.feeBps)} bps` },
              { label: 'Slippage assumption', value: `${displaySetting(simulation?.slippageBps)} bps` },
              { label: 'Paper / backtest funding assumption', value: `${displaySetting(simulation?.fundingRatePct8h)}% per 8h` },
              { label: 'Position sizing', value: 'Calculated · whole contracts' },
            ].map(item => <div key={item.label}><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="mt-1 text-sm font-medium tabular-nums">{item.value}</dd></div>)}
          </dl>
          <Link href="/help#capital-risk" className="text-sm font-medium underline underline-offset-4">Understand leverage and risk limits</Link>
        </CardContent>
      </Card>}
      {sizing && <Card><CardHeader><CardTitle>Position sizing policy</CardTitle></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
        {label:'Method',value:sizing.mode==='STOP_LOSS'?'Loss at native stop':'Full notional'},
        {label:'Leverage',value:sizing.mode==='STOP_LOSS'?`${sizing.leverageMode==='AUTO'?'Auto ≤ ':''}${sizing.leverage}× isolated`:'No leverage credit'},
        {label:'Auto sizing objective',value:sizing.leverageMode==='AUTO'?(sizing.autoSizing==='TARGET_RISK'?'Fund permitted position size':'First tradable leverage (legacy)'):'Fixed leverage'},
        {label:'Margin ceiling',value:`${sizing.maxMarginPct}% of allocation`},
        {label:'Exposure ceiling',value:`${sizing.maxExposureMultiple}× allocation`},
        {label:'Fee buffer / side',value:`${sizing.feeBps} bps`},
        {label:'Slippage buffer / side',value:`${sizing.slippageBps} bps`},
      ].map(item=><div key={item.label}><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="mt-1 text-sm font-medium">{item.value}</dd></div>)}</dl><p className="mt-4 text-sm text-muted-foreground">Account limits, existing exposure, available funds and exchange minimum quantities also constrain entries.</p></CardContent></Card>}
      {agent.type==='CRYPTO' && agent.strategy==='LLM_TRADING' && <p className="text-sm text-muted-foreground">LLM analysis: {displaySetting(strategyConfig?.analysisTimeframe??'1m')} completed candles. The scheduled review interval is separate.</p>}
      {agent.type==='CRYPTO' && agent.executionMode!=='PAPER' && ['DELTA','BINANCE'].includes(exchange?.name.toUpperCase()??'') && (agent.executionMode==='LIVE'||sizing?.mode==='STOP_LOSS') && <EntryPreview agent={agent}/>}
      {/* L2: Vitals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Allocated Capital",
            icon: Wallet,
            value: `${agent?.capital.allocated.toLocaleString()}`,
            suffix: agent?.capital.currency,
          },
          {
            title: agent.executionMode || sizing?.mode === "STOP_LOSS" ? "Risk at Stop" : "Max Entry Notional",
            icon: ShieldCheck,
            value: `${agent?.risk.maxRiskPerTradePct}%`,
            suffix: agent.executionMode || sizing?.mode === "STOP_LOSS" ? "includes estimated costs" : "of allocation",
            suffixColor: "text-muted-foreground",
          },
          {
            title: "Max Daily Loss",
            icon: AlertTriangle,
            value: `${agent?.risk.maxDailyLossPct}%`,
          },
          {
            title: "Max Open Positions",
            icon: Activity,
            value: `${agent?.risk.maxOpenPositions}`,
            suffix: "at once",
          },
          {
            title: "Max Trades per Day",
            icon: TrendingUp,
            value: `${agent?.risk.maxTradesPerDay ?? "—"}`,
            suffix: "trades",
          },
          {
            title: "Positions Opened per Day",
            icon: Clock,
            value: `${agent?.risk.maxPositionsOpenedPerDay ?? "—"}`,
            suffix: "entries",
          },
          {
            title: "Strategy",
            icon: Cpu,
            value: agent.executionMode ? algorithmNames[String(strategyConfig?.id)] ?? 'Algorithm' : agent.strategy.replace(/_/g, " "),
          },
          ...(agent.executionMode ? [{ title: "Configured Leverage", icon: TrendingUp, value: `${savedLeverage}×`, suffix: "isolated · saved target" }] : []),
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial="hidden"
            animate="visible"
            custom={i + 1}
            variants={fadeUp}
          >
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {card.value}
                  {card.suffix && (
                    <span
                      className={`ml-1.5 text-sm font-normal ${
                        card.suffixColor ?? "text-muted-foreground"
                      }`}
                    >
                      {card.suffix}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* L3: Detailed Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          initial="hidden"
          animate="visible"
          custom={5}
          variants={fadeUp}
          className="lg:col-span-2 space-y-6"
        >
          {/* Market Scope */}
          <section className="space-y-4">
            <h3 className="tui-section">
              <Globe className="h-4 w-4 text-primary" />
              Market Scope
            </h3>
            <div className="glass p-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Symbols
                </label>
                <div className="flex flex-wrap gap-2">
                  {agent?.market.symbols.map((s) => (
                    <Badge key={s} variant="outline" className="font-mono">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Cycle Frequency
                </label>
                <p className="text-sm font-medium text-foreground">
                  {agent?.market.agentCycles}
                </p>
              </div>
            </div>
          </section>
          {/* Exchange & Credential */}
          <section className="space-y-4">
            <h3 className="tui-section">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Execution Config
            </h3>

            <div className="glass p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Exchange */}
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Exchange
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">
                      {exchange?.displayName ? `${exchange.displayName} · ${exchange.name}` : exchange?.name ?? "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sandbox</span>
                    <span
                      className={`font-medium ${
                        exchange?.sandbox
                          ? "text-status-running"
                          : "text-muted-foreground"
                      }`}
                    >
                      {exchange?.sandbox ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground">Public URL</span>
                    <p className="font-mono text-xs truncate">
                      {exchange?.urls?.public ?? "N/A"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground">Private URL</span>
                    <p className="font-mono text-xs truncate">
                      {exchange?.urls?.private ?? "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Credential */}
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Credential
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">
                      {credentials?.displayName ? `${credentials.displayName} · ${credentials.type}` : credentials?.type ?? "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credential ID</span>
                    <span className="font-mono text-xs truncate max-w-[140px]">
                      {agent?.credentialId ?? "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Intelligence Settings */}
          <section className="space-y-4">
            <h3 className="tui-section">
              <Activity className="h-4 w-4 text-primary" />
              Intelligence Settings
            </h3>
            <div className="glass p-6 grid grid-cols-2 md:grid-cols-3 gap-8">
              {[
                { label: "Model", value: agent?.llmModel ?? "N/A" },
                {
                  label: "Temperature",
                  value: String(agent?.temperature),
                  mono: true,
                },
                { label: "Exchange", value: exchange?.displayName ? `${exchange.displayName} · ${exchange.name}` : exchange?.name, mono: true },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    {item.label}
                  </p>
                  <p
                    className={`text-sm font-medium text-foreground ${
                      item.mono ? "font-mono" : ""
                    }`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </motion.div>

        {/* Sidebar: Metadata */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={6}
          variants={fadeUp}
          className="space-y-6"
        >
          <Card className="bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
                System Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Type", value: agent?.type },
                {
                  label: "Agent ID",
                  value: agent?.id,
                  mono: true,
                  truncate: true,
                },
                {
                  label: "Last Run",
                  value: agent?.lastRun
                    ? format(new Date(agent?.lastRun), "MMM d, yyyy HH:mm:ss OOOO")
                    : "Never",
                  tabular: true,
                },
                {
                  label: "Next Run",
                  value: agent?.status !== "RUNNING"
                    ? "Paused"
                    : agent.nextRunAt
                      ? format(new Date(agent.nextRunAt), "MMM d, yyyy HH:mm:ss OOOO")
                      : "Awaiting scheduler",
                  tabular: true,
                },
                {
                  label: "Created",
                  value: agent?.createdAt
                    ? format(new Date(agent.createdAt), "MMM d, yyyy HH:mm:ss OOOO")
                    : "Unknown",
                },
              ].map((item, i, arr) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-muted-foreground shrink-0">
                      {item.label}
                    </span>
                    <span
                      className={`font-medium text-right text-foreground ${
                        item.mono ? "font-mono" : ""
                      } ${item.tabular ? "tabular-nums" : ""} ${
                        item.truncate ? "truncate max-w-[140px]" : ""
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                  {i < arr.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* L4: Agent Runs */}
        <motion.section
          initial="hidden"
          animate="visible"
          custom={7}
          variants={fadeUp}
          className="space-y-4 pt-4"
        >
          <div className="flex items-center justify-between ">
            <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Execution History
            </h3>
            <Badge variant="outline" className="font-mono">
              {runs.length} runs
            </Badge>
          </div>

          <div className="glass overflow-hidden">
            <div className="divide-y divide-border ">
              {runs.map((run, i) => (
                <motion.div
                  key={run.id}
                  initial="hidden"
                  animate="visible"
                  custom={8 + i * 0.5}
                  variants={fadeUp}
                  className="p-4 hover:bg-muted/50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <Clock className="h-3 w-3 shrink-0" />
                        {format(new Date(run.createdAt), "MMM d, yyyy HH:mm:ss OOOO")}
                      </div>
                      <div className="text-sm text-foreground leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all [&>*:first-child]:mt-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {run.llmResponse?.trim() || "No readable model output was saved for this run. Completion alone does not confirm a trading decision; inspect its execution evidence."}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </div>
                </motion.div>
              ))}
              {runs.length === 0 && (
                <div className="p-12 text-center text-muted-foreground italic text-sm">
                  No execution history found for this agent.
                </div>
              )}
            </div>
          </div>
        </motion.section>
      </div>
  );
}

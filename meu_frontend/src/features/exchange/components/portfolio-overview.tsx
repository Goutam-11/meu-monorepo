"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Balances, Position, Trade } from "ccxt";
import {
  ArrowRight,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type PortfolioOverviewProps = {
  exchangeName: string;
  connectionName?: string;
  name?: string;
  positions: Position[];
  trades: Trade[];
  balance: Balances;
  selector?: ReactNode;
  notices?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  unavailable?: { balance?: boolean; positions?: boolean; trades?: boolean };
};

function numeric(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function number(value: unknown, decimals = 2): string {
  const n = numeric(value);
  return n === undefined
    ? "—"
    : n.toLocaleString("en-US", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      });
}

function positionPnl(position: Position) {
  return numeric(position.unrealizedPnl ?? position.info?.unrealized_pnl);
}

function Side({ side }: { side?: string }) {
  const long = side === "long" || side === "buy";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs",
        long
          ? "bg-success/10 text-success"
          : "bg-destructive/10 text-destructive",
      )}
    >
      {long ? (
        <ArrowUpRight className="size-3" />
      ) : (
        <ArrowDownRight className="size-3" />
      )}
      {side ?? "—"}
    </span>
  );
}

export function PortfolioOverview({
  exchangeName, connectionName,
  name,
  positions,
  trades,
  balance,
  selector,
  notices,
  onRefresh,
  refreshing,
  unavailable = {},
}: PortfolioOverviewProps) {
  const [period, setPeriod] = useState("All");
  const [cutoff, setCutoff] = useState(0);
  const [tab, setTab] = useState("positions");
  const isKite = exchangeName.toUpperCase() === "ZERODHA";
  const currency = isKite
    ? "INR"
    : exchangeName.toUpperCase() === "BINANCE"
      ? "USDT"
      : "USD";
  const symbol = isKite ? "₹" : "$";
  // Kite's existing adapter exposes INR under USD; never relabel crypto USDT as USD.
  const wallet = balance[isKite ? "USD" : currency];
  const assetKeys = Object.keys(balance).filter(
    (key) =>
      !["info", "free", "used", "total", "timestamp", "datetime"].includes(
        key,
      ) &&
      balance[key] &&
      typeof balance[key] === "object",
  );
  const openPositions = positions.filter(
    (p) => Math.abs(numeric(p.contracts) ?? 0) > 0,
  );
  const pnlValues = openPositions.map(positionPnl);
  const unrealized =
    unavailable.positions || pnlValues.some((v) => v === undefined)
      ? undefined
      : pnlValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);

  const activity = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const trade of trades) {
      const timestamp = numeric(trade.timestamp);
      const cost = numeric(trade.cost);
      if (timestamp === undefined || timestamp < cutoff || cost === undefined)
        continue;
      const day = new Date(timestamp).toISOString().slice(0, 10);
      buckets.set(day, (buckets.get(day) ?? 0) + Math.abs(cost));
    }
    return [...buckets]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, volume]) => ({ date, volume }));
  }, [trades, cutoff]);

  return (
    <div className="page-shell space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="space-y-2">
          <h1 className="page-title">
            Welcome back
            {name ? (
              <>
                , <span className="text-primary">{name.split(" ")[0]}</span>
              </>
            ) : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            Your portfolio and trading activity, at a glance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selector}
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh portfolio"
            disabled={refreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={cn(refreshing && "animate-spin")} />
          </Button>
        </div>
      </header>
      {notices}
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.8fr_1.35fr]">
        <section className="neu-panel balance-panel flex min-w-0 flex-col gap-7 p-6 sm:p-7">
          <h2 className="section-title">
            Total balance{" "}
            <span className="ml-2 text-xs font-normal">{currency}</span>
          </h2>
          <p className="break-words text-3xl font-semibold tracking-tight tabular-nums xl:text-4xl">
            {unavailable.balance ? "—" : `${symbol}${number(wallet?.total)}`}
          </p>
          <dl className="grid grid-cols-2 gap-4 border-t border-current/20 pt-5">
            <div>
              <dt className="text-xs">Available</dt>
              <dd className="mt-2 font-mono text-lg">
                {unavailable.balance ? "—" : `${symbol}${number(wallet?.free)}`}
              </dd>
            </div>
            <div>
              <dt className="text-xs">Used</dt>
              <dd className="mt-2 font-mono text-lg">
                {unavailable.balance ? "—" : `${symbol}${number(wallet?.used)}`}
              </dd>
            </div>
          </dl>
          <Button asChild className="mt-auto w-fit">
            <Link href="/agents">
              View agents <ArrowRight />
            </Link>
          </Button>
        </section>
        <section className="neu-panel snapshot-panel flex min-w-0 flex-col gap-6 p-6 sm:p-7">
          <h2 className="section-title">Account snapshot</h2>
          <dl className="space-y-6">
            <div>
              <dt className="text-sm">Unrealized PnL</dt>
              <dd className="mt-2 text-2xl font-semibold tabular-nums">
                {unrealized === undefined
                  ? "—"
                  : `${unrealized >= 0 ? "+" : "−"}${symbol}${number(Math.abs(unrealized))}`}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-current/20 pt-5">
              <div>
                <dt className="text-xs">Open positions</dt>
                <dd className="mt-2 text-xl font-semibold tabular-nums">
                  {unavailable.positions ? "—" : openPositions.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs">Recent fills</dt>
                <dd className="mt-2 text-xl font-semibold tabular-nums">
                  {unavailable.trades ? "—" : trades.length}
                </dd>
              </div>
            </div>
          </dl>
          <p className="mt-auto text-xs">
            {connectionName ? `${connectionName} · ${exchangeName}` : exchangeName} · {currency} account
          </p>
        </section>
        <section className="neu-panel min-w-0 p-6 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">Open positions</h2>
            <button
              className="flex min-h-11 items-center gap-2 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setTab("positions");
                document
                  .getElementById("portfolio-details")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              View all <ArrowRight className="size-3.5" />
            </button>
          </div>
          {unavailable.positions ? (
            <p className="py-8 text-sm text-muted-foreground">
              Positions are unavailable. Refresh to retry.
            </p>
          ) : openPositions.length === 0 ? (
            <p className="neu-inset px-5 py-12 text-center text-sm text-muted-foreground">
              No open positions on this exchange.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {openPositions.slice(0, 4).map((p, index) => (
                <div
                  className="position-preview min-w-0 space-y-3"
                  key={`${p.symbol}-${p.side}-${index}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="break-all text-xs font-medium">{p.symbol}</p>
                    <Side side={p.side} />
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Contracts</dt>
                    <dd className="text-right font-mono">
                      {number(p.contracts, 3)}
                    </dd>
                    <dt className="text-muted-foreground">Entry</dt>
                    <dd className="text-right font-mono">
                      {symbol}
                      {number(p.entryPrice)}
                    </dd>
                    <dt className="text-muted-foreground">PnL</dt>
                    <dd
                      className={cn(
                        "text-right font-mono",
                        (positionPnl(p) ?? 0) >= 0
                          ? "text-success"
                          : "text-destructive",
                      )}
                    >
                      {number(positionPnl(p))}
                    </dd>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <section
        className="neu-panel p-6 sm:p-7"
        aria-label="Trading activity chart"
      >
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="section-title">Trading activity</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Daily volume of available fills · {currency}
            </p>
          </div>
          <div className="period-switch" aria-label="Chart period">
            {["All", "30D", "7D"].map((value) => (
              <button
                key={value}
                aria-pressed={period === value}
                onClick={() => {
                  setPeriod(value);
                  setCutoff(
                    value === "All"
                      ? 0
                      : Date.now() - Number(value.slice(0, -1)) * 86400000,
                  );
                }}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 w-full min-w-0 sm:h-72">
          {unavailable.trades || activity.length === 0 ? (
            <div className="neu-inset flex h-full flex-col items-center justify-center gap-2 px-5 text-center">
              <p className="text-sm">
                {unavailable.trades
                  ? "Trading activity is unavailable"
                  : "No fills in this period"}
              </p>
              <p className="text-xs text-muted-foreground">
                {unavailable.trades
                  ? "Refresh to retry."
                  : "Executed trades will appear here."}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={activity}
                margin={{ top: 10, right: 12, bottom: 5, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 6"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(date) =>
                    new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  axisLine={false}
                  tickLine={false}
                  minTickGap={36}
                />
                <YAxis
                  width={58}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    Number(value).toLocaleString("en-US", {
                      notation: "compact",
                    })
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "none",
                    borderRadius: 12,
                    boxShadow: "var(--neu-floating)",
                    color: "var(--foreground)",
                  }}
                  formatter={(value: number) => [
                    `${symbol}${number(value)}`,
                    "Fill volume",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={activity.length === 1}
                  activeDot={{
                    r: 5,
                    fill: "var(--primary)",
                    stroke: "var(--background)",
                  }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Available trade history only. Volume is not profit or account equity.
        </p>
      </section>
      <section
        id="portfolio-details"
        className="neu-panel overflow-hidden p-4 sm:p-6"
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="trades">Recent trades</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
          </TabsList>
          <TabsContent value="positions" className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Market",
                    "Side",
                    "Contracts",
                    "Entry price",
                    "Mark price",
                    "Unrealized PnL",
                    "Leverage",
                    "Margin",
                  ].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPositions.map((p, i) => (
                  <TableRow key={`${p.symbol}-${p.side}-${i}`}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {p.symbol}
                    </TableCell>
                    <TableCell>
                      <Side side={p.side} />
                    </TableCell>
                    <TableCell className="font-mono">
                      {number(p.contracts, 3)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {symbol}
                      {number(p.entryPrice)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {symbol}
                      {number(p.markPrice ?? p.info?.mark_price)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-mono",
                        (positionPnl(p) ?? 0) >= 0
                          ? "text-success"
                          : "text-destructive",
                      )}
                    >
                      {number(positionPnl(p))}
                    </TableCell>
                    <TableCell>
                      {p.leverage == null ? "—" : `${p.leverage}×`}
                    </TableCell>
                    <TableCell>
                      {p.marginMode ?? p.info?.margin ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {openPositions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {unavailable.positions
                        ? "Positions unavailable"
                        : "No open positions"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="trades" className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Time",
                    "Market",
                    "Side",
                    "Price",
                    "Amount",
                    "Cost",
                    "Fee",
                  ].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...trades]
                  .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
                  .map((t, i) => (
                    <TableRow key={t.id ?? i}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {t.timestamp
                          ? new Date(t.timestamp).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium">
                        {t.symbol}
                      </TableCell>
                      <TableCell>
                        <Side side={t.side} />
                      </TableCell>
                      <TableCell className="font-mono">
                        {number(t.price)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {number(t.amount, 3)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {number(t.cost)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono">
                        {number(t.fee?.cost)} {t.fee?.currency}
                      </TableCell>
                    </TableRow>
                  ))}
                {trades.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {unavailable.trades
                        ? "Trades unavailable"
                        : "No trades yet"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="balances" className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetKeys.map((asset) => (
                  <TableRow key={asset}>
                    <TableCell>
                      {isKite && asset === "USD" ? "INR" : asset}
                    </TableCell>
                    <TableCell className="font-mono">
                      {number(balance[asset]?.free)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {number(balance[asset]?.used)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {number(balance[asset]?.total)}
                    </TableCell>
                  </TableRow>
                ))}
                {assetKeys.length === 0 && wallet && (
                  <TableRow>
                    <TableCell>{currency}</TableCell>
                    <TableCell>{number(wallet.free)}</TableCell>
                    <TableCell>{number(wallet.used)}</TableCell>
                    <TableCell>{number(wallet.total)}</TableCell>
                  </TableRow>
                )}
                {!wallet && assetKeys.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No balance data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

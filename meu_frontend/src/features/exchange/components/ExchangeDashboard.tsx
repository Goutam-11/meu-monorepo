"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronsUpDown,
  Check,
  KeyRound,
  ExternalLink,
  CopyIcon,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import type { Exchange } from "@/generated/prisma/client";
import {
  useGetExchangeData,
  useKiteAuth,
  useSuspenseExchanges,
} from "../hooks/use-exchange";
import { AccountExecutionPanel } from "./account-execution-panel";
import { PortfolioOverview } from "./portfolio-overview";

type SafeExchange = Omit<Exchange, "accessToken">;

function ZerodhaReauth({
  exchangeId,
  exchangeName,
  loginUrl,
  activatingFromCallback,
}: {
  exchangeId: string;
  exchangeName: string;
  loginUrl: string | null;
  /** True when the URL still carries the Kite callback params for this
   *  exchange — supplied by the parent so the same flag drives both the
   *  dashboard header subtitle and the in-progress card. */
  activatingFromCallback: boolean;
}) {
  const kiteAuth = useKiteAuth(exchangeId);
  const [token, setToken] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-complete when redirected back from the Kite login page
  const requestToken = searchParams.get("request_token");
  const kiteExchangeId = searchParams.get("kite");
  useEffect(() => {
    if (
      requestToken &&
      kiteAuth.isPending === false &&
      kiteAuth.isSuccess === false &&
      (!kiteExchangeId || kiteExchangeId === exchangeId)
    ) {
      kiteAuth.mutate(
        { id: exchangeId, requestToken },
        {
          onSettled: () => router.replace("/dashboard"),
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestToken, kiteExchangeId, exchangeId]);

  if (activatingFromCallback) {
    return (
      <Card className="border-primary/30">
        <CardContent className="flex items-center gap-4 py-8">
          <div
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-chart-1/15 text-chart-1 ring-1 ring-inset ring-chart-1/30"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">
              Activating Zerodha session — {exchangeName}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Exchanging the request_token returned by Zerodha. Your dashboard
              will load automatically once the session is live.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4 text-chart-1" />
          Zerodha session required — {exchangeName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Kite access tokens are valid for <strong>one trading day</strong>. Log
          in to Zerodha to activate today&apos;s session — your agents resume
          automatically once the session is active.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {loginUrl && (
            <Button onClick={() => window.open(loginUrl, "_blank", "noopener")}>
              <ExternalLink className="size-4" />
              Log in to Zerodha
            </Button>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Input
              aria-label="Zerodha request token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="…or paste request_token here"
              className="min-w-40"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={token.trim().length < 10 || kiteAuth.isPending}
              onClick={() =>
                kiteAuth.mutate({ id: exchangeId, requestToken: token })
              }
            >
              {kiteAuth.isPending ? "Activating…" : "Activate"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            For automatic token exchange, set this as the redirect URL in your
            Kite app settings (developers.kite.trade → your app → Postman URL):
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate border border-border bg-secondary/60 px-3 py-2 font-mono text-[11px] text-foreground">
              {typeof window !== "undefined"
                ? `${window.location.origin}/dashboard?kite=${exchangeId}`
                : `/dashboard?kite=${exchangeId}`}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={async () => {
                const url =
                  typeof window !== "undefined"
                    ? `${window.location.origin}/dashboard?kite=${exchangeId}`
                    : `/dashboard?kite=${exchangeId}`;
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Redirect URL copied");
                } catch {
                  toast.error("Copy failed — select the URL manually");
                }
              }}
            >
              <CopyIcon className="size-3.5" />
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            After login Zerodha redirects here with the request_token — it is
            exchanged automatically and today&apos;s session activates.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExchangeDashboard() {
  const { data: exchanges } = useSuspenseExchanges();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = exchanges.find((ex) => ex.id === selectedId) ?? exchanges[0];
  if (!selected)
    return (
      <div className="page-shell space-y-8">
        <div>
          <h1 className="page-title">Your trading workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect an exchange to see your portfolio and trading activity.
          </p>
        </div>
        <section className="neu-panel max-w-2xl space-y-5 p-8">
          <h2 className="section-title">Start with your exchange</h2>
          <p className="text-sm text-muted-foreground">
            Connect Delta Exchange India, Binance or Zerodha, then configure
            your trading agents and their risk limits.
          </p>
          <Button asChild>
            <Link href="/exchanges/create">Connect an exchange</Link>
          </Button>
        </section>
      </div>
    );
  return (
    <ConnectedDashboard
      key={selected.id}
      selectedExchange={selected}
      exchanges={exchanges}
      onSelect={setSelectedId}
    />
  );
}

function ConnectedDashboard({
  selectedExchange,
  exchanges,
  onSelect,
}: {
  selectedExchange: SafeExchange;
  exchanges: SafeExchange[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const {
    data,
    safeData,
    warnings,
    isLoading,
    isFetching,
    error,
    refetch,
    kiteTokenExpired,
    kiteLoginUrl,
  } = useGetExchangeData(selectedExchange.id);
  const { data: session } = authClient.useSession();
  const searchParams = useSearchParams();
  const requestToken = searchParams.get("request_token");
  const callbackKite = searchParams.get("kite");
  const activating =
    !!requestToken && (!callbackKite || callbackKite === selectedExchange.id);
  const selector = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label="Select exchange"
          aria-expanded={open}
          className="min-w-44 justify-between"
        >
          {selectedExchange.displayName ? `${selectedExchange.displayName} · ${selectedExchange.name}` : selectedExchange.name}
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0">
        <Command>
          <CommandInput placeholder="Search exchanges…" />
          <CommandList>
            <CommandEmpty>No exchange found.</CommandEmpty>
            <CommandGroup>
              {exchanges.map((ex) => (
                <CommandItem
                  key={ex.id}
                  value={`${ex.displayName ?? ""} ${ex.name} ${ex.id}`}
                  onSelect={() => {
                    onSelect(ex.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      selectedExchange.id === ex.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  {ex.displayName ? `${ex.displayName} · ${ex.name}` : ex.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
  if (isLoading)
    return (
      <div className="page-shell space-y-6" aria-label="Loading portfolio">
        <div className="h-16 rounded-xl bg-muted animate-pulse" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="neu-panel h-72 animate-pulse" />
          ))}
        </div>
        <div className="neu-panel h-80 animate-pulse" />
      </div>
    );
  if (kiteTokenExpired)
    return (
      <div className="page-shell space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="page-title">Activate your Zerodha session</h1>
          {selector}
        </header>
        <ZerodhaReauth
          exchangeId={selectedExchange.id}
          exchangeName={selectedExchange.displayName ? `${selectedExchange.displayName} · ${selectedExchange.name}` : selectedExchange.name}
          loginUrl={kiteLoginUrl}
          activatingFromCallback={activating}
        />
      </div>
    );
  const notices =
    error || warnings.length > 0 ? (
      <div
        role="alert"
        className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5"
      >
        <h2 className="text-sm font-medium">
          Some account data could not be loaded
        </h2>
        <p className="mt-2 break-words text-sm text-muted-foreground">
          {error?.message ?? warnings.join(" · ")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </div>
    ) : undefined;
  return (
    <>
    <PortfolioOverview
      exchangeName={selectedExchange.name}
      connectionName={selectedExchange.displayName ?? undefined}
      name={session?.user.name}
      positions={safeData.positions}
      trades={safeData.trades}
      balance={safeData.balance}
      selector={selector}
      notices={notices}
      onRefresh={() => refetch()}
      refreshing={isFetching}
      unavailable={{
        balance: !!error || !!data?.balanceError,
        positions: !!error || !!data?.positionsError,
        trades: !!error || !!data?.tradesError,
      }}
    />
    {["DELTA","BINANCE"].includes(selectedExchange.name.toUpperCase()) && !selectedExchange.sandbox && <AccountExecutionPanel exchangeId={selectedExchange.id}/>}
    </>
  );
}

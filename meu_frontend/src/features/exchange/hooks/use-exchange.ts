import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTRPC } from "@/trpc/client";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { browserSnapshotStorage, classifyExchangeFailure, nextPollInterval, parseExchangeSnapshot, snapshotKey, subscribeExchangeSnapshots, writeExchangeSnapshot, type ExchangeSnapshot } from "../lib/exchange-snapshot";
import type { Balances, Position, Trade } from "ccxt";

export const useSuspenseExchanges = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.exchange.getAll.queryOptions());
};

export const useExchangesPaginated = ({
  page,
  search,
}: {
  page: number;
  search: string;
}) => {
  const trpc = useTRPC();
  return useQuery(trpc.exchange.getPaginated.queryOptions({ page, search }, {
    placeholderData: keepPreviousData,
    throwOnError: true,
  }));
};
export const useSuspenseExchange = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.exchange.getOne.queryOptions({ id }));
};

export const useCreateExchange = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation(
    trpc.exchange.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Exchange created successfully");
        queryClient.invalidateQueries(trpc.exchange.getAll.queryOptions());
        queryClient.invalidateQueries({ queryKey: trpc.exchange.getPaginated.queryKey() });
        queryClient.invalidateQueries(
          trpc.exchange.getOne.queryOptions({ id: data.id }),
        );
        router.push("/exchanges");
      },
      onError: (error) => {
        toast.error(`Error creating exchange: ${error.message}`);
      },
    }),
  );
};

export const useUpdateExchange = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation(
    trpc.exchange.update.mutationOptions({
      onSuccess: (data) => {
        toast.success("Exchange updated successfully");
        queryClient.invalidateQueries(trpc.exchange.getAll.queryOptions());
        queryClient.invalidateQueries({ queryKey: trpc.exchange.getPaginated.queryKey() });
        queryClient.invalidateQueries(
          trpc.exchange.getOne.queryOptions({ id: data.id }),
        );
        router.push("/exchanges");
      },
      onError: (error) => {
        toast.error(`Error updating exchange: ${error.message}`);
      },
    }),
  );
};

export const useDeleteExchange = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation(
    trpc.exchange.delete.mutationOptions({
      onSuccess: (data) => {
        toast.success("Exchange deleted successfully");
        queryClient.invalidateQueries(trpc.exchange.getAll.queryOptions());
        queryClient.invalidateQueries({ queryKey: trpc.exchange.getPaginated.queryKey() });
        queryClient.invalidateQueries(
          trpc.exchange.getOne.queryOptions({ id: data.id }),
        );
        router.push("/exchanges");
      },
      onError: (error) => {
        toast.error(`Error deleting exchange: ${error.message}`);
      },
    }),
  );
};

type SnapshotData = { positions: Position[]; trades: Trade[]; balance: Balances };
type ExchangeQueryData = SnapshotData & {
  positionsError?: string | null;
  tradesError?: string | null;
  balanceError?: string | null;
  hasError?: unknown;
  kiteTokenExpired?: boolean;
  loginUrl?: string | null;
};

export const useGetExchangeData = (exchangeId: string) => {
  const trpc = useTRPC();
  const [hidden, setHidden] = useState(false);
  const snapshotRaw = useSyncExternalStore(
    useCallback((onChange) => subscribeExchangeSnapshots(onChange), []),
    useCallback(() => browserSnapshotStorage()?.getItem(snapshotKey(exchangeId)) ?? "", [exchangeId]),
    () => "",
  );
  const snapshot = useMemo(() => parseExchangeSnapshot<SnapshotData>(snapshotRaw), [snapshotRaw]);

  useEffect(() => {
    const update = () => setHidden(document.visibilityState === "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const query = useQuery(
    trpc.exData.getById.queryOptions(
      { id: exchangeId },
      {
        enabled: !!exchangeId,
        retry: 2,
        staleTime: 5_000,
        refetchInterval: (current) => nextPollInterval({
          hidden,
          failed: Boolean(current.state.error) || Boolean((current.state.data as ExchangeQueryData | undefined)?.hasError),
        }),
      }
    )
  );

  const live = query.data as ExchangeQueryData | undefined;
  const data = live ?? (snapshot?.data as ExchangeQueryData | undefined);

  useEffect(() => {
    if (!live || live.hasError || live.kiteTokenExpired) return;
    const next: ExchangeSnapshot<SnapshotData> = {
      data: { positions: live.positions ?? [], trades: live.trades ?? [], balance: live.balance ?? {} },
      fetchedAt: query.dataUpdatedAt || Date.now(),
      source: "broker",
    };
    const storage = browserSnapshotStorage();
    if (storage) writeExchangeSnapshot(storage, exchangeId, next);
  }, [live, query.dataUpdatedAt, exchangeId]);

  const failureKind = classifyExchangeFailure({
    errorMessage: query.error?.message,
    positionsError: data?.positionsError,
    tradesError: data?.tradesError,
    balanceError: data?.balanceError,
  });
  const failed = failureKind !== "none";
  const isInitialLoading = query.isLoading && !snapshot;
  const isStale = !!snapshot && (query.isError || !live || (query.dataUpdatedAt > 0 && query.dataUpdatedAt < snapshot.fetchedAt));
  const lastUpdated = live ? query.dataUpdatedAt || snapshot?.fetchedAt : snapshot?.fetchedAt;

  // Zerodha daily token state — when expired the UI shows the re-auth flow
  const kiteData = data as { kiteTokenExpired?: boolean; loginUrl?: string | null } | undefined;
  const kiteTokenExpired: boolean = kiteData?.kiteTokenExpired === true;
  const kiteLoginUrl: string | null = kiteData?.loginUrl ?? null;

  //Normalize partial errors into warnings
  const warnings = kiteTokenExpired
    ? []
    : [
        data?.positionsError && `Positions: ${data.positionsError}`,
        data?.tradesError && `Trades: ${data.tradesError}`,
        data?.balanceError && `Balance: ${data.balanceError}`,
      ].filter(Boolean) as string[];

  //Safe fallback data
  const safeData = {
    positions: data?.positions as Position[] ?? [],
    trades: data?.trades as Trade[] ?? [],
    balance: data?.balance as Balances ?? {},
  };

  //Detect total failure
  const isTotallyBroken = !kiteTokenExpired && !!data?.positionsError && !!data?.tradesError && !!data?.balanceError;

  return {
    ...query,
    data,
    safeData,
    warnings,
    isTotallyBroken,
    kiteTokenExpired,
    kiteLoginUrl,
    isInitialLoading,
    isStale,
    lastUpdated,
    failureKind,
    failed,
  };
};

/** Zerodha daily re-auth: submit a login request_token to activate the session. */
export const useKiteAuth = (exchangeId: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.exchange.kiteAuth.mutationOptions({
      retry: false,
      onSuccess: (result) => {
        if (!result.ok) {
          toast.error(`Kite auth failed: ${result.error ?? "Session exchange failed"}`);
          return;
        }
        toast.success("Zerodha session activated for today");
        queryClient.invalidateQueries({
          queryKey: trpc.exData.getById.queryKey({ id: exchangeId }),
        });
      },
      onError: (error) => {
        toast.error(`Kite auth failed: ${error.message}`);
      },
    }),
  );
};

"use client";
import {
  EntityContainer,
  EntityHeader,
  EntitySearch,
  EntityPagination,
  EmptyView,
} from "@/components/entityComponents";
import { useState, useCallback } from "react";
import { useDeleteAgent, useAgents } from "../hooks/use-agent";
import { Status } from "@/generated/prisma/enums";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PencilIcon, Trash2Icon } from "lucide-react";

function StatusPill({ status }: { status: string }) {
  const isRunning = status === Status.RUNNING;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-widest ring-1 ring-inset",
        isRunning
          ? "bg-status-running/10 text-status-running ring-status-running/30"
          : "bg-muted text-muted-foreground ring-border"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          isRunning ? "pulse-dot bg-status-running" : "bg-muted-foreground"
        )}
      />
      {status}
    </span>
  );
}

export function AgentsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const router = useRouter();
  const deleteAgent = useDeleteAgent();

  // Fetch data with pagination and search
  const { data, isFetching } = useAgents({ page, search });
  const agents = data?.agents ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;

  // Debounce search to avoid excessive re-renders
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on search
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <EntityContainer
      loading={isFetching}
      loadingVariant="list"
      loadingRowHeight={72}
      header={
        <EntityHeader
          title="Agents"
          description="Manage your AI agents and their configurations"
          newButtonLabel="New Agent"
          onNew={() => router.push("/agents/create")}
        />
      }
      search={
        <EntitySearch
          value={search}
          onChange={handleSearch}
          placeholder="Search agents by name..."
        />
      }
      pagination={
        <EntityPagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          disabled={isFetching}
        />
      }
    >
      {agents.length === 0 ? (
        <EmptyView
          title={search ? "No agents found" : "No agents yet"}
          message={
            search
              ? "Try adjusting your search criteria"
              : "Create your first AI agent to get started"
          }
          onNew={() => router.push("/agents/create")}
          newButtonLabel="Create Agent"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {agents.map((agent) => (
            <article key={agent.id} className="neu-panel group relative grid min-w-0 gap-3 p-3 xl:grid-cols-[minmax(12rem,1fr)_minmax(0,1.35fr)_12rem] xl:items-center xl:gap-6 xl:py-2">
              <div className={cn("min-w-0 space-y-2 rounded-xl p-3 xl:self-stretch xl:content-center", agent.status === Status.RUNNING ? "tile-forest" : "bg-muted")}>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                  <Link href={`/agents/${agent.id}`} title={agent.name} className="min-w-0 max-w-full truncate text-sm font-semibold hover:underline underline-offset-4 after:absolute after:inset-0 after:rounded-xl focus-visible:outline-primary">
                    {agent.name}
                  </Link>
                  <StatusPill status={agent.status} />
                  {agent.executionMode && <span className="text-xs font-medium text-muted-foreground">{agent.executionMode}</span>}
                </div>
                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate" title={agent.market.symbols.join(" · ")}>
                    {agent.market.symbols.length ? agent.market.symbols.join(" · ") : "No symbols"}
                  </span>
                  <span className="shrink-0" aria-hidden="true">·</span>
                  <span className="shrink-0 text-xs" title={agent.id}>ID #{agent.id.slice(0, 6)}</span>
                </div>
              </div>

              <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 xl:gap-x-3">
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Allocated capital</dt>
                  <dd className="mt-1 truncate text-sm font-semibold tabular-nums">
                    {agent.capital.allocated} <span className="text-xs font-normal text-muted-foreground">{agent.capital.currency}</span>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Model</dt>
                  <dd className="mt-1 truncate text-xs font-medium" title={agent.llmModel || undefined}>
                    {agent.strategy === "ALGO_TRADING" ? "Rule based" : agent.llmModel?.split("/").pop() || "Default"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Cycle</dt>
                  <dd className="mt-1 text-xs font-medium tabular-nums">{agent.market.agentCycles}s</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Last run</dt>
                  <dd className="mt-1 truncate text-xs font-medium" title={agent.lastRun ? new Date(agent.lastRun).toLocaleString() : undefined}>
                    {agent.lastRun ? formatDistanceToNow(new Date(agent.lastRun), { addSuffix: true }) : "Never"}
                  </dd>
                </div>
              </dl>

              <div className="relative z-10 flex items-center justify-end gap-2">
                {agent.type === "CRYPTO" && agent.executionMode !== "PAPER" && (
                  <Link href={`/exchanges/${agent.exchangeId}/reconciliation`} aria-label={`Recover ${agent.name} account`} className="inline-flex min-h-11 items-center rounded-full border border-border px-3 text-sm font-medium transition-colors hover:underline underline-offset-4 focus-visible:outline-primary">Recovery</Link>
                )}
                {(
                  <button aria-label={`Edit ${agent.name}`} onClick={() => router.push(`/agents/${agent.id}/edit`)} className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-primary">
                    <PencilIcon className="size-3.5" />
                  </button>
                )}
                <button aria-label={`Delete ${agent.name}`} disabled={deleteAgent.isPending} onClick={() => deleteAgent.mutate({ id: agent.id })} className="flex size-11 items-center justify-center rounded-full border border-destructive/40 text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-destructive disabled:opacity-50">
                  <Trash2Icon className="size-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </EntityContainer>
  );
}

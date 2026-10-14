"use client";

import { useState } from "react";
import {
  EntityContainer,
  EntityHeader,
  EntitySearch,
  EntityList,
  EntityItem,
  EntityPagination,
  EntityAvatar,
  EntityBadge,
  EmptyView,
} from "@/components/entityComponents";
import { CandlestickChartIcon } from "lucide-react";
import { formatDate, formatDistanceToNow } from "date-fns";
import { useDeleteExchange, useExchangesPaginated } from "../hooks/use-exchange";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Button } from '@/components/ui/button';


export default function ExchangesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const router = useRouter()
  const deleteExchange = useDeleteExchange();

  const { data, isFetching } = useExchangesPaginated({ page, search });
  const exchanges = data?.exchanges ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };


  return (
    <EntityContainer
      loading={isFetching}
      header={
        <EntityHeader
          title="Exchanges"
          description="Securely manage Exchange keys and access tokens"
          newButtonLabel="Add Exchange"
          onNew={() => router.push("/exchanges/create")}
        />
      }
      search={
        <EntitySearch
          value={search}
          onChange={handleSearch}
          placeholder="Search exchanges..."
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
      <EntityList
        items={exchanges}
        getKey={(ex) => ex.id}
        emptyView={
          <EmptyView
            title="No Exchanges found"
            message="Add your first Exchange key or access token"
            onNew={() => router.push("/exchanges/create")}
            newButtonLabel="Add Exchange"
          />
        }
        renderItem={(ex) => (
          <EntityItem
            title={ex.displayName || ex.name}
            tone={ex.sandbox ? "sand" : "sage"}
            className="flex flex-row h-16 items-center"
            subtitle={`${ex.name} · ${ex.sandbox ? "Sandbox" : "Live"} • Created ${formatDate(ex.createdAt, "dd MMMM yyyy")} • Updated ${formatDistanceToNow(new Date(ex.updatedAt), {
              addSuffix:true
            })}`}
            image={
              <EntityAvatar
                icon={CandlestickChartIcon}
                variant={ex.sandbox ? "apricot" : "forest"}
              />
            }
            badge={
              <EntityBadge variant={"success"}>
                {"Active"}
              </EntityBadge>
            }
            onEdit={() => router.push(`/exchanges/${ex.id}/edit`)}
            actions={['DELTA','BINANCE'].includes(ex.name.toUpperCase()) ? <Button asChild variant="secondary" size="sm"><Link href={`/exchanges/${ex.id}/reconciliation`}>Recovery</Link></Button> : null}
            onRemove={() => deleteExchange.mutate({id:ex.id})}
          />
        )}
      />
    </EntityContainer>
  );
}

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
import { KeyIcon, CopyIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeleteCredential, useCredentials } from "../hooks/use-credentials";
import { formatDate, formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";


export default function CredentialsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();
  const deleteCredential = useDeleteCredential();

  const { data, isFetching } = useCredentials({ page, search });
  const credentials = data?.credentials ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(key);
    toast.info("Credential ID copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <EntityContainer
      loading={isFetching}
      loadingRowHeight={72}
      header={
        <EntityHeader
          title="Credentials"
          description="Securely manage your API keys and access tokens"
          newButtonLabel="Add Credential"
          onNew={() => router.push("/credentials/create")}
        />
      }
      search={
        <EntitySearch
          value={search}
          onChange={handleSearch}
          placeholder="Search credentials..."
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
        items={credentials}
        getKey={(cred) => cred.id}
        emptyView={
          <EmptyView
            title="No credentials found"
            message="Add your first API key or access token"
            onNew={() => router.push("/credentials/create")}
            newButtonLabel="Add Credential"
          />
        }
        renderItem={(cred) => (
          <EntityItem
            title={cred.displayName || (cred.type === "AMAZON_BEDROCK" ? "Amazon Bedrock" : cred.type)}
            tone={cred.type === "AMAZON_BEDROCK" ? "sand" : "sage"}
            className="flex flex-row h-18 items-center"
            subtitle={`${cred.type}${cred.type === "AMAZON_BEDROCK" ? ` · ${cred.bedrockEndpoint === "mantle" ? "Mantle" : "Runtime"}` : ""}${cred.region ? ` · ${cred.region}` : ""} • Created ${formatDate(cred.createdAt, "dd MMMM yyyy")} • Updated ${formatDistanceToNow(new Date(cred.updatedAt), {
              addSuffix:true
            })}`}
            image={
              <EntityAvatar
                icon={KeyIcon}
                variant="forest"
              />
            }
            badge={
              <EntityBadge variant={"success"}>
                {"Active"}
              </EntityBadge>
            }
            actions={
              <div className="flex items-center gap-1">
                <Button
                  aria-label="Copy credential ID"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCopy(cred.id);
                  }}
                >
                  {copiedId === cred.id ? (
                    <CheckIcon className="size-4 text-emerald-500" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                </Button>
              </div>
            }
            onEdit={() => router.push(`/credentials/${cred.id}/edit`)}
            onRemove={() => deleteCredential.mutate({id: cred.id})}
          />
        )}
      />
    </EntityContainer>
  );
}

import { AgentsPage } from "@/features/agents/components/agent";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { LoggedErrorBoundary as ErrorBoundary } from "@/components/LoggedErrorBoundary";
import { EntityListSkeleton } from "@/components/entityComponents";
import { ErrorView } from "@/components/entityComponents";

const Page = async () => {
  await requireAuth();
  return (
    <HydrateClient>
      <Suspense fallback={<EntityListSkeleton />}>
        <ErrorBoundary
          fallback={<ErrorView message="Failed to load agents" />}
        >
          <AgentsPage />
        </ErrorBoundary>
      </Suspense>
    </HydrateClient>
  );
};

export default Page;

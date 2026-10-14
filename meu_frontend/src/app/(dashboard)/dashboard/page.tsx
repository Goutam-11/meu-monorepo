import { ExchangeDashboard } from "@/features/exchange/components/ExchangeDashboard";
import { requireAuth } from "@/lib/auth/session";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { LoggedErrorBoundary as ErrorBoundary } from "@/components/errors/LoggedErrorBoundary";
import { EntityDetailSkeleton, ErrorView } from "@/components/entityComponents";

const Page = async () => {
  await requireAuth();
  return (
    <HydrateClient>
      <Suspense fallback={<EntityDetailSkeleton />}>
        <ErrorBoundary
          fallback={<ErrorView message="Failed to load dashboard" />}
        >
          <ExchangeDashboard />
        </ErrorBoundary>
      </Suspense>
    </HydrateClient>
  );
};

export default Page;

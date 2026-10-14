import EditCredentialPage from "@/features/credentials/components/EditCred";
import { requireAuth } from "@/lib/auth/session";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { LoggedErrorBoundary as ErrorBoundary } from "@/components/errors/LoggedErrorBoundary";
import { EntityDetailSkeleton, ErrorView } from "@/components/entityComponents";

interface PageProps {
  params: Promise<{
    credentialId: string;
  }>;
}

const Page = async ({
  params
}: PageProps) => {
  await requireAuth();
  const { credentialId } = await params;
  return (
    <HydrateClient>
      <Suspense fallback={<EntityDetailSkeleton />}>
        <ErrorBoundary
          fallback={<ErrorView message="Failed to load credential editor" />}
        >
          <EditCredentialPage credentialId={credentialId} />
        </ErrorBoundary>
      </Suspense>
    </HydrateClient>
  );
};

export default Page;

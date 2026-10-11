"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorView } from "@/components/entityComponents";
import { reportClientError } from "@/lib/client-error-report";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError("dashboard", "render_failed");
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <ErrorView message="An unexpected error occurred" />
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}

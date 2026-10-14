"use client";

import { ErrorBoundary, type ErrorBoundaryProps } from "react-error-boundary";
import { reportClientError } from "@/lib/logging/client-error-report";

export function LoggedErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <ErrorBoundary
      {...props}
      onError={(error, info) => {
        reportClientError("dashboard", "render_failed");
        props.onError?.(error, info);
      }}
    />
  );
}

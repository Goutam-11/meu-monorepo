import { Skeleton } from "@/components/ui/skeleton";

export const EntityCardsSkeleton = ({ variant = "list", rowHeight = 64 }: { variant?: "list" | "grid"; rowHeight?: 64 | 72 }) => (
  <div role="status" aria-label="Loading results" className={variant === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
    <span className="sr-only">Loading results</span>
    {Array.from({ length: variant === "grid" ? 3 : 5 }).map((_, index) => (
      variant === "grid" ? (
        <div key={index} className="neu-panel space-y-4 p-6">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div key={index} className={`neu-panel flex items-center gap-4 px-4 ${rowHeight === 72 ? "h-18" : "h-16"}`}>
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          <Skeleton className="size-6 shrink-0 rounded-md" />
        </div>
      )
    ))}
  </div>
);

export const EntityListSkeleton = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="w-full space-y-3 p-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-xl border bg-card divide-y divide-border overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex h-16 items-center gap-4 px-4">
            <Skeleton className="size-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const EntityDetailSkeleton = () => {
  return (
    <div className="w-full space-y-4 p-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
};

import { cn } from "@/lib/utils";
import { EntityCardsSkeleton } from "./EntityListSkeleton";

type EntityContainerProps = {
  header?: React.ReactNode;
  search?: React.ReactNode;
  pagination?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  loadingVariant?: "list" | "grid";
  loadingRowHeight?: 64 | 72;
};

export const EntityContainer = ({
  header,
  search,
  pagination,
  children,
  className,
  loading = false,
  loadingVariant = "list",
  loadingRowHeight = 64,
}: EntityContainerProps) => {
  return (
    <div className={cn("page-shell flex h-full min-h-0 flex-col gap-y-8 overflow-hidden", className)}>
      {header && <div className="shrink-0">{header}</div>}
      <div className="flex min-h-0 flex-1 flex-col gap-y-6">
        {search && <div className="shrink-0">{search}</div>}
        <div aria-busy={loading} className="-m-4 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-4">
          {loading ? <EntityCardsSkeleton variant={loadingVariant} rowHeight={loadingRowHeight} /> : children}
        </div>
      </div>
      {pagination && <div className="shrink-0">{pagination}</div>}
    </div>
  );
};

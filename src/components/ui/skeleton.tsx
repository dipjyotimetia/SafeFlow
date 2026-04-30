import { cn } from "@/lib/utils";

interface SkeletonProps extends React.ComponentProps<"div"> {
  shimmer?: boolean;
  /**
   * Retained for back-compat with ~30 callsites in loading.tsx files; the
   * shimmer treatment no longer differs between values.
   */
  variant?: "default" | "premium";
}

function Skeleton({
  className,
  shimmer = true,
  variant: _variant,
  ...props
}: SkeletonProps) {
  void _variant;
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-sm",
        shimmer
          ? "bg-linear-to-r from-muted via-muted/40 to-muted animate-shimmer bg-size-[400%_100%]"
          : "bg-muted animate-pulse",
        className,
      )}
      {...props}
    />
  );
}

function SkeletonCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card p-6 space-y-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded-sm" />
      </div>
      <Skeleton className="h-9 w-36" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12 rounded-[2px]" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

function SkeletonChart({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card p-6 space-y-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-9 w-28 rounded-sm" />
      </div>
      <div className="relative h-[300px] w-full">
        <Skeleton className="absolute inset-0 rounded-sm" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2 h-[200px]">
          {[0.4, 0.7, 0.5, 0.8, 0.6, 0.9, 0.5].map((height, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-[2px]"
              style={{
                height: `${height * 100}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonTable({
  rows = 5,
  className,
  ...props
}: React.ComponentProps<"div"> & { rows?: number }) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card p-6 space-y-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-24 rounded-sm" />
      </div>
      <div className="space-y-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 py-3 px-2 rounded-sm"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <Skeleton className="h-9 w-9 rounded-sm" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-2.5 w-32" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonTransaction({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-4 py-3 px-2 rounded-sm", className)}
      {...props}
    >
      <Skeleton className="h-9 w-9 rounded-sm" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-2.5 w-28" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-24 ml-auto" />
        <Skeleton className="h-4 w-16 ml-auto rounded-[2px]" />
      </div>
    </div>
  );
}

function SkeletonMetricCards({
  count = 4,
  className,
  ...props
}: React.ComponentProps<"div"> & { count?: number }) {
  return (
    <div
      className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
  SkeletonTransaction,
  SkeletonMetricCards,
};

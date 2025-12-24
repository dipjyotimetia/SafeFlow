import { cn } from "@/lib/utils"

interface SkeletonProps extends React.ComponentProps<"div"> {
  shimmer?: boolean
  variant?: "default" | "premium"
}

function Skeleton({ className, shimmer = true, variant = "default", ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-lg",
        shimmer
          ? variant === "premium"
            ? "bg-gradient-to-r from-muted via-muted/60 to-muted animate-shimmer bg-[length:400%_100%]"
            : "bg-gradient-to-r from-accent via-accent/50 to-accent animate-shimmer"
          : "bg-accent animate-pulse",
        className
      )}
      {...props}
    />
  )
}

function SkeletonCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/40 bg-card p-6 space-y-4",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" variant="premium" />
        <Skeleton className="h-9 w-9 rounded-xl" variant="premium" />
      </div>
      <Skeleton className="h-9 w-36" variant="premium" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-12 rounded-full" variant="premium" />
        <Skeleton className="h-3 w-20" variant="premium" />
      </div>
    </div>
  )
}

function SkeletonChart({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/40 bg-card p-6 space-y-4",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" variant="premium" />
          <Skeleton className="h-3 w-48" variant="premium" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" variant="premium" />
      </div>
      <div className="relative h-[300px] w-full">
        <Skeleton className="absolute inset-0 rounded-lg" variant="premium" />
        {/* Fake chart bars for visual interest */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2 h-[200px]">
          {[0.4, 0.7, 0.5, 0.8, 0.6, 0.9, 0.5].map((height, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-md"
              style={{ height: `${height * 100}%`, animationDelay: `${i * 0.1}s` }}
              variant="premium"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SkeletonTable({ rows = 5, className, ...props }: React.ComponentProps<"div"> & { rows?: number }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/40 bg-card p-6 space-y-4",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" variant="premium" />
        <Skeleton className="h-9 w-24 rounded-lg" variant="premium" />
      </div>
      <div className="space-y-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 py-3 px-2 rounded-lg"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <Skeleton className="h-10 w-10 rounded-full" variant="premium" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" variant="premium" />
              <Skeleton className="h-3 w-32" variant="premium" />
            </div>
            <Skeleton className="h-5 w-24" variant="premium" />
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonTransaction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-4 py-3 px-2 rounded-lg", className)}
      {...props}
    >
      <Skeleton className="h-10 w-10 rounded-full" variant="premium" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-44" variant="premium" />
        <Skeleton className="h-3 w-28" variant="premium" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-5 w-24 ml-auto" variant="premium" />
        <Skeleton className="h-5 w-16 ml-auto rounded-full" variant="premium" />
      </div>
    </div>
  )
}

function SkeletonMetricCards({ count = 4, className, ...props }: React.ComponentProps<"div"> & { count?: number }) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  )
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
  SkeletonTransaction,
  SkeletonMetricCards
}

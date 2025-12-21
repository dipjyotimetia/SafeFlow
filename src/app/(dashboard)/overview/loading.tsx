import { Skeleton, SkeletonCard, SkeletonChart, SkeletonTransaction } from '@/components/ui/skeleton';

export default function OverviewLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between h-16 -mt-6 -mx-6 px-6 border-b bg-background/95 backdrop-blur-md">
        <Skeleton className="h-7 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonChart />
        <SkeletonChart />
      </div>

      {/* Recent transactions */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="space-y-1">
          {[...Array(5)].map((_, i) => (
            <SkeletonTransaction key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

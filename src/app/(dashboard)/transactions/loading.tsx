import { Skeleton, SkeletonCard, SkeletonTransaction } from '@/components/ui/skeleton';

export default function TransactionsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between h-16 -mt-6 -mx-6 px-6 border-b bg-background/95 backdrop-blur-md">
        <Skeleton className="h-7 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Transaction list */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-1">
          {[...Array(10)].map((_, i) => (
            <SkeletonTransaction key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

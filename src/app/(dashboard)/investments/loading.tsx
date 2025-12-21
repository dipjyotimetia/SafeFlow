import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui/skeleton';

export default function InvestmentsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between h-16 -mt-6 -mx-6 px-6 border-b bg-background/95 backdrop-blur-md">
        <Skeleton className="h-7 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Portfolio summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Holdings table */}
      <SkeletonTable rows={6} />
    </div>
  );
}

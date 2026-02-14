import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border/60 bg-card/70 p-6">
        <Skeleton className="h-7 w-40" variant="premium" />
        <Skeleton className="mt-3 h-4 w-72" variant="premium" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <Skeleton className="h-5 w-44" variant="premium" />
          <Skeleton className="mt-3 h-64 w-full" variant="premium" />
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <Skeleton className="h-5 w-44" variant="premium" />
          <Skeleton className="mt-3 h-64 w-full" variant="premium" />
        </div>
      </div>
    </div>
  );
}

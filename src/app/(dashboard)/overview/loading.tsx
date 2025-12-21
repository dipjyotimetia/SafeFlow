import { Skeleton } from '@/components/ui/skeleton';

export default function OverviewLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 border rounded-lg space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-6 border rounded-lg space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <div className="p-6 border rounded-lg space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>

      {/* Recent transactions */}
      <div className="p-6 border rounded-lg space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-48 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

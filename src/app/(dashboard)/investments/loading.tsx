import { Skeleton } from '@/components/ui/skeleton';

export default function InvestmentsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Portfolio summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 border rounded-lg space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Holdings table */}
      <div className="p-6 border rounded-lg space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-4 w-20 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

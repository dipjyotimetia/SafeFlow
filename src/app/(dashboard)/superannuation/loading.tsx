import { Skeleton } from '@/components/ui/skeleton';

export default function SuperannuationLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Super account cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="p-6 border rounded-lg space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-36" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

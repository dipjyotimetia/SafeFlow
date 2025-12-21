import { Skeleton } from '@/components/ui/skeleton';

export default function TaxLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-6 border rounded-lg space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>

      {/* Deductions breakdown */}
      <div className="p-6 border rounded-lg space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <Skeleton className="h-8 w-32" />

      {/* Settings sections */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-4">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

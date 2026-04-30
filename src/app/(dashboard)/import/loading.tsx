import { Skeleton } from '@/components/ui/skeleton';

export default function ImportLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="fintech-panel rounded-lg border border-border/80 p-6">
        <Skeleton className="h-7 w-44" variant="premium" />
        <Skeleton className="mt-3 h-4 w-80" variant="premium" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="fintech-panel rounded-lg border border-border/80 p-6 lg:col-span-2">
          <Skeleton className="h-5 w-36" variant="premium" />
          <Skeleton className="mt-4 h-56 w-full" variant="premium" />
        </div>
        <div className="fintech-panel rounded-lg border border-border/80 p-6">
          <Skeleton className="h-5 w-32" variant="premium" />
          <Skeleton className="mt-4 h-56 w-full" variant="premium" />
        </div>
      </div>
    </div>
  );
}

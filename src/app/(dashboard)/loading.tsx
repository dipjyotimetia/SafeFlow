import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Alert variant="destructive" className="max-w-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription className="mt-2">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </AlertDescription>
        <Button onClick={reset} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </Alert>
    </div>
  );
}

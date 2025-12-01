'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Wifi,
  WifiOff,
  Loader2,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIConnectionStatus } from '@/types';

interface ConnectionStatusProps {
  status: AIConnectionStatus;
  isModelReady: boolean;
  error: string | null;
  isPulling: boolean;
  pullProgress: number;
  pullStatus: string;
  onRetry: () => void;
  onPullModel: () => void;
}

export function ConnectionStatus({
  status,
  isModelReady,
  error,
  isPulling,
  pullProgress,
  pullStatus,
  onRetry,
  onPullModel,
}: ConnectionStatusProps) {
  // Model pulling UI
  if (isPulling) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Download className="h-4 w-4 animate-bounce" />
          <span>Downloading model...</span>
        </div>
        <Progress value={pullProgress} className="h-2" />
        <p className="text-xs text-muted-foreground">{pullStatus}</p>
      </div>
    );
  }

  // Connected and ready
  if (status === 'connected' && isModelReady) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        <span>Connected to local AI</span>
      </div>
    );
  }

  // Connected but model not ready
  if (status === 'connected' && !isModelReady) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p>The finance model is not installed.</p>
          <Button size="sm" onClick={onPullModel} className="mt-2">
            <Download className="h-4 w-4 mr-2" />
            Download Model
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Connecting
  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Connecting to Ollama...</span>
      </div>
    );
  }

  // Disconnected or error
  return (
    <Alert variant="destructive" className="m-4">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="space-y-2">
        <p className="font-medium">Cannot connect to Ollama</p>
        {error && <p className="text-xs">{error}</p>}
        <div className="text-xs space-y-1 mt-2">
          <p>To use the AI assistant:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>
              Install Ollama from{' '}
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                ollama.com
              </a>
            </li>
            <li>Start Ollama on your machine</li>
            <li>Click retry below</li>
          </ol>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Connection
        </Button>
      </AlertDescription>
    </Alert>
  );
}

interface StatusIndicatorProps {
  status: AIConnectionStatus;
  isModelReady: boolean;
  className?: string;
}

export function StatusIndicator({
  status,
  isModelReady,
  className,
}: StatusIndicatorProps) {
  const isConnected = status === 'connected' && isModelReady;
  const isConnecting = status === 'connecting';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn(
          'h-2 w-2 rounded-full',
          isConnected && 'bg-emerald-500',
          isConnecting && 'bg-yellow-500 animate-pulse',
          !isConnected && !isConnecting && 'bg-red-500'
        )}
      />
      {isConnecting ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : isConnected ? (
        <Wifi className="h-3 w-3 text-emerald-500" />
      ) : (
        <WifiOff className="h-3 w-3 text-red-500" />
      )}
    </div>
  );
}

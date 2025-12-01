'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  Wand2,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategorization } from '@/hooks/use-categorization';
import { useAIStore } from '@/stores/ai.store';
import { StatusIndicator } from './connection-status';

interface CategorizationStatusCardProps {
  className?: string;
}

export function CategorizationStatusCard({
  className,
}: CategorizationStatusCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'uncategorized' | 'all' | null;
  }>({ open: false, type: null });

  const {
    status,
    transactionCounts,
    isProcessing,
    processQueue,
    retryFailed,
    clearCompleted,
    forceRecategorize,
  } = useCategorization();

  const { connectionStatus, isModelReady, openWidget } = useAIStore();
  const isAIReady = connectionStatus === 'connected' && isModelReady;

  const totalInQueue =
    status.pending + status.processing + status.completed + status.failed;
  const hasItems = totalInQueue > 0;
  const progressPercent =
    totalInQueue > 0
      ? Math.round(((status.completed + status.failed) / totalInQueue) * 100)
      : 0;

  const handleForceRecategorize = (includeAlreadyCategorized: boolean) => {
    setConfirmDialog({
      open: true,
      type: includeAlreadyCategorized ? 'all' : 'uncategorized',
    });
  };

  const confirmForceRecategorize = async () => {
    if (confirmDialog.type) {
      await forceRecategorize(confirmDialog.type === 'all');
    }
    setConfirmDialog({ open: false, type: null });
  };

  // Always show the card so users can see AI status and force recategorization

  return (
    <>
      <Card className={cn('', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base">AI Categorization</CardTitle>
              {isProcessing && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusIndicator
                status={connectionStatus}
                isModelReady={isModelReady}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          {!isCollapsed && (
            <CardDescription>
              {isAIReady
                ? 'AI-powered transaction categorization using local Ollama'
                : 'Connect to Ollama to enable AI categorization'}
            </CardDescription>
          )}
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="space-y-4">
            {/* Connection warning */}
            {!isAIReady && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="flex-1 text-muted-foreground">
                  Ollama not connected
                </span>
                <Button variant="outline" size="sm" onClick={openWidget}>
                  Connect
                </Button>
              </div>
            )}

            {/* Progress bar when processing */}
            {hasItems && (isProcessing || status.processing > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Processing...</span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Status badges */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-semibold text-yellow-600">
                  {status.pending}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-semibold text-blue-600">
                  {status.processing}
                </div>
                <div className="text-xs text-muted-foreground">Processing</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-semibold text-green-600">
                  {status.completed}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-semibold text-red-600">
                  {status.failed}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {/* Transaction counts */}
            <div className="flex items-center justify-between text-sm border-t pt-3">
              <span className="text-muted-foreground">
                Transactions: {transactionCounts.categorized} categorized /{' '}
                {transactionCounts.total} total
              </span>
              {transactionCounts.uncategorized > 0 && (
                <Badge variant="secondary">
                  {transactionCounts.uncategorized} uncategorized
                </Badge>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Process Now */}
              <Button
                variant="outline"
                size="sm"
                onClick={processQueue}
                disabled={!isAIReady || isProcessing || status.pending === 0}
              >
                <Play className="h-4 w-4 mr-1" />
                Process Now
              </Button>

              {/* Retry Failed */}
              {status.failed > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryFailed}
                  disabled={!isAIReady || isProcessing}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry Failed
                </Button>
              )}

              {/* Clear Completed */}
              {status.completed > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompleted}
                  disabled={isProcessing}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Done
                </Button>
              )}

              {/* Force Recategorize Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      !isAIReady ||
                      isProcessing ||
                      transactionCounts.total === 0
                    }
                  >
                    <Wand2 className="h-4 w-4 mr-1" />
                    Recategorize
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleForceRecategorize(false)}
                    disabled={transactionCounts.uncategorized === 0}
                  >
                    <span className="flex-1">Uncategorized only</span>
                    <Badge variant="secondary" className="ml-2">
                      {transactionCounts.uncategorized}
                    </Badge>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleForceRecategorize(true)}
                    disabled={transactionCounts.total === 0}
                  >
                    <span className="flex-1">All transactions</span>
                    <Badge variant="secondary" className="ml-2">
                      {transactionCounts.total}
                    </Badge>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, type: open ? confirmDialog.type : null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'all'
                ? 'Recategorize All Transactions?'
                : 'Categorize Uncategorized Transactions?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'all' ? (
                <>
                  This will queue <strong>all {transactionCounts.total}</strong>{' '}
                  transactions for AI categorization, overwriting any existing
                  categories. This action cannot be undone.
                </>
              ) : (
                <>
                  This will queue{' '}
                  <strong>{transactionCounts.uncategorized}</strong>{' '}
                  uncategorized transactions for AI categorization.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmForceRecategorize}>
              {confirmDialog.type === 'all' ? 'Recategorize All' : 'Categorize'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

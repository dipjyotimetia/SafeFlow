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
  ChevronDown,
  ChevronUp,
  Loader2,
  Wand2,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategorization } from '@/hooks/use-categorization';

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
    transactionCounts,
    isProcessing,
    aiAvailable,
    forceRecategorize,
  } = useCategorization();

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

  return (
    <>
      <Card className={cn('', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-success" />
              <CardTitle className="text-base">AI Categorization</CardTitle>
              {isProcessing && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {aiAvailable ? (
                <Badge variant="secondary" className="text-success text-xs">
                  Online
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-warning text-xs">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
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
          {!isCollapsed && (
            <CardDescription>
              {aiAvailable
                ? 'AI-powered categorization using Ollama'
                : 'Start Ollama to enable AI categorization'}
            </CardDescription>
          )}
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="space-y-4">
            {/* Transaction counts */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 rounded-lg glass border border-border/50 shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative text-2xl font-semibold text-primary">
                  {transactionCounts.total}
                </div>
                <div className="relative text-[11px] uppercase tracking-wider text-muted-foreground font-medium mt-1">Total</div>
              </div>
              <div className="text-center p-4 rounded-lg glass border border-success/20 shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-success/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative text-2xl font-semibold text-success">
                  {transactionCounts.categorized}
                </div>
                <div className="relative text-[11px] uppercase tracking-wider text-muted-foreground font-medium mt-1">Categorized</div>
              </div>
              <div className="text-center p-4 rounded-lg glass border border-warning/20 shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-warning/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative text-2xl font-semibold text-warning">
                  {transactionCounts.uncategorized}
                </div>
                <div className="relative text-[11px] uppercase tracking-wider text-muted-foreground font-medium mt-1">Uncategorized</div>
              </div>
            </div>

            {/* Categorization progress bar */}
            {transactionCounts.total > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Categorization progress</span>
                  <span className="font-medium">
                    {Math.round((transactionCounts.categorized / transactionCounts.total) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success transition-all"
                    style={{
                      width: `${(transactionCounts.categorized / transactionCounts.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {/* Force Recategorize Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessing || transactionCounts.total === 0 || !aiAvailable}
                    title={!aiAvailable ? 'Start Ollama to enable AI categorization' : undefined}
                  >
                    <Wand2 className="h-4 w-4 mr-1" />
                    {isProcessing ? 'Processing...' : 'Categorize with AI'}
                    {!isProcessing && <ChevronDown className="h-3 w-3 ml-1" />}
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
                  This will process <strong>all {transactionCounts.total}</strong>{' '}
                  transactions through auto-categorization, overwriting any existing
                  categories. This action cannot be undone.
                </>
              ) : (
                <>
                  This will process{' '}
                  <strong>{transactionCounts.uncategorized}</strong>{' '}
                  uncategorized transactions through auto-categorization.
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

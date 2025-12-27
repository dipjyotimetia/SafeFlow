'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceChart, getTimeRangeDays, type TimeRange } from './price-chart';
import { TransactionForm } from './transaction-form';
import { TransactionHistory } from './transaction-history';
import { EditHoldingDialog } from './edit-holding-dialog';
import { usePriceHistory } from '@/hooks';
import { formatAUD } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { Holding } from '@/types';
import { TrendingUp, TrendingDown, BarChart3, Building2, Bitcoin, Landmark, Plus, Pencil } from 'lucide-react';

interface HoldingDetailDialogProps {
  holding: Holding | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIME_RANGES: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

const HOLDING_TYPE_ICONS = {
  etf: <BarChart3 className="h-5 w-5" />,
  stock: <Building2 className="h-5 w-5" />,
  crypto: <Bitcoin className="h-5 w-5" />,
  'managed-fund': <Landmark className="h-5 w-5" />,
};

export function HoldingDetailDialog({ holding, open, onOpenChange }: HoldingDetailDialogProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const days = getTimeRangeDays(timeRange);
  const { history, isLoading } = usePriceHistory(holding?.id, days);

  if (!holding) return null;

  const gainLoss = (holding.currentValue || 0) - holding.costBasis;
  const gainLossPercent = holding.costBasis > 0 ? (gainLoss / holding.costBasis) * 100 : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  {HOLDING_TYPE_ICONS[holding.type]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {holding.symbol}
                    <Badge variant="secondary" className="text-xs">
                      {holding.type.toUpperCase()}
                    </Badge>
                  </div>
                  <DialogDescription className="mt-0.5 font-normal">
                    {holding.name}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsTransactionFormOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Transaction
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'transactions')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Price Summary */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Price</p>
                  <p className="text-xl font-semibold">
                    {holding.currentPrice ? formatAUD(holding.currentPrice) : '-'}
                  </p>
                  {holding.change24hPercent !== undefined && (
                    <p
                      className={cn(
                        'text-sm font-medium',
                        holding.change24hPercent >= 0 ? 'text-success' : 'text-destructive'
                      )}
                    >
                      {holding.change24hPercent >= 0 ? '+' : ''}
                      {holding.change24hPercent.toFixed(2)}% (24h)
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <p className="text-xl font-semibold">
                    {holding.currentValue ? formatAUD(holding.currentValue) : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {holding.units.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 8,
                    })}{' '}
                    units
                  </p>
                </div>
              </div>

              {/* Gain/Loss */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Unrealized Gain/Loss</p>
                  <div className="flex items-center gap-2 mt-1">
                    {gainLoss >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-success" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    )}
                    <span
                      className={cn(
                        'text-lg font-semibold',
                        gainLoss >= 0 ? 'text-success' : 'text-destructive'
                      )}
                    >
                      {gainLoss >= 0 ? '+' : ''}
                      {formatAUD(gainLoss)}
                    </span>
                    <span
                      className={cn(
                        'text-sm',
                        gainLoss >= 0 ? 'text-success' : 'text-destructive'
                      )}
                    >
                      ({gainLossPercent >= 0 ? '+' : ''}
                      {gainLossPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Cost Basis</p>
                  <p className="text-lg font-medium">{formatAUD(holding.costBasis)}</p>
                </div>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Price History</p>
                <div className="flex gap-1">
                  {TIME_RANGES.map((range) => (
                    <Button
                      key={range}
                      variant={timeRange === range ? 'secondary' : 'ghost'}
                      size="sm"
                      className="px-3 h-7 text-xs"
                      onClick={() => setTimeRange(range)}
                    >
                      {range}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Price Chart */}
              <div className="h-[200px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <PriceChart data={history} height={200} />
                )}
              </div>

              {/* Last Updated */}
              {holding.lastPriceUpdate && (
                <p className="text-xs text-muted-foreground text-center">
                  Last updated: {new Date(holding.lastPriceUpdate).toLocaleString('en-AU')}
                </p>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="mt-4">
              <TransactionHistory
                holdingId={holding.id}
                holdingSymbol={holding.symbol}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Transaction Form Dialog */}
      <TransactionForm
        holding={holding}
        open={isTransactionFormOpen}
        onOpenChange={setIsTransactionFormOpen}
      />

      {/* Edit Holding Dialog */}
      <EditHoldingDialog
        holding={holding}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </>
  );
}

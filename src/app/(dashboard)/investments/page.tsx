'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  Bitcoin,
  BarChart3,
  Building2,
  Landmark,
  MoreHorizontal,
  Trash2,
  AlertCircle,
  LineChart,
  Pencil,
  Receipt,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useHoldings, usePortfolioSummary, useAccounts, useMultiplePriceHistory } from '@/hooks';
import { useHoldingStore } from '@/stores/holding.store';
import { formatAUD, parseAUD } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { HoldingType, Holding } from '@/types';
import { toast } from 'sonner';
import { PriceSparkline } from '@/components/investments/price-chart';
import { HoldingDetailDialog } from '@/components/investments/holding-detail-dialog';
import { PortfolioAllocation } from '@/components/investments/portfolio-allocation';
import { PortfolioPerformance } from '@/components/investments/portfolio-performance';
import { TopMovers } from '@/components/investments/top-movers';
import { TransactionForm } from '@/components/investments/transaction-form';
import { EditHoldingDialog } from '@/components/investments/edit-holding-dialog';
import { isDateStale, ONE_HOUR_MS } from '@/lib/utils/date';
import { StatCell } from '@/components/ui/stat-cell';

// Check if prices are stale (older than 1 hour)
function isPriceStale(lastUpdate: Date | undefined): boolean {
  return isDateStale(lastUpdate, ONE_HOUR_MS);
}

const HOLDING_TYPES: { value: HoldingType; label: string; icon: React.ReactNode }[] = [
  { value: 'etf', label: 'ETF', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'stock', label: 'Stock', icon: <Building2 className="h-4 w-4" /> },
  { value: 'crypto', label: 'Crypto', icon: <Bitcoin className="h-4 w-4" /> },
  { value: 'managed-fund', label: 'Managed Fund', icon: <Landmark className="h-4 w-4" /> },
];

export default function InvestmentsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [tableDensity, setTableDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const hasAutoRefreshed = useRef(false);
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    name: '',
    type: 'etf' as HoldingType,
    units: '',
    costBasis: '',
    accountId: '',
  });

  const { holdings, isLoading } = useHoldings();
  const { summary } = usePortfolioSummary();
  const { accounts } = useAccounts();
  const {
    createHolding,
    deleteHolding,
    refreshPrices,
    isRefreshingPrices,
    lastPriceRefresh,
  } = useHoldingStore();

  // Get price history for all holdings (for sparklines)
  // Memoize holdingIds to prevent unnecessary re-renders
  const holdingIds = useMemo(() => holdings.map((h) => h.id), [holdings]);
  const { historyMap } = useMultiplePriceHistory(holdingIds, 30);

  const investmentAccounts = accounts.filter((a) => a.type === 'investment');

  // Check if any holding has stale prices
  const hasStaleData = useMemo(
    () => holdings.some((h) => isPriceStale(h.lastPriceUpdate)),
    [holdings]
  );

  // Memoize refreshPrices to prevent effect from re-running
  const doRefresh = useCallback(() => {
    refreshPrices();
  }, [refreshPrices]);

  // Auto-refresh prices on page load if stale or never refreshed
  useEffect(() => {
    if (!hasAutoRefreshed.current && holdings.length > 0 && !isRefreshingPrices) {
      const shouldRefresh = hasStaleData || !lastPriceRefresh;
      if (shouldRefresh) {
        hasAutoRefreshed.current = true;
        doRefresh();
      }
    }
  }, [holdings.length, hasStaleData, lastPriceRefresh, isRefreshingPrices, doRefresh]);

  const handleOpenDetail = (holding: Holding) => {
    setSelectedHolding(holding);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (holding: Holding) => {
    setSelectedHolding(holding);
    setIsEditOpen(true);
  };

  const handleOpenTransactionForm = (holding: Holding) => {
    setSelectedHolding(holding);
    setIsTransactionFormOpen(true);
  };

  const handleAddHolding = async () => {
    if (!newHolding.symbol || !newHolding.accountId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Parse units as float (can be fractional), cost basis using parseAUD for consistency
      const parsedUnits = parseFloat(newHolding.units);
      await createHolding({
        accountId: newHolding.accountId,
        symbol: newHolding.symbol,
        name: newHolding.name || newHolding.symbol,
        type: newHolding.type,
        units: isNaN(parsedUnits) ? 0 : parsedUnits,
        costBasis: parseAUD(newHolding.costBasis) ?? 0,
      });

      toast.success('Holding added');
      setIsAddDialogOpen(false);
      setNewHolding({
        symbol: '',
        name: '',
        type: 'etf',
        units: '',
        costBasis: '',
        accountId: '',
      });

      // Refresh prices for the new holding
      await refreshPrices();
    } catch {
      toast.error('Failed to add holding');
    }
  };

  const handleDeleteHolding = async (holding: Holding) => {
    try {
      await deleteHolding(holding.id);
      toast.success('Holding deleted');
    } catch {
      toast.error('Failed to delete holding');
    }
  };

  const handleRefreshPrices = async () => {
    await refreshPrices();
    toast.success('Prices refreshed');
  };

  const getTypeIcon = (type: HoldingType) => {
    const typeInfo = HOLDING_TYPES.find((t) => t.value === type);
    return typeInfo?.icon || <BarChart3 className="h-4 w-4" />;
  };

  return (
    <>
      <Header title="Investments" />
      <div className="pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="card-trace relative overflow-hidden rounded-md border border-border bg-card animate-enter">
            <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between md:p-8">
              <div>
                <span className="eyebrow">// Investment portfolio</span>
                <h1 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
                  Stocks, ETFs, crypto
                </h1>
                <p className="mt-2 max-w-prose text-[13px] text-muted-foreground">
                  {summary.holdingCount} holding
                  {summary.holdingCount !== 1 ? 's' : ''} ·{' '}
                  {lastPriceRefresh
                    ? `Updated ${lastPriceRefresh.toLocaleTimeString()}`
                    : 'Prices not yet fetched'}
                </p>
              </div>
              <div className="hidden gap-2 sm:flex">
                <Button
                  variant="outline"
                  onClick={handleRefreshPrices}
                  disabled={isRefreshingPrices || holdings.length === 0}
                >
                  {isRefreshingPrices ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  Refresh
                </Button>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Add Holding
                </Button>
              </div>
            </div>
          </section>

          {/* Metric strip */}
          <section className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-md border border-border bg-card sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
            <StatCell
              label="Total Value"
              value={formatAUD(summary.totalValue)}
              sublabel={`${summary.holdingCount} holdings`}
              tone="neutral"
              delay={0.05}
            />
            <StatCell
              label="Cost Basis"
              value={formatAUD(summary.totalCostBasis)}
              sublabel="Amount invested"
              tone="neutral"
              delay={0.1}
            />
            <StatCell
              label="Unrealized P&L"
              value={`${summary.totalGainLoss >= 0 ? '+' : ''}${formatAUD(summary.totalGainLoss)}`}
              sublabel={`${summary.gainLossPercent >= 0 ? '+' : ''}${summary.gainLossPercent.toFixed(2)}% return`}
              tone={summary.totalGainLoss >= 0 ? 'positive' : 'negative'}
              delay={0.15}
            />
          </section>

        <div className="flex gap-2 sm:hidden">
            <Button
              variant="outline"
              onClick={handleRefreshPrices}
              disabled={isRefreshingPrices || holdings.length === 0}
            >
              {isRefreshingPrices ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Prices
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Holding
            </Button>
          </div>

        {/* Portfolio Charts & Top Movers */}
        {holdings.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PortfolioPerformance />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <PortfolioAllocation />
              <TopMovers />
            </div>
          </div>
        )}

        {/* Holdings Quote-board */}
        <Card variant="default" className="card-trace overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="eyebrow">Holdings</span>
              <span className="hairline-v h-3" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                Quote-board
              </span>
              {hasStaleData && !isRefreshingPrices && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-warning">
                        <AlertCircle
                          className="h-3 w-3"
                          strokeWidth={1.5}
                        />
                        Stale
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Some prices are over 1 hour old. Refresh to update.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Select
              value={tableDensity}
              onValueChange={(value) =>
                setTableDensity(value as 'comfortable' | 'compact')
              }
            >
              <SelectTrigger
                className="h-8 w-[130px] rounded-sm border border-border bg-transparent font-mono text-[11px] uppercase tracking-[0.1em] shadow-none"
                aria-label="Select table density"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardContent className="px-0">
            {isLoading ? (
              <div className="py-6">
                <div className="space-y-2">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 p-3"
                    >
                      <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-32 animate-pulse rounded bg-muted/80" />
                      </div>
                      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-16 animate-pulse rounded bg-muted/80" />
                    </div>
                  ))}
                </div>
              </div>
            ) : holdings.length > 0 ? (
              <Table
                containerClassName="max-h-[68vh] overflow-auto"
                className={cn(
                  tableDensity === 'compact' && '[&_td]:py-2 [&_th]:h-9',
                )}
              >
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-center w-[80px]">Trend</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">24h</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Cost Basis</TableHead>
                    <TableHead className="text-right">Gain/Loss</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((holding) => {
                    const gainLoss = (holding.currentValue || 0) - holding.costBasis;
                    const gainLossPercent =
                      holding.costBasis > 0 ? (gainLoss / holding.costBasis) * 100 : 0;

                    const priceHistory = historyMap.get(holding.id) || [];

                    return (
                      <TableRow
                        key={holding.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOpenDetail(holding)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-[--text-subtle]">
                              {getTypeIcon(holding.type)}
                            </span>
                            <div>
                              <p className="font-mono text-[12px] font-medium tracking-wide">
                                {holding.symbol}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {holding.name}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {holding.type.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <PriceSparkline data={priceHistory} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-[12px] tabular-nums">
                          {holding.units.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 8,
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[12px] tabular-nums">
                          {holding.currentPrice
                            ? formatAUD(holding.currentPrice)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {holding.change24hPercent !== undefined ? (
                            <span
                              className={cn(
                                'font-mono text-[12px] tabular-nums font-medium',
                                holding.change24hPercent >= 0
                                  ? 'text-positive'
                                  : 'text-negative',
                              )}
                            >
                              {holding.change24hPercent >= 0 ? '+' : ''}
                              {holding.change24hPercent.toFixed(2)}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[13px] tabular-nums font-medium">
                          {holding.currentValue
                            ? formatAUD(holding.currentValue)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[12px] tabular-nums text-[--text-subtle]">
                          {formatAUD(holding.costBasis)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className={cn(
                              'flex items-center justify-end gap-1 font-mono text-[12px] tabular-nums font-medium',
                              gainLoss >= 0 ? 'text-positive' : 'text-negative',
                            )}
                          >
                            {gainLoss >= 0 ? (
                              <TrendingUp
                                className="h-3 w-3"
                                strokeWidth={1.5}
                              />
                            ) : (
                              <TrendingDown
                                className="h-3 w-3"
                                strokeWidth={1.5}
                              />
                            )}
                            <span>{formatAUD(Math.abs(gainLoss))}</span>
                            <span className="text-[10px] text-[--text-subtle]">
                              ({gainLossPercent.toFixed(1)}%)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Open actions for ${holding.symbol}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDetail(holding)}>
                                <LineChart className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenTransactionForm(holding)}>
                                <Receipt className="h-4 w-4 mr-2" />
                                Record Transaction
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(holding)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Holding
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleDeleteHolding(holding)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[2px] border border-border bg-muted/40">
                  <TrendingUp
                    className="h-5 w-5 text-[--text-subtle]"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="font-display text-lg tracking-tight">
                  No holdings yet
                </p>
                <p className="mx-auto mt-2 max-w-xs text-[13px] text-muted-foreground">
                  Add your first investment to get started.
                </p>
                <Button
                  className="mt-5"
                  size="sm"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                  Add Holding
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Add Holding Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Holding</DialogTitle>
            <DialogDescription>
              Add a new investment to your portfolio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account *</label>
              <Select
                value={newHolding.accountId}
                onValueChange={(value) =>
                  setNewHolding({ ...newHolding, accountId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {investmentAccounts.length > 0 ? (
                    investmentAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No investment accounts - create one first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Symbol *</label>
                <Input
                  placeholder="e.g., VAS, BTC"
                  value={newHolding.symbol}
                  onChange={(e) =>
                    setNewHolding({ ...newHolding, symbol: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type *</label>
                <Select
                  value={newHolding.type}
                  onValueChange={(value: HoldingType) =>
                    setNewHolding({ ...newHolding, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOLDING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {type.icon}
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Vanguard Australian Shares"
                value={newHolding.name}
                onChange={(e) => setNewHolding({ ...newHolding, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Units</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={newHolding.units}
                  onChange={(e) => setNewHolding({ ...newHolding, units: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cost Basis ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newHolding.costBasis}
                  onChange={(e) => setNewHolding({ ...newHolding, costBasis: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddHolding}>Add Holding</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holding Detail Dialog */}
      <HoldingDetailDialog
        holding={selectedHolding}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />

      {/* Edit Holding Dialog */}
      {selectedHolding && (
        <EditHoldingDialog
          holding={selectedHolding}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      {/* Transaction Form Dialog */}
      {selectedHolding && (
        <TransactionForm
          holding={selectedHolding}
          open={isTransactionFormOpen}
          onOpenChange={setIsTransactionFormOpen}
        />
      )}
    </>
  );
}

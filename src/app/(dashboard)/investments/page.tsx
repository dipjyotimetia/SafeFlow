'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { isDateStale, ONE_HOUR_MS } from '@/lib/utils/date';

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
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Investment Portfolio</h2>
            <p className="text-sm text-muted-foreground">
              Track your stocks, ETFs, and crypto
            </p>
          </div>
          <div className="flex gap-2">
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
        </div>

        {/* Portfolio Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAUD(summary.totalValue)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.holdingCount} holding{summary.holdingCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Cost Basis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAUD(summary.totalCostBasis)}</div>
              <p className="text-xs text-muted-foreground">Amount invested</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unrealized Gain/Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'text-2xl font-bold',
                  summary.totalGainLoss >= 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {summary.totalGainLoss >= 0 ? '+' : ''}
                {formatAUD(summary.totalGainLoss)}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className={summary.gainLossPercent >= 0 ? 'text-success' : 'text-destructive'}>
                  {summary.gainLossPercent >= 0 ? '+' : ''}
                  {summary.gainLossPercent.toFixed(2)}%
                </span>{' '}
                return
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Charts & Top Movers */}
        {holdings.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PortfolioPerformance />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <PortfolioAllocation />
              <TopMovers />
            </div>
          </div>
        )}

        {/* Holdings Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Holdings</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  Your investment positions
                  {lastPriceRefresh && (
                    <span className="text-xs">
                      (Last updated: {lastPriceRefresh.toLocaleTimeString()})
                    </span>
                  )}
                  {hasStaleData && !isRefreshingPrices && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            Stale
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Some prices are over 1 hour old. Refresh to update.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              </div>
            ) : holdings.length > 0 ? (
              <Table>
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
                            {getTypeIcon(holding.type)}
                            <div>
                              <p className="font-medium">{holding.symbol}</p>
                              <p className="text-xs text-muted-foreground">{holding.name}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {holding.type.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <PriceSparkline data={priceHistory} />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {holding.units.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 8,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {holding.currentPrice ? formatAUD(holding.currentPrice) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {holding.change24hPercent !== undefined ? (
                            <span
                              className={cn(
                                'text-sm font-medium',
                                holding.change24hPercent >= 0 ? 'text-success' : 'text-destructive'
                              )}
                            >
                              {holding.change24hPercent >= 0 ? '+' : ''}
                              {holding.change24hPercent.toFixed(2)}%
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {holding.currentValue ? formatAUD(holding.currentValue) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAUD(holding.costBasis)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className={cn(
                              'flex items-center justify-end gap-1',
                              gainLoss >= 0 ? 'text-success' : 'text-destructive'
                            )}
                          >
                            {gainLoss >= 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span>{formatAUD(Math.abs(gainLoss))}</span>
                            <span className="text-xs">({gainLossPercent.toFixed(1)}%)</span>
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDetail(holding)}>
                                <LineChart className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
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
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                <p>No holdings yet</p>
                <p className="text-sm mt-1">Add your first investment to get started</p>
                <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Holding
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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
    </>
  );
}

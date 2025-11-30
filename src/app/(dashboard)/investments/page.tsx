'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useHoldings, usePortfolioSummary, useAccounts } from '@/hooks';
import { useHoldingStore } from '@/stores/holding.store';
import { formatAUD } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { HoldingType, Holding } from '@/types';
import { toast } from 'sonner';

const HOLDING_TYPES: { value: HoldingType; label: string; icon: React.ReactNode }[] = [
  { value: 'etf', label: 'ETF', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'stock', label: 'Stock', icon: <Building2 className="h-4 w-4" /> },
  { value: 'crypto', label: 'Crypto', icon: <Bitcoin className="h-4 w-4" /> },
  { value: 'managed-fund', label: 'Managed Fund', icon: <Landmark className="h-4 w-4" /> },
];

export default function InvestmentsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  const investmentAccounts = accounts.filter((a) => a.type === 'investment');

  const handleAddHolding = async () => {
    if (!newHolding.symbol || !newHolding.accountId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createHolding({
        accountId: newHolding.accountId,
        symbol: newHolding.symbol,
        name: newHolding.name || newHolding.symbol,
        type: newHolding.type,
        units: parseFloat(newHolding.units) || 0,
        costBasis: Math.round((parseFloat(newHolding.costBasis) || 0) * 100),
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
                  summary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {summary.totalGainLoss >= 0 ? '+' : ''}
                {formatAUD(summary.totalGainLoss)}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className={summary.gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {summary.gainLossPercent >= 0 ? '+' : ''}
                  {summary.gainLossPercent.toFixed(2)}%
                </span>{' '}
                return
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Holdings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>
              Your investment positions
              {lastPriceRefresh && (
                <span className="ml-2 text-xs">
                  (Last updated: {lastPriceRefresh.toLocaleTimeString()})
                </span>
              )}
            </CardDescription>
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
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Price</TableHead>
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

                    return (
                      <TableRow key={holding.id}>
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
                        <TableCell className="text-right font-mono">
                          {holding.units.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 8,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {holding.currentPrice ? formatAUD(holding.currentPrice) : '-'}
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
                              gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
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
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-red-600"
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
    </>
  );
}

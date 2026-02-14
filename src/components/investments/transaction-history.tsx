'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInvestmentTransactions } from '@/hooks';
import { useHoldingStore } from '@/stores/holding.store';
import { formatAUD } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { InvestmentTransaction, InvestmentTransactionType } from '@/types';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Banknote,
  Percent,
  Receipt,
  Loader2,
} from 'lucide-react';

interface TransactionHistoryProps {
  holdingId: string;
  holdingSymbol: string;
}

const TRANSACTION_TYPE_CONFIG: Record<
  InvestmentTransactionType,
  { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  buy: { label: 'Buy', icon: <TrendingUp className="h-3 w-3" />, variant: 'default' },
  sell: { label: 'Sell', icon: <TrendingDown className="h-3 w-3" />, variant: 'destructive' },
  dividend: { label: 'Dividend', icon: <DollarSign className="h-3 w-3" />, variant: 'secondary' },
  distribution: { label: 'Distribution', icon: <Banknote className="h-3 w-3" />, variant: 'secondary' },
  fee: { label: 'Fee', icon: <Percent className="h-3 w-3" />, variant: 'outline' },
};

export function TransactionHistory({ holdingId, holdingSymbol: _holdingSymbol }: TransactionHistoryProps) {
  const { transactions, isLoading } = useInvestmentTransactions(holdingId);
  const { deleteTransaction } = useHoldingStore();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterType, setFilterType] = useState<InvestmentTransactionType | 'all'>('all');

  const filteredTransactions = filterType === 'all'
    ? transactions
    : transactions.filter((t) => t.type === filterType);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await deleteTransaction(deleteId);
      toast.success('Transaction deleted');
      setDeleteId(null);
    } catch {
      toast.error('Failed to delete transaction');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No transactions recorded</p>
        <p className="text-xs mt-1">Use the Record Transaction button to add your first transaction</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
        </p>
        <Select
          value={filterType}
          onValueChange={(value) => setFilterType(value as InvestmentTransactionType | 'all')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TRANSACTION_TYPE_CONFIG).map(([type, config]) => (
              <SelectItem key={type} value={type}>
                <div className="flex items-center gap-2">
                  {config.icon}
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Fees</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => {
              const typeConfig = TRANSACTION_TYPE_CONFIG[transaction.type];
              const hasFrankingCredit = transaction.frankingCreditAmount && transaction.frankingCreditAmount > 0;
              const hasCapitalGain = transaction.type === 'sell' && transaction.capitalGain !== undefined;
              const isCapitalLoss = hasCapitalGain && transaction.capitalGain! < 0;

              return (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant={typeConfig.variant} className="gap-1">
                            {typeConfig.icon}
                            {typeConfig.label}
                            {hasFrankingCredit && (
                              <span className="ml-1 text-[10px] opacity-75">F</span>
                            )}
                            {hasCapitalGain && (
                              <span className={cn(
                                "ml-1 text-[10px] opacity-75",
                                isCapitalLoss ? "text-destructive" : "text-success"
                              )}>
                                {isCapitalLoss ? 'L' : 'G'}
                              </span>
                            )}
                          </Badge>
                        </TooltipTrigger>
                        {(hasFrankingCredit || hasCapitalGain) && (
                          <TooltipContent>
                            {hasFrankingCredit && (
                              <>
                                <p>Franking: {transaction.frankingPercentage}%</p>
                                <p>Credit: {formatAUD(transaction.frankingCreditAmount!)}</p>
                                {transaction.grossedUpAmount && (
                                  <p>Grossed up: {formatAUD(transaction.grossedUpAmount)}</p>
                                )}
                              </>
                            )}
                            {hasCapitalGain && (
                              <>
                                <p className={isCapitalLoss ? "text-destructive" : "text-success"}>
                                  {isCapitalLoss ? 'Capital Loss: ' : 'Capital Gain: '}
                                  {formatAUD(Math.abs(transaction.capitalGain!))}
                                </p>
                                {transaction.holdingPeriod !== undefined && (
                                  <p className="text-muted-foreground text-xs">
                                    Held: {transaction.holdingPeriod} days
                                    {transaction.holdingPeriod >= 365 && ' (50% discount applied)'}
                                  </p>
                                )}
                              </>
                            )}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {transaction.type === 'buy' || transaction.type === 'sell'
                      ? transaction.units.toLocaleString(undefined, { maximumFractionDigits: 8 })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatAUD(transaction.pricePerUnit)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {transaction.fees ? formatAUD(transaction.fees) : '-'}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-medium',
                      transaction.type === 'buy' && 'text-destructive',
                      transaction.type === 'sell' && 'text-success',
                      (transaction.type === 'dividend' || transaction.type === 'distribution') && 'text-primary'
                    )}
                  >
                    {transaction.type === 'buy' ? '-' : ''}
                    {transaction.type === 'sell' || transaction.type === 'dividend' || transaction.type === 'distribution' ? '+' : ''}
                    {formatAUD(transaction.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(transaction.id)}
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
      </div>

      {/* Summary Stats */}
      <TransactionSummary transactions={filteredTransactions} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This will reverse the effect on your holding&apos;s units and cost basis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Summary component showing aggregated stats
function TransactionSummary({ transactions }: { transactions: InvestmentTransaction[] }) {
  const stats = transactions.reduce(
    (acc, t) => {
      switch (t.type) {
        case 'buy':
          acc.totalBought += t.totalAmount;
          acc.unitsBought += t.units;
          break;
        case 'sell':
          acc.totalSold += t.totalAmount;
          acc.unitsSold += t.units;
          // Track capital gains/losses
          if (t.capitalGain !== undefined) {
            if (t.capitalGain >= 0) {
              acc.totalCapitalGains += t.capitalGain;
            } else {
              acc.totalCapitalLosses += Math.abs(t.capitalGain);
            }
          }
          break;
        case 'dividend':
        case 'distribution':
          acc.totalDividends += t.totalAmount;
          acc.totalFrankingCredits += t.frankingCreditAmount || 0;
          break;
        case 'fee':
          acc.totalFees += t.totalAmount;
          break;
      }
      return acc;
    },
    {
      totalBought: 0,
      totalSold: 0,
      totalDividends: 0,
      totalFrankingCredits: 0,
      totalFees: 0,
      unitsBought: 0,
      unitsSold: 0,
      totalCapitalGains: 0,
      totalCapitalLosses: 0,
    }
  );

  if (transactions.length === 0) return null;

  const netCapitalGain = stats.totalCapitalGains - stats.totalCapitalLosses;
  const hasCapitalActivity = stats.totalCapitalGains > 0 || stats.totalCapitalLosses > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
      <div>
        <p className="text-xs text-muted-foreground">Total Bought</p>
        <p className="text-sm font-medium">{formatAUD(stats.totalBought)}</p>
        <p className="text-xs text-muted-foreground">{stats.unitsBought.toLocaleString()} units</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Total Sold</p>
        <p className="text-sm font-medium">{formatAUD(stats.totalSold)}</p>
        <p className="text-xs text-muted-foreground">{stats.unitsSold.toLocaleString()} units</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Dividends Received</p>
        <p className="text-sm font-medium text-primary">{formatAUD(stats.totalDividends)}</p>
        {stats.totalFrankingCredits > 0 && (
          <p className="text-xs text-muted-foreground">
            +{formatAUD(stats.totalFrankingCredits)} franking
          </p>
        )}
      </div>
      {hasCapitalActivity && (
        <div>
          <p className="text-xs text-muted-foreground">Net Capital Gain</p>
          <p className={cn(
            "text-sm font-medium",
            netCapitalGain >= 0 ? "text-success" : "text-destructive"
          )}>
            {netCapitalGain >= 0 ? '+' : ''}{formatAUD(netCapitalGain)}
          </p>
          <p className="text-xs text-muted-foreground">
            After 50% discount
          </p>
        </div>
      )}
      <div>
        <p className="text-xs text-muted-foreground">Total Fees</p>
        <p className="text-sm font-medium text-muted-foreground">{formatAUD(stats.totalFees)}</p>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton, SkeletonTransaction } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  PiggyBank,
} from 'lucide-react';
import { CashflowChart, CategoryPieChart } from '@/components/charts';
import {
  useAccountsSummary,
  useMonthlyTotals,
  useCashflow,
  useCategoryBreakdown,
  useRecentTransactions,
  useCategories,
  useAccounts,
} from '@/hooks';
import { formatAUD } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS = [
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '1 year' },
  { value: '24', label: '2 years' },
  { value: '36', label: '3 years' },
];

export default function DashboardPage() {
  const [cashflowMonths, setCashflowMonths] = useState(6);
  const [categoryMonths, setCategoryMonths] = useState(3);

  const { summary } = useAccountsSummary();
  const { totals } = useMonthlyTotals();
  const { cashflow, isLoading: cashflowLoading } = useCashflow(cashflowMonths);
  const { breakdown, isLoading: breakdownLoading } = useCategoryBreakdown('expense', categoryMonths);
  const { transactions: recentTransactions, isLoading: transactionsLoading } = useRecentTransactions(5);
  const { categories } = useCategories();
  const { accounts } = useAccounts();

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Net Worth"
            value={formatAUD(summary.netWorth)}
            description={`${summary.accountCount} account${summary.accountCount !== 1 ? 's' : ''}`}
            icon={Wallet}
            variant={summary.netWorth >= 0 ? 'positive' : 'negative'}
            className="animate-enter stagger-1"
          />

          <MetricCard
            title="Monthly Income"
            value={formatAUD(totals.income)}
            description="This month"
            icon={TrendingUp}
            trend="up"
            variant="positive"
            className="animate-enter stagger-2"
          />

          <MetricCard
            title="Monthly Expenses"
            value={formatAUD(totals.expenses)}
            description="This month"
            icon={TrendingDown}
            trend="down"
            variant="negative"
            className="animate-enter stagger-3"
          />

          <MetricCard
            title="Net Cashflow"
            value={`${totals.net >= 0 ? '+' : ''}${formatAUD(totals.net)}`}
            description="This month"
            icon={PiggyBank}
            trend={totals.net >= 0 ? 'up' : 'down'}
            variant={totals.net >= 0 ? 'positive' : 'negative'}
            className="animate-enter stagger-4"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="luxury" className="animate-enter stagger-5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Monthly Cashflow</CardTitle>
                <CardDescription>Income vs expenses over time</CardDescription>
              </div>
              <Select
                value={String(cashflowMonths)}
                onValueChange={(v) => setCashflowMonths(Number(v))}
              >
                <SelectTrigger className="w-[110px] h-9 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-[300px]">
              {cashflowLoading ? (
                <div className="h-full w-full space-y-3">
                  <Skeleton className="h-full w-full rounded-lg" variant="premium" />
                </div>
              ) : cashflow.length > 0 ? (
                <CashflowChart data={cashflow} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="p-4 rounded-full bg-muted/50 mb-4">
                    <ArrowRightLeft className="h-10 w-10 opacity-30" />
                  </div>
                  <p className="font-semibold">No cashflow data yet</p>
                  <p className="text-sm mt-1 text-muted-foreground/70">Import transactions to see your cashflow</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="luxury" className="animate-enter stagger-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Spending by Category</CardTitle>
                <CardDescription>Where your money goes</CardDescription>
              </div>
              <Select
                value={String(categoryMonths)}
                onValueChange={(v) => setCategoryMonths(Number(v))}
              >
                <SelectTrigger className="w-[110px] h-9 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-[300px]">
              {breakdownLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-40 w-40 rounded-full" variant="premium" />
                </div>
              ) : breakdown.length > 0 ? (
                <CategoryPieChart data={breakdown} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="p-4 rounded-full bg-muted/50 mb-4">
                    <PiggyBank className="h-10 w-10 opacity-30" />
                  </div>
                  <p className="font-semibold">No spending data yet</p>
                  <p className="text-sm mt-1 text-muted-foreground/70">Add expenses to see category breakdown</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card variant="luxury" className="animate-enter stagger-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activity</CardDescription>
            </div>
            <Link href="/transactions">
              <Button variant="outline" size="sm" className="hover:bg-primary/5 shadow-sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-1">
                {[...Array(5)].map((_, i) => (
                  <SkeletonTransaction key={i} />
                ))}
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="space-y-1">
                {recentTransactions.map((transaction, index) => {
                  const category = transaction.categoryId
                    ? categoryMap.get(transaction.categoryId)
                    : null;
                  const account = accountMap.get(transaction.accountId);

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between py-3 px-3 -mx-3 rounded-xl transition-all duration-200 hover:bg-accent/50 group cursor-pointer"
                      style={{ animationDelay: `${0.4 + index * 0.05}s` }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105',
                            transaction.type === 'income' && 'bg-success/10',
                            transaction.type === 'expense' && 'bg-destructive/10',
                            transaction.type === 'transfer' && 'bg-primary/10'
                          )}
                        >
                          {transaction.type === 'income' ? (
                            <ArrowUpCircle className="h-5 w-5 text-success" />
                          ) : transaction.type === 'expense' ? (
                            <ArrowDownCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <ArrowRightLeft className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm group-hover:text-foreground transition-colors">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.date), 'dd MMM')} • {account?.name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            'font-semibold tabular-nums font-display text-base',
                            transaction.type === 'income' && 'text-success',
                            transaction.type === 'expense' && 'text-destructive'
                          )}
                        >
                          {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                          {formatAUD(transaction.amount)}
                        </p>
                        {category && (
                          <Badge variant="secondary" className="text-xs mt-1.5 shadow-sm">
                            {category.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <div className="p-5 rounded-2xl bg-muted/30 w-fit mx-auto mb-5">
                  <ArrowRightLeft className="h-10 w-10 opacity-30" />
                </div>
                <p className="font-semibold text-foreground">No transactions yet</p>
                <p className="text-sm mt-2 mb-6 text-muted-foreground/70 max-w-xs mx-auto">
                  Import a bank statement or add a transaction to get started
                </p>
                <div className="flex justify-center gap-3">
                  <Link href="/import">
                    <Button variant="outline" size="sm" className="shadow-sm">
                      Import Statement
                    </Button>
                  </Link>
                  <Link href="/transactions">
                    <Button size="sm" variant="premium">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Transaction
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

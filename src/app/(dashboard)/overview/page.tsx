'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'text-2xl font-bold',
                  summary.netWorth >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {formatAUD(summary.netWorth)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.accountCount} account{summary.accountCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatAUD(totals.income)}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatAUD(totals.expenses)}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Cashflow</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'text-2xl font-bold',
                  totals.net >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {totals.net >= 0 ? '+' : ''}
                {formatAUD(totals.net)}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle>Monthly Cashflow</CardTitle>
                <CardDescription>Income vs expenses over time</CardDescription>
              </div>
              <Select
                value={String(cashflowMonths)}
                onValueChange={(v) => setCashflowMonths(Number(v))}
              >
                <SelectTrigger className="w-[110px]">
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
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : cashflow.length > 0 ? (
                <CashflowChart data={cashflow} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No cashflow data yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Where your money goes</CardDescription>
              </div>
              <Select
                value={String(categoryMonths)}
                onValueChange={(v) => setCategoryMonths(Number(v))}
              >
                <SelectTrigger className="w-[110px]">
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
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : breakdown.length > 0 ? (
                <CategoryPieChart data={breakdown} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No spending data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activity</CardDescription>
            </div>
            <Link href="/transactions">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => {
                  const category = transaction.categoryId
                    ? categoryMap.get(transaction.categoryId)
                    : null;
                  const account = accountMap.get(transaction.accountId);

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        {transaction.type === 'income' ? (
                          <ArrowUpCircle className="h-5 w-5 text-green-600" />
                        ) : transaction.type === 'expense' ? (
                          <ArrowDownCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.date), 'dd MMM')} • {account?.name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            'font-medium',
                            transaction.type === 'income' ? 'text-green-600' : '',
                            transaction.type === 'expense' ? 'text-red-600' : ''
                          )}
                        >
                          {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                          {formatAUD(transaction.amount)}
                        </p>
                        {category && (
                          <Badge variant="secondary" className="text-xs">
                            {category.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No transactions yet</p>
                <p className="text-sm mt-1">
                  Import a bank statement or add a transaction to get started
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Link href="/import">
                    <Button variant="outline" size="sm">
                      Import Statement
                    </Button>
                  </Link>
                  <Link href="/transactions">
                    <Button size="sm">
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

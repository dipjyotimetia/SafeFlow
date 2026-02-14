"use client";

import { useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonTransaction } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  PiggyBank,
  Sparkles,
} from "lucide-react";
import { CashflowChart, CategoryPieChart } from "@/components/charts";
import {
  useAccountsSummary,
  useMonthlyTotals,
  useCashflow,
  useCategoryBreakdown,
  useRecentTransactions,
  useCategories,
  useAccounts,
} from "@/hooks";
import { formatAUD } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "1 year" },
  { value: "24", label: "2 years" },
  { value: "36", label: "3 years" },
];

export default function DashboardPage() {
  const [cashflowMonths, setCashflowMonths] = useState(6);
  const [categoryMonths, setCategoryMonths] = useState(3);

  const { summary } = useAccountsSummary();
  const { totals } = useMonthlyTotals();
  const { cashflow, isLoading: cashflowLoading } = useCashflow(cashflowMonths);
  const { breakdown, isLoading: breakdownLoading } = useCategoryBreakdown(
    "expense",
    categoryMonths,
  );
  const { transactions: recentTransactions, isLoading: transactionsLoading } =
    useRecentTransactions(5);
  const { categories } = useCategories();
  const { accounts } = useAccounts();

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  return (
    <>
      <Header title="Dashboard" />

      <div className="pb-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pt-6 sm:px-6 lg:px-8">
          <Card
            variant="glass-luxury"
            className="animate-enter relative overflow-hidden border-primary/15"
          >
            <div className="pointer-events-none absolute -right-20 top-[-4.5rem] h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 bottom-[-5.5rem] h-52 w-52 rounded-full bg-accent/35 blur-3xl" />

            <CardHeader className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardDescription className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Monthly Snapshot
                </CardDescription>
                <CardTitle className="text-2xl font-semibold sm:text-3xl">
                  Welcome back
                </CardTitle>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  {format(new Date(), "MMMM yyyy")} overview of income,
                  expenses, and portfolio movement.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/import">
                  <Button variant="outline" className="h-9">
                    Import Statement
                  </Button>
                </Link>
                <Link href="/transactions">
                  <Button variant="premium" className="h-9">
                    <Plus className="mr-1 h-4 w-4" />
                    Add Transaction
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </Card>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Net Worth"
              value={formatAUD(summary.netWorth)}
              description={`${summary.accountCount} account${summary.accountCount !== 1 ? "s" : ""}`}
              icon={Wallet}
              variant={summary.netWorth >= 0 ? "positive" : "negative"}
              className="animate-enter stagger-1"
            />

            <MetricCard
              title="Monthly Income"
              value={formatAUD(totals.income)}
              description="This month"
              icon={TrendingUp}
              trend="up"
              variant="default"
              className="animate-enter stagger-2"
            />

            <MetricCard
              title="Monthly Expenses"
              value={formatAUD(totals.expenses)}
              description="This month"
              icon={TrendingDown}
              trend="down"
              variant="default"
              className="animate-enter stagger-3"
            />

            <MetricCard
              title="Net Cashflow"
              value={`${totals.net >= 0 ? "+" : ""}${formatAUD(totals.net)}`}
              description="This month"
              icon={PiggyBank}
              trend={totals.net >= 0 ? "up" : "down"}
              variant={totals.net >= 0 ? "positive" : "negative"}
              className="animate-enter stagger-4"
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card variant="premium" className="animate-enter stagger-5">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-1">
                <div>
                  <CardTitle className="text-base">Monthly Cashflow</CardTitle>
                  <CardDescription>
                    Income vs expenses trend over time.
                  </CardDescription>
                </div>
                <Select
                  value={String(cashflowMonths)}
                  onValueChange={(v) => setCashflowMonths(Number(v))}
                >
                  <SelectTrigger className="h-9 w-[116px] border-border/70 bg-card/70">
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
                  <Skeleton className="h-full w-full rounded-xl" variant="premium" />
                ) : cashflow.length > 0 ? (
                  <CashflowChart data={cashflow} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                    <div className="mb-4 rounded-2xl bg-muted/70 p-4">
                      <ArrowRightLeft className="h-9 w-9 opacity-45" />
                    </div>
                    <p className="font-semibold text-foreground">No cashflow data yet</p>
                    <p className="mt-1 text-sm">
                      Import transactions to unlock trend insights.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card variant="premium" className="animate-enter stagger-6">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-1">
                <div>
                  <CardTitle className="text-base">Spending by Category</CardTitle>
                  <CardDescription>Where your money goes most.</CardDescription>
                </div>
                <Select
                  value={String(categoryMonths)}
                  onValueChange={(v) => setCategoryMonths(Number(v))}
                >
                  <SelectTrigger className="h-9 w-[116px] border-border/70 bg-card/70">
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
                  <div className="flex h-full items-center justify-center">
                    <Skeleton className="h-44 w-44 rounded-full" variant="premium" />
                  </div>
                ) : breakdown.length > 0 ? (
                  <CategoryPieChart data={breakdown} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                    <div className="mb-4 rounded-2xl bg-muted/70 p-4">
                      <PiggyBank className="h-9 w-9 opacity-45" />
                    </div>
                    <p className="font-semibold text-foreground">No category data yet</p>
                    <p className="mt-1 text-sm">Add expenses to view breakdown.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Card variant="premium" className="animate-enter stagger-7">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <CardDescription>Latest activity across all accounts.</CardDescription>
              </div>
              <Link href="/transactions">
                <Button variant="outline" size="sm" className="h-8">
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
                        className="group -mx-3 flex items-center justify-between rounded-xl px-3 py-3 transition-all duration-200 hover:bg-accent/30"
                        style={{ animationDelay: `${0.35 + index * 0.05}s` }}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                              transaction.type === "income" && "bg-success/15",
                              transaction.type === "expense" && "bg-destructive/15",
                              transaction.type === "transfer" && "bg-primary/15",
                            )}
                          >
                            {transaction.type === "income" ? (
                              <ArrowUpCircle className="h-5 w-5 text-success" />
                            ) : transaction.type === "expense" ? (
                              <ArrowDownCircle className="h-5 w-5 text-destructive" />
                            ) : (
                              <ArrowRightLeft className="h-5 w-5 text-primary" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {transaction.description}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {format(new Date(transaction.date), "dd MMM")} •{" "}
                              {account?.name || "Unknown account"}
                            </p>
                          </div>
                        </div>

                        <div className="ml-3 text-right">
                          <p
                            className={cn(
                              "metric-value text-base font-semibold tabular-nums",
                              transaction.type === "income" && "text-success",
                              transaction.type === "expense" && "text-destructive",
                            )}
                          >
                            {transaction.type === "income"
                              ? "+"
                              : transaction.type === "expense"
                                ? "-"
                                : ""}
                            {formatAUD(transaction.amount)}
                          </p>
                          {category && (
                            <Badge variant="secondary" className="mt-1 text-[11px]">
                              {category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  <div className="mx-auto mb-4 w-fit rounded-2xl bg-muted/70 p-4">
                    <ArrowRightLeft className="h-9 w-9 opacity-40" />
                  </div>
                  <p className="font-semibold text-foreground">No transactions yet</p>
                  <p className="mx-auto mt-2 max-w-xs text-sm">
                    Import a statement or add your first transaction to get started.
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <Link href="/import">
                      <Button variant="outline" size="sm">
                        Import Statement
                      </Button>
                    </Link>
                    <Link href="/transactions">
                      <Button size="sm">
                        <Plus className="mr-1 h-4 w-4" />
                        Add Transaction
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

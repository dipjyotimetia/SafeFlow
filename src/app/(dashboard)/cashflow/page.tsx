"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowUpCircle,
  ArrowDownCircle,
  PiggyBank,
  Activity,
  BarChart3,
  CalendarDays,
  Repeat,
  Sparkles,
  Minus,
} from "lucide-react";
import { CashflowChart } from "@/components/charts";
import { useCashflowAnalysis } from "@/hooks/use-cashflow-analysis";
import { formatAUD } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { useFamilyStore } from "@/stores/family.store";

const PERIOD_OPTIONS = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "1 year" },
  { value: "24", label: "2 years" },
  { value: "36", label: "3 years" },
];

function getTrendIcon(direction: string) {
  if (direction === "improving") return TrendingUp;
  if (direction === "declining") return TrendingDown;
  return Minus;
}

function getTrendLabel(direction: string) {
  if (direction === "improving") return "Improving";
  if (direction === "declining") return "Declining";
  return "Stable";
}

function getTrendColor(direction: string) {
  if (direction === "improving") return "text-success";
  if (direction === "declining") return "text-destructive";
  return "text-muted-foreground";
}

function getFrequencyLabel(frequency: string) {
  const labels: Record<string, string> = {
    weekly: "Weekly",
    fortnightly: "Fortnightly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    annual: "Annual",
  };
  return labels[frequency] || frequency;
}

export default function CashflowPage() {
  const [months, setMonths] = useState(12);
  const { selectedMemberId } = useFamilyStore();
  const memberId = selectedMemberId ?? undefined;

  const {
    monthlyEntries,
    trend,
    forecast,
    expenseBreakdown,
    recurring,
    isLoading,
  } = useCashflowAnalysis(months, memberId);

  // Format chart data from monthly entries — CashflowChart expects a `year` property
  const chartData = monthlyEntries.map((entry) => {
    const [year] = entry.month.split("-");
    return {
      month: entry.label.split(" ")[0], // e.g. "Jan"
      year: parseInt(year, 10),
      income: entry.income,
      expenses: entry.expenses,
      net: entry.net,
    };
  });

  const currentMonth = monthlyEntries[monthlyEntries.length - 1];
  const TrendIcon = getTrendIcon(trend.direction);

  return (
    <>
      <Header title="Cash Flow" />

      <div className="pb-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pt-6 sm:px-6 lg:px-8">
          {/* Hero Banner */}
          <Card
            variant="glass-luxury"
            className="animate-enter relative overflow-hidden border-primary/15"
          >
            <div className="pointer-events-none absolute -right-20 top-[-4.5rem] h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 bottom-[-5.5rem] h-52 w-52 rounded-full bg-accent/35 blur-3xl" />

            <CardHeader className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardDescription className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  <Activity className="h-3.5 w-3.5" />
                  Cash Flow Analysis
                </CardDescription>
                <CardTitle className="text-2xl font-semibold sm:text-3xl">
                  Money In &amp; Out
                </CardTitle>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  Track the flow of your finances across all accounts, rentals,
                  and investments.
                </p>
              </div>
              <Select
                value={String(months)}
                onValueChange={(v) => setMonths(Number(v))}
              >
                <SelectTrigger className="h-9 w-[130px] border-border/70 bg-card/70">
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
          </Card>

          {/* Metric Cards */}
          {isLoading ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[110px] rounded-2xl"
                  variant="premium"
                />
              ))}
            </section>
          ) : (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Avg Monthly Income"
                value={formatAUD(trend.averageIncome)}
                description={`${monthlyEntries.length} months`}
                icon={ArrowUpCircle}
                variant="default"
                className="animate-enter stagger-1"
              />

              <MetricCard
                title="Avg Monthly Expenses"
                value={formatAUD(trend.averageExpenses)}
                description={`${monthlyEntries.length} months`}
                icon={ArrowDownCircle}
                variant="default"
                className="animate-enter stagger-2"
              />

              <MetricCard
                title="Avg Net Cashflow"
                value={`${trend.averageNetCashflow >= 0 ? "+" : ""}${formatAUD(trend.averageNetCashflow)}`}
                trendValue={getTrendLabel(trend.direction)}
                icon={PiggyBank}
                trend={
                  trend.direction === "improving"
                    ? "up"
                    : trend.direction === "declining"
                      ? "down"
                      : "neutral"
                }
                variant={
                  trend.averageNetCashflow >= 0 ? "positive" : "negative"
                }
                className="animate-enter stagger-3"
              />

              <MetricCard
                title="Savings Rate"
                value={`${trend.overallSavingsRate}%`}
                description={`${trend.surplusMonths} surplus / ${trend.deficitMonths} deficit months`}
                icon={Sparkles}
                variant={
                  trend.overallSavingsRate >= 20
                    ? "positive"
                    : trend.overallSavingsRate >= 0
                      ? "default"
                      : "negative"
                }
                className="animate-enter stagger-4"
              />
            </section>
          )}

          {/* Cashflow Chart */}
          <Card variant="premium" className="animate-enter stagger-5">
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-1">
              <div>
                <CardTitle className="text-base">Monthly Cashflow</CardTitle>
                <CardDescription>
                  Income vs expenses over time with net cashflow.
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5",
                  getTrendColor(trend.direction)
                )}
              >
                <TrendIcon className="h-3.5 w-3.5" />
                {getTrendLabel(trend.direction)}
              </Badge>
            </CardHeader>
            <CardContent className="h-[320px]">
              {isLoading ? (
                <Skeleton
                  className="h-full w-full rounded-xl"
                  variant="premium"
                />
              ) : chartData.length > 0 ? (
                <CashflowChart data={chartData} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <div className="mb-4 rounded-2xl bg-muted/70 p-4">
                    <BarChart3 className="h-9 w-9 opacity-45" />
                  </div>
                  <p className="font-semibold text-foreground">
                    No cashflow data yet
                  </p>
                  <p className="mt-1 text-sm">
                    Import transactions to unlock cashflow insights.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Row: Forecast + Category Breakdown + Recurring */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Forecast */}
            <Card variant="premium" className="animate-enter stagger-6">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      6-Month Forecast
                    </CardTitle>
                    <CardDescription>
                      Projected based on your recent patterns.
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      forecast.confidence === "high"
                        ? "default"
                        : forecast.confidence === "medium"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-xs"
                  >
                    {forecast.confidence} confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                ) : forecast.projections.length > 0 ? (
                  <div className="space-y-2">
                    {forecast.projections.map((proj) => (
                      <div
                        key={proj.month}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-accent/30"
                      >
                        <div className="flex items-center gap-3">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {proj.label}
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className={cn(
                              "metric-value text-sm font-semibold tabular-nums",
                              proj.projectedNet >= 0
                                ? "text-success"
                                : "text-destructive"
                            )}
                          >
                            {proj.projectedNet >= 0 ? "+" : ""}
                            {formatAUD(proj.projectedNet)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Not enough data for forecast. Add more transactions.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card variant="premium" className="animate-enter stagger-7">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Expense Breakdown (This Month)
                </CardTitle>
                <CardDescription>
                  Categories with month-over-month change.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                ) : expenseBreakdown.length > 0 ? (
                  <div className="space-y-2">
                    {expenseBreakdown.slice(0, 8).map((cat) => (
                      <div
                        key={cat.categoryId}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-accent/30"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium truncate">
                              {cat.categoryName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {cat.percentage}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-muted/70">
                            <div
                              className="h-full rounded-full bg-primary/70 transition-all"
                              style={{
                                width: `${Math.min(100, cat.percentage)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <span className="text-sm font-semibold tabular-nums">
                            {formatAUD(cat.totalAmount)}
                          </span>
                          {cat.monthOverMonthChange !== 0 && (
                            <p
                              className={cn(
                                "text-xs",
                                cat.monthOverMonthChange > 0
                                  ? "text-destructive"
                                  : "text-success"
                              )}
                            >
                              {cat.monthOverMonthChange > 0 ? "↑" : "↓"}{" "}
                              {formatAUD(Math.abs(cat.monthOverMonthChange))}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No expenses this month.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Recurring Patterns */}
          {!isLoading && recurring.length > 0 && (
            <Card variant="premium" className="animate-enter stagger-8">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">
                    Recurring Patterns
                  </CardTitle>
                </div>
                <CardDescription>
                  Automatically detected from your transaction history.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {recurring.slice(0, 9).map((pattern, index) => (
                    <div
                      key={`${pattern.description}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-card/50 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium capitalize">
                          {pattern.description}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant={
                              pattern.type === "income"
                                ? "default"
                                : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {pattern.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getFrequencyLabel(pattern.frequency)} ·{" "}
                            {pattern.occurrences}×
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "ml-3 text-sm font-semibold tabular-nums",
                          pattern.type === "income"
                            ? "text-success"
                            : "text-destructive"
                        )}
                      >
                        {formatAUD(pattern.averageAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Best/Worst Months */}
          {!isLoading && trend.bestMonth && trend.worstMonth && (
            <section className="grid gap-4 sm:grid-cols-2">
              <Card variant="premium" className="animate-enter stagger-9">
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Best Month</p>
                    <p className="text-lg font-semibold">
                      {trend.bestMonth.month}
                    </p>
                    <p className="text-sm font-medium text-success tabular-nums">
                      +{formatAUD(trend.bestMonth.net)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card variant="premium" className="animate-enter stagger-10">
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15">
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Worst Month
                    </p>
                    <p className="text-lg font-semibold">
                      {trend.worstMonth.month}
                    </p>
                    <p
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        trend.worstMonth.net >= 0
                          ? "text-success"
                          : "text-destructive"
                      )}
                    >
                      {trend.worstMonth.net >= 0 ? "+" : ""}
                      {formatAUD(trend.worstMonth.net)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

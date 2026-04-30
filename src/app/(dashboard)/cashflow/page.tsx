"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
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
  BarChart3,
  CalendarDays,
  Repeat,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { CashflowChart } from "@/components/charts";
import { useCashflowAnalysis } from "@/hooks/use-cashflow-analysis";
import { formatAUD } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { useFamilyStore } from "@/stores/family.store";
import { StatCell } from "@/components/ui/stat-cell";

const PERIOD_OPTIONS = [
  { value: "3", label: "3M" },
  { value: "6", label: "6M" },
  { value: "12", label: "1Y" },
  { value: "24", label: "2Y" },
  { value: "36", label: "3Y" },
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

function getTrendVariant(
  direction: string,
): "success" | "destructive" | "outline" {
  if (direction === "improving") return "success";
  if (direction === "declining") return "destructive";
  return "outline";
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

  const chartData = useMemo(
    () =>
      monthlyEntries.map((entry) => {
        const [year] = entry.month.split("-");
        return {
          month: entry.label.split(" ")[0],
          year: parseInt(year, 10),
          income: entry.income,
          expenses: entry.expenses,
          net: entry.net,
        };
      }),
    [monthlyEntries],
  );

  const TrendIcon = getTrendIcon(trend.direction);

  return (
    <>
      <Header title="Cash Flow" />

      <div className="pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="card-trace relative overflow-hidden rounded-md border border-border bg-card animate-enter">
            <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between md:p-8">
              <div>
                <span className="eyebrow">// Cash flow analysis</span>
                <h1 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
                  Money in &amp; out
                </h1>
                <p className="mt-2 max-w-prose text-[13px] text-muted-foreground">
                  Track the flow across all accounts, rentals, investments.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--text-subtle]">
                  Window
                </span>
                <Select
                  value={String(months)}
                  onValueChange={(v) => setMonths(Number(v))}
                >
                  <SelectTrigger className="h-8 w-[88px] rounded-sm border border-border bg-transparent font-mono text-[11px] uppercase tracking-[0.1em] shadow-none">
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
              </div>
            </div>
          </section>

          {/* Metric strip */}
          {isLoading ? (
            <section className="grid grid-cols-1 gap-0 divide-y divide-border overflow-hidden rounded-md border border-border bg-card sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[110px] rounded-none border-0"
                />
              ))}
            </section>
          ) : (
            <section className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-md border border-border bg-card sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
              <StatCell
                label="Avg Income"
                value={formatAUD(trend.averageIncome)}
                sublabel={`${monthlyEntries.length} mo · Avg`}
                tone="positive"
                delay={0.05}
              />
              <StatCell
                label="Avg Expenses"
                value={formatAUD(trend.averageExpenses)}
                sublabel={`${monthlyEntries.length} mo · Avg`}
                tone="negative"
                delay={0.1}
              />
              <StatCell
                label="Avg Net"
                value={`${trend.averageNetCashflow >= 0 ? "+" : ""}${formatAUD(trend.averageNetCashflow)}`}
                sublabel={getTrendLabel(trend.direction)}
                tone={trend.averageNetCashflow >= 0 ? "positive" : "negative"}
                delay={0.15}
              />
              <StatCell
                label="Savings Rate"
                value={`${trend.overallSavingsRate}%`}
                sublabel={`${trend.surplusMonths} surplus · ${trend.deficitMonths} deficit`}
                tone={trend.overallSavingsRate >= 0 ? "positive" : "negative"}
                delay={0.2}
              />
            </section>
          )}

          {/* Cashflow Chart */}
          <section
            className="card-trace overflow-hidden rounded-md border border-border bg-card animate-enter-fast"
            style={{ animationDelay: "0.25s" }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="eyebrow">Cashflow</span>
                <span className="hairline-v h-3" aria-hidden />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                  Monthly · Net
                </span>
              </div>
              <Badge variant={getTrendVariant(trend.direction)}>
                <TrendIcon className="h-3 w-3" strokeWidth={1.5} />
                {getTrendLabel(trend.direction)}
              </Badge>
            </div>
            <div className="h-[320px] p-4">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : chartData.length > 0 ? (
                <CashflowChart data={chartData} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[2px] border border-border bg-muted/40">
                    <BarChart3
                      className="h-4 w-4 text-[--text-subtle]"
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="font-display text-base">No cashflow data</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Import transactions to unlock cashflow insights.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Forecast + Category Breakdown */}
          <section className="grid gap-5 lg:grid-cols-2">
            <div
              className="card-trace overflow-hidden rounded-md border border-border bg-card animate-enter-fast"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="eyebrow">Forecast</span>
                  <span className="hairline-v h-3" aria-hidden />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                    6 mo · Projected
                  </span>
                </div>
                <Badge
                  variant={
                    forecast.confidence === "high"
                      ? "success"
                      : forecast.confidence === "medium"
                        ? "outline"
                        : "warning"
                  }
                >
                  {forecast.confidence} conf.
                </Badge>
              </div>
              <div className="p-2">
                {isLoading ? (
                  <div className="space-y-2 p-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : forecast.projections.length > 0 ? (
                  <div className="divide-y divide-border">
                    {forecast.projections.map((proj) => (
                      <div
                        key={proj.month}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                      >
                        <CalendarDays
                          className="h-3.5 w-3.5 text-[--text-subtle]"
                          strokeWidth={1.5}
                        />
                        <span className="text-[13px] font-medium">
                          {proj.label}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[13px] tabular-nums font-medium",
                            proj.projectedNet >= 0
                              ? "text-positive"
                              : "text-negative",
                          )}
                        >
                          {proj.projectedNet >= 0 ? "+" : ""}
                          {formatAUD(proj.projectedNet)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-[13px] text-muted-foreground">
                    Not enough data for forecast.
                  </p>
                )}
              </div>
            </div>

            <div
              className="card-trace overflow-hidden rounded-md border border-border bg-card animate-enter-fast"
              style={{ animationDelay: "0.35s" }}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="eyebrow">Categories</span>
                  <span className="hairline-v h-3" aria-hidden />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                    This month
                  </span>
                </div>
              </div>
              <div className="p-2">
                {isLoading ? (
                  <div className="space-y-2 p-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : expenseBreakdown.length > 0 ? (
                  <div className="divide-y divide-border">
                    {expenseBreakdown.slice(0, 8).map((cat) => (
                      <div
                        key={cat.categoryId}
                        className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="truncate text-[13px] font-medium">
                              {cat.categoryName}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
                              {cat.percentage}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-[3px] bg-muted overflow-hidden rounded-[1px]">
                            <div
                              className="h-full bg-primary/80 transition-all"
                              style={{
                                width: `${Math.min(100, cat.percentage)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-[13px] tabular-nums">
                            {formatAUD(cat.totalAmount)}
                          </span>
                          {cat.monthOverMonthChange !== 0 && (
                            <p
                              className={cn(
                                "font-mono text-[10px] tabular-nums",
                                cat.monthOverMonthChange > 0
                                  ? "text-negative"
                                  : "text-positive",
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
                  <p className="py-8 text-center text-[13px] text-muted-foreground">
                    No expenses this month.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Recurring Patterns */}
          {!isLoading && recurring.length > 0 && (
            <section
              className="card-trace overflow-hidden rounded-md border border-border bg-card animate-enter-fast"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-3">
                  <Repeat
                    className="h-3.5 w-3.5 text-primary"
                    strokeWidth={1.5}
                  />
                  <span className="eyebrow">Recurring patterns</span>
                  <span className="hairline-v h-3" aria-hidden />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                    Auto-detected
                  </span>
                </div>
              </div>
              <div className="grid gap-0 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-3">
                {recurring.slice(0, 9).map((pattern, index) => (
                  <div
                    key={`${pattern.description}-${index}`}
                    className={cn(
                      "p-4 transition-colors hover:bg-muted/40",
                      index >= 3 && "border-t border-border lg:border-t-0",
                      index >= 6 && "lg:border-t",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-medium capitalize">
                        {pattern.description}
                      </p>
                      <span
                        className={cn(
                          "font-mono text-[12px] tabular-nums font-medium",
                          pattern.type === "income"
                            ? "text-positive"
                            : "text-negative",
                        )}
                      >
                        {formatAUD(pattern.averageAmount)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant={
                          pattern.type === "income" ? "success" : "outline"
                        }
                      >
                        {pattern.type}
                      </Badge>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
                        {getFrequencyLabel(pattern.frequency)} ·{" "}
                        {pattern.occurrences}×
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Best/Worst */}
          {!isLoading && trend.bestMonth && trend.worstMonth && (
            <section className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-md border border-border bg-card sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
              <div className="card-trace flex items-center gap-4 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-success/40 bg-success/10">
                  <ArrowUpRight
                    className="h-4 w-4 text-success"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <span className="eyebrow">Best Month</span>
                  <p className="mt-1.5 font-display text-lg tracking-tight">
                    {trend.bestMonth.month}
                  </p>
                  <p className="mt-0.5 font-mono text-[13px] tabular-nums text-positive">
                    +{formatAUD(trend.bestMonth.net)}
                  </p>
                </div>
              </div>
              <div className="card-trace flex items-center gap-4 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-destructive/40 bg-destructive/10">
                  <ArrowDownRight
                    className="h-4 w-4 text-destructive"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <span className="eyebrow">Worst Month</span>
                  <p className="mt-1.5 font-display text-lg tracking-tight">
                    {trend.worstMonth.month}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-mono text-[13px] tabular-nums",
                      trend.worstMonth.net >= 0
                        ? "text-positive"
                        : "text-negative",
                    )}
                  >
                    {trend.worstMonth.net >= 0 ? "+" : ""}
                    {formatAUD(trend.worstMonth.net)}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

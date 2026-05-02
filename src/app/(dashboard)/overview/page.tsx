"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonTransaction } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  PiggyBank,
  ChevronRight,
  FileUp,
} from "lucide-react";
import { CashflowChart, CategoryPieChart, TotalAssetAllocation } from "@/components/charts";
import {
  useAccountsSummary,
  useMonthlyTotals,
  useCashflow,
  useCategoryBreakdown,
  useRecentTransactions,
  useCategories,
  useAccounts,
  useTotalAssetAllocation,
} from "@/hooks";
import { formatAUD, splitAUD } from "@/lib/utils/currency";
import { FinancialYear } from "@/domain/value-objects/financial-year";
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

function HeroSparkline({
  data,
  positive,
}: {
  data: { net: number }[];
  positive: boolean;
}) {
  const points = useMemo(() => {
    if (!data.length) return "";
    const values = data.map((d) => d.net);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const W = 280;
    const H = 60;
    const step = W / Math.max(1, data.length - 1);
    return values
      .map(
        (v, i) =>
          `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)} ${(H - ((v - min) / range) * H).toFixed(2)}`,
      )
      .join(" ");
  }, [data]);

  if (!points) return null;

  return (
    <div className="animate-wipe-in">
      <svg
        viewBox="0 0 280 60"
        className="h-14 w-full max-w-[300px]"
        aria-hidden
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sparkfade" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--primary)"
              stopOpacity="0.18"
            />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${points} L 280 60 L 0 60 Z`}
          fill="url(#sparkfade)"
          opacity={positive ? 1 : 0.4}
        />
        <path
          d={points}
          fill="none"
          stroke={positive ? "var(--primary)" : "var(--destructive)"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [cashflowMonths, setCashflowMonths] = useState(6);
  const [categoryMonths, setCategoryMonths] = useState(3);
  const { selectedMemberId } = useFamilyStore();
  const memberId = selectedMemberId ?? undefined;

  const { summary } = useAccountsSummary(memberId);
  const { totals } = useMonthlyTotals(memberId);
  const { cashflow, isLoading: cashflowLoading } = useCashflow(
    cashflowMonths,
    memberId,
  );
  const { breakdown, isLoading: breakdownLoading } = useCategoryBreakdown(
    "expense",
    categoryMonths,
    memberId,
  );
  const { transactions: recentTransactions, isLoading: transactionsLoading } =
    useRecentTransactions(5, memberId);
  const { categories } = useCategories();
  const { accounts } = useAccounts({ memberId });
  const allocation = useTotalAssetAllocation();

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const currentFY = FinancialYear.current();

  const netWorthSplit = splitAUD(summary.netWorth);
  const netPositive = summary.netWorth >= 0;

  // Sparkline data: derive net flow per month from cashflow.
  const sparkData = useMemo(
    () =>
      cashflow.length > 0
        ? cashflow.map((c) => ({ net: c.net }))
        : [{ net: 0 }, { net: 0 }],
    [cashflow],
  );

  return (
    <>
      <Header title="Dashboard" />

      <div className="pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 sm:px-6 lg:px-8">
          {/* HERO — Net Worth */}
          <section className="card-trace fintech-surface relative overflow-hidden rounded-lg border border-border/80 animate-enter">
            <div className="scan-line" aria-hidden />

            <div className="grid gap-6 p-6 md:grid-cols-12 md:p-8">
              <div className="md:col-span-7">
                <div className="flex items-center gap-3">
                  <span className="eyebrow">Net Worth</span>
                  <span className="hairline-v h-3" aria-hidden />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--text-subtle]">
                    {format(new Date(), "MMM yyyy")}
                  </span>
                </div>

                <div className="mt-5 flex items-baseline gap-1">
                  <span
                    className={cn(
                      "display-number animate-wipe-in tabular-nums text-[clamp(48px,7.4vw,86px)]",
                      netPositive ? "text-foreground" : "text-destructive",
                    )}
                  >
                    {netWorthSplit.whole}
                  </span>
                  {netWorthSplit.cents && (
                    <span
                      className={cn(
                        "mono-num text-[clamp(20px,2.4vw,28px)] text-[--text-subtle]",
                      )}
                    >
                      {netWorthSplit.cents}
                    </span>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[--text-subtle]">
                  <span>
                    AS OF · {format(new Date(), "d MMM").toUpperCase()}
                  </span>
                  <span className="hairline-v h-3" aria-hidden />
                  <span>
                    {summary.accountCount} ACCOUNT
                    {summary.accountCount !== 1 ? "S" : ""}
                  </span>
                  <span className="hairline-v h-3" aria-hidden />
                  <span>FY · {currentFY.format()}</span>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 md:col-span-5 md:border-l md:border-border md:pl-8">
                <div>
                  <span className="eyebrow">Trend · {cashflowMonths}M</span>
                  <div className="mt-4 rounded-lg border border-border/70 bg-background/28 p-4">
                    <HeroSparkline data={sparkData} positive={netPositive} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href="/import">
                    <Button variant="outline" size="sm">
                      <FileUp className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                      Import
                    </Button>
                  </Link>
                  <Link href="/transactions">
                    <Button variant="default" size="sm">
                      <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                      Add Transaction
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* METRIC ROW — divided strip */}
          <section className="fintech-panel grid grid-cols-1 divide-y divide-border overflow-hidden rounded-lg border border-border/80 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
            <StatCell
              label="Monthly Income"
              value={formatAUD(totals.income)}
              sublabel="MTD · Inflow"
              tone={totals.income > 0 ? "positive" : "neutral"}
              delay={0.05}
              size="lg"
            />
            <StatCell
              label="Monthly Expenses"
              value={formatAUD(totals.expenses)}
              sublabel="MTD · Outflow"
              tone="neutral"
              delay={0.1}
              size="lg"
            />
            <StatCell
              label="Net Cashflow"
              value={`${totals.net >= 0 ? "+" : ""}${formatAUD(totals.net)}`}
              sublabel={totals.net >= 0 ? "MTD · Surplus" : "MTD · Deficit"}
              tone={totals.net >= 0 ? "positive" : "negative"}
              delay={0.15}
              size="lg"
            />
            <StatCell
              label="Accounts"
              value={String(summary.accountCount)}
              sublabel={`${accounts.length} TRACKED`}
              tone="neutral"
              delay={0.2}
              size="lg"
            />
          </section>

          {/* CHARTS */}
          <section className="grid gap-4 lg:grid-cols-2">
            <ChartPanel
              title="Cashflow"
              subtitle="Income vs expenses"
              periodValue={String(cashflowMonths)}
              onPeriodChange={(v) => setCashflowMonths(Number(v))}
              delay={0.25}
            >
              {cashflowLoading ? (
                <Skeleton className="h-full w-full" />
              ) : cashflow.length > 0 ? (
                <CashflowChart data={cashflow} />
              ) : (
                <EmptyChart
                  icon={ArrowRightLeft}
                  title="No cashflow data"
                  hint="Import transactions to unlock trend insights."
                />
              )}
            </ChartPanel>

            <ChartPanel
              title="Categories"
              subtitle="Where money goes"
              periodValue={String(categoryMonths)}
              onPeriodChange={(v) => setCategoryMonths(Number(v))}
              delay={0.3}
            >
              {breakdownLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Skeleton className="h-44 w-44 rounded-full" />
                </div>
              ) : breakdown.length > 0 ? (
                <CategoryPieChart data={breakdown} />
              ) : (
                <EmptyChart
                  icon={PiggyBank}
                  title="No category data"
                  hint="Add expenses to view breakdown."
                />
              )}
            </ChartPanel>
          </section>

          {/* ASSET ALLOCATION */}
          <section
            className="card-trace fintech-panel overflow-hidden rounded-lg border border-border/80 animate-enter-fast"
            style={{ animationDelay: "0.32s" }}
          >
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="eyebrow">Asset Allocation</span>
                <span className="hairline-v h-3" aria-hidden />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                  Full picture
                </span>
              </div>
            </div>
            <div className="h-[360px] p-4">
              <TotalAssetAllocation
                slices={allocation.slices}
                totalAssets={allocation.totalAssets}
                totalLiabilities={allocation.totalLiabilities}
                netWorth={allocation.netWorth}
                isLoading={allocation.isLoading}
              />
            </div>
          </section>

          {/* ACTIVITY LEDGER */}
          <section
            className="fintech-panel animate-enter overflow-hidden rounded-lg border border-border/80"
            style={{ animationDelay: "0.35s" }}
          >
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="eyebrow">Activity</span>
                <span className="hairline-v h-3" aria-hidden />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                  Latest 5
                </span>
              </div>
              <Link href="/transactions">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight
                    className="ml-1 h-3 w-3"
                    strokeWidth={1.5}
                  />
                </Button>
              </Link>
            </div>

            {transactionsLoading ? (
              <div className="divide-y divide-border">
                {[...Array(5)].map((_, i) => (
                  <SkeletonTransaction key={i} className="px-5" />
                ))}
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="divide-y divide-border">
                {recentTransactions.map((transaction, index) => {
                  const category = transaction.categoryId
                    ? categoryMap.get(transaction.categoryId)
                    : null;
                  const account = accountMap.get(transaction.accountId);

                  const sign =
                    transaction.type === "income"
                      ? "+"
                      : transaction.type === "expense"
                        ? "−"
                        : "";

                  const amountColor =
                    transaction.type === "income"
                      ? "text-positive"
                      : transaction.type === "expense"
                        ? "text-negative"
                        : "text-foreground";

                  return (
                    <div
                      key={transaction.id}
                      className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-muted/45 sm:grid-cols-[80px_minmax(0,1fr)_auto_auto]"
                      style={{ animationDelay: `${0.4 + index * 0.04}s` }}
                    >
                      <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[--text-subtle]">
                        {format(new Date(transaction.date), "d MMM").toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {transaction.type === "income" ? (
                            <ArrowUpRight
                              className="h-3 w-3 shrink-0 text-positive"
                              strokeWidth={1.5}
                            />
                          ) : transaction.type === "expense" ? (
                            <ArrowDownRight
                              className="h-3 w-3 shrink-0 text-negative"
                              strokeWidth={1.5}
                            />
                          ) : (
                            <ArrowRightLeft
                              className="h-3 w-3 shrink-0 text-[--text-subtle]"
                              strokeWidth={1.5}
                            />
                          )}
                          <p className="truncate text-[13px] font-medium">
                            {transaction.description}
                          </p>
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
                          {account?.name || "Unknown"}
                          {category && ` · ${category.name}`}
                        </p>
                      </div>

                      <div
                        className={cn(
                          "hidden font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle] sm:block",
                        )}
                      >
                        {transaction.type === "income"
                          ? "INCOME"
                          : transaction.type === "expense"
                            ? "EXPENSE"
                            : "TRANSFER"}
                      </div>

                      <p
                        className={cn(
                          "text-right font-mono text-[14px] tabular-nums font-medium",
                          amountColor,
                        )}
                      >
                        {sign}
                        {formatAUD(transaction.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/40">
                  <ArrowRightLeft
                    className="h-5 w-5 text-[--text-subtle]"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="font-display text-lg tracking-tight">
                  No transactions yet
                </p>
                <p className="mx-auto mt-2 max-w-xs text-[13px] text-muted-foreground">
                  Import a statement or add your first transaction to get
                  started.
                </p>
                <div className="mt-6 flex justify-center gap-2">
                  <Link href="/import">
                    <Button variant="outline" size="sm">
                      <FileUp
                        className="mr-1.5 h-3.5 w-3.5"
                        strokeWidth={1.5}
                      />
                      Import
                    </Button>
                  </Link>
                  <Link href="/transactions">
                    <Button size="sm">
                      <Plus
                        className="mr-1.5 h-3.5 w-3.5"
                        strokeWidth={1.5}
                      />
                      Add Transaction
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function ChartPanel({
  title,
  subtitle,
  periodValue,
  onPeriodChange,
  children,
  delay = 0,
}: {
  title: string;
  subtitle: string;
  periodValue: string;
  onPeriodChange: (v: string) => void;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="card-trace fintech-panel overflow-hidden rounded-lg border border-border/80 animate-enter-fast"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between border-b border-border/80 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="eyebrow">{title}</span>
          <span className="hairline-v h-3" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
            {subtitle}
          </span>
        </div>
        <Select value={periodValue} onValueChange={onPeriodChange}>
          <SelectTrigger className="h-8 w-[72px] rounded-md border border-border/80 bg-card/70 font-mono text-[10px] uppercase tracking-[0.12em] shadow-sm">
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
      <div className="h-[300px] p-4">{children}</div>
    </div>
  );
}

function EmptyChart({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof ArrowRightLeft;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40">
        <Icon className="h-4 w-4 text-[--text-subtle]" strokeWidth={1.5} />
      </div>
      <p className="font-display text-base tracking-tight text-foreground">
        {title}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{hint}</p>
    </div>
  );
}

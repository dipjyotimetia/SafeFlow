'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
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
  Download,
  Calculator,
  TrendingUp,
  Receipt,
  Loader2,
  Landmark,
  Banknote,
} from 'lucide-react';
import {
  getCurrentFinancialYear,
  formatFinancialYear,
} from '@/lib/utils/financial-year';
import { atoCategoryDescriptions } from '@/lib/db/seeds/categories.seed';
import {
  useDeductionsSummary,
  useCapitalGains,
  useIncomeSummary,
  useFrankingSummary,
  useAvailableFinancialYears,
  useContributionSummary,
} from '@/hooks';
import { formatAUD } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { useFamilyStore } from '@/stores/family.store';
import { toast } from 'sonner';
import { StatCell } from '@/components/ui/stat-cell';

function SectionShell({
  title,
  subtitle,
  icon: Icon,
  children,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  icon?: typeof TrendingUp;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="card-trace overflow-hidden rounded-lg border border-border/80 fintech-panel animate-enter-fast"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <Icon
              className="h-3.5 w-3.5 text-primary"
              strokeWidth={1.5}
            />
          )}
          <span className="eyebrow">{title}</span>
          {subtitle && (
            <>
              <span className="hairline-v h-3" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                {subtitle}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  emphasis,
  tone = 'neutral',
  border = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: 'positive' | 'negative' | 'warning' | 'neutral';
  border?: boolean;
}) {
  const valueColor =
    tone === 'positive'
      ? 'text-positive'
      : tone === 'negative'
        ? 'text-negative'
        : tone === 'warning'
          ? 'text-warning'
          : 'text-foreground';
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-2',
        border && 'border-t border-border pt-3',
      )}
    >
      <span
        className={cn(
          'text-[13px]',
          emphasis ? 'font-medium' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-[13px] tabular-nums',
          emphasis && 'font-semibold',
          valueColor,
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default function TaxPage() {
  const [selectedFY, setSelectedFY] = useState(getCurrentFinancialYear());
  const { selectedMemberId } = useFamilyStore();
  const memberId = selectedMemberId ?? undefined;

  const { years, isLoading: yearsLoading } =
    useAvailableFinancialYears(memberId);
  const { summary: deductionsSummary, isLoading: deductionsLoading } =
    useDeductionsSummary(selectedFY, memberId);
  const { data: capitalGainsData, isLoading: cgtLoading } = useCapitalGains(
    selectedFY,
    memberId,
  );
  const { summary: incomeSummary, isLoading: incomeLoading } = useIncomeSummary(
    selectedFY,
    memberId,
  );
  const { summary: frankingSummary, isLoading: frankingLoading } =
    useFrankingSummary(selectedFY, memberId);
  const { summary: contributionSummary, isLoading: superLoading } =
    useContributionSummary(selectedFY);

  const isLoading =
    yearsLoading ||
    deductionsLoading ||
    cgtLoading ||
    incomeLoading ||
    frankingLoading ||
    superLoading;

  const categoryAmounts = new Map<string, number>();
  for (const cat of deductionsSummary.byCategory) {
    categoryAmounts.set(cat.code, cat.amount);
  }

  const handleExportReport = () => {
    const report = {
      financialYear: selectedFY,
      exportedAt: new Date().toISOString(),
      income: {
        total: incomeSummary.totalIncome,
        dividends: incomeSummary.totalDividends,
        grossedUpDividends: incomeSummary.totalGrossedUpDividends,
        combined: incomeSummary.combinedIncome,
      },
      frankingCredits: {
        totalDividends: frankingSummary.totalDividends,
        totalFrankingCredits: frankingSummary.totalFrankingCredits,
        totalGrossedUpDividends: frankingSummary.totalGrossedUpDividends,
        byHolding: frankingSummary.byHolding,
      },
      deductions: {
        total: deductionsSummary.totalDeductions,
        gstClaimed: deductionsSummary.totalGst,
        byCategory: deductionsSummary.byCategory,
      },
      capitalGains: {
        totalGains: capitalGainsData.totalGains,
        totalLosses: capitalGainsData.totalLosses,
        shortTermGains: capitalGainsData.shortTermGains,
        longTermGains: capitalGainsData.longTermGains,
        discountedLongTermGains: capitalGainsData.discountedLongTermGains,
        netCapitalGain: capitalGainsData.netCapitalGain,
      },
      superannuation: {
        employerSG: contributionSummary.employerSG,
        salarySacrifice: contributionSummary.salarySacrifice,
        personalConcessional: contributionSummary.personalConcessional,
        personalNonConcessional: contributionSummary.personalNonConcessional,
        totalConcessional: contributionSummary.totalConcessional,
        totalNonConcessional: contributionSummary.totalNonConcessional,
        concessionalCapRemaining: contributionSummary.concessionalRemaining,
        nonConcessionalCapRemaining:
          contributionSummary.nonConcessionalRemaining,
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${selectedFY}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Tax report exported');
  };

  return (
    <>
      <Header title="Tax" />
      <div className="pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="card-trace fintech-surface relative overflow-hidden rounded-lg border border-border/80 animate-enter">
            <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between md:p-8">
              <div>
                <span className="eyebrow">// Tax overview</span>
                <h1 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
                  FY {formatFinancialYear(selectedFY)}
                </h1>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Australian Tax Year · Income, deductions, CGT, super.
                </p>
              </div>
              <div className="flex gap-2">
                <Select value={selectedFY} onValueChange={setSelectedFY}>
                  <SelectTrigger className="h-8 w-[130px] rounded-md border border-border/80 bg-card/70 font-mono text-[11px] uppercase tracking-[0.1em] shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((fy) => (
                      <SelectItem key={fy} value={fy}>
                        FY {fy}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExportReport}>
                  <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Export
                </Button>
              </div>
            </div>
          </section>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2
                className="h-6 w-6 animate-spin text-primary"
                strokeWidth={1.5}
              />
            </div>
          ) : (
            <>
              {/* Summary metric strip */}
              <section className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-lg border border-border/80 fintech-panel sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
                <StatCell
                  label="Total Income"
                  value={formatAUD(incomeSummary.combinedIncome)}
                  sublabel={`${incomeSummary.incomeCount} transactions`}
                  tone="positive"
                  delay={0.05}
                  size="sm"
                />
                <StatCell
                  label="Total Deductions"
                  value={formatAUD(deductionsSummary.totalDeductions)}
                  sublabel={`${deductionsSummary.totalCount} items`}
                  tone="neutral"
                  delay={0.1}
                  size="sm"
                />
                <StatCell
                  label="GST Claimed"
                  value={formatAUD(deductionsSummary.totalGst)}
                  sublabel="For BAS · If applicable"
                  tone="neutral"
                  delay={0.15}
                  size="sm"
                />
                <StatCell
                  label="Net Capital Gain"
                  value={formatAUD(Math.abs(capitalGainsData.netCapitalGain))}
                  sublabel={
                    capitalGainsData.netCapitalGain >= 0
                      ? 'After 50% CGT discount'
                      : 'Loss · Carry forward'
                  }
                  tone={
                    capitalGainsData.netCapitalGain >= 0
                      ? 'warning'
                      : 'positive'
                  }
                  delay={0.2}
                  size="sm"
                />
              </section>

              {/* Capital Gains */}
              {(capitalGainsData.totalGains > 0 ||
                capitalGainsData.totalLosses > 0) && (
                <SectionShell
                  title="Capital Gains"
                  subtitle="Investment disposals · This FY"
                  icon={TrendingUp}
                  delay={0.25}
                >
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Row
                        label="Short-term gains (<12mo)"
                        value={formatAUD(capitalGainsData.shortTermGains)}
                        tone="warning"
                      />
                      <Row
                        label="Long-term gains (12mo+)"
                        value={formatAUD(capitalGainsData.longTermGains)}
                        tone="warning"
                      />
                      <Row
                        label="50% CGT discount applied"
                        value={`-${formatAUD(capitalGainsData.longTermGains - capitalGainsData.discountedLongTermGains)}`}
                        tone="positive"
                        border
                      />
                    </div>
                    <div>
                      <Row
                        label="Total gains"
                        value={formatAUD(capitalGainsData.totalGains)}
                        tone="warning"
                      />
                      <Row
                        label="Total losses"
                        value={`-${formatAUD(capitalGainsData.totalLosses)}`}
                        tone="positive"
                      />
                      <Row
                        label="Net taxable gain"
                        value={formatAUD(capitalGainsData.netCapitalGain)}
                        emphasis
                        tone={
                          capitalGainsData.netCapitalGain >= 0
                            ? 'warning'
                            : 'positive'
                        }
                        border
                      />
                    </div>
                  </div>
                </SectionShell>
              )}

              {/* Franking */}
              {frankingSummary.totalFrankingCredits > 0 && (
                <SectionShell
                  title="Franking Credits"
                  subtitle="Dividend imputation"
                  icon={Banknote}
                  delay={0.3}
                >
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Row
                        label="Cash dividends"
                        value={formatAUD(frankingSummary.totalDividends)}
                      />
                      <Row
                        label="Franking credits"
                        value={`+${formatAUD(frankingSummary.totalFrankingCredits)}`}
                        tone="positive"
                      />
                      <Row
                        label="Grossed-up dividend income"
                        value={formatAUD(
                          frankingSummary.totalGrossedUpDividends,
                        )}
                        emphasis
                        border
                      />
                    </div>
                    <div className="rounded-lg border border-success/40 bg-success/10 p-4">
                      <span className="eyebrow text-success">
                        Tax Offset Available
                      </span>
                      <p className="mt-2 metric-value tabular-nums text-[28px] text-success">
                        {formatAUD(frankingSummary.totalFrankingCredits)}
                      </p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
                        Reduces tax payable · $1 per $1
                      </p>
                    </div>
                  </div>

                  {frankingSummary.byHolding.length > 0 && (
                    <div className="mt-6">
                      <p className="eyebrow mb-3">// By holding</p>
                      <div className="divide-y divide-border rounded-lg border border-border">
                        {frankingSummary.byHolding.map((h) => (
                          <div
                            key={h.holdingId}
                            className="flex items-center justify-between px-3 py-2"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[12px] font-medium tracking-wide">
                                {h.symbol}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
                                {h.transactionCount}{' '}
                                {h.transactionCount === 1
                                  ? 'div'
                                  : 'divs'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-[12px] tabular-nums text-[--text-subtle]">
                                {formatAUD(h.dividends)}
                              </span>
                              <span className="font-mono text-[12px] tabular-nums font-medium text-positive">
                                +{formatAUD(h.frankingCredits)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <Badge variant="accent">ATO</Badge>
                    <p className="text-[12px] leading-relaxed">
                      Report grossed-up dividend amount (
                      {formatAUD(frankingSummary.totalGrossedUpDividends)}) as
                      assessable income. Franking credit (
                      {formatAUD(frankingSummary.totalFrankingCredits)}) is
                      claimed as tax offset.
                    </p>
                  </div>
                </SectionShell>
              )}

              {/* Super Contributions */}
              {(contributionSummary.totalConcessional > 0 ||
                contributionSummary.totalNonConcessional > 0) && (
                <SectionShell
                  title="Superannuation Contributions"
                  subtitle="Cap tracking · Tax planning"
                  icon={Landmark}
                  delay={0.35}
                >
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <p className="eyebrow mb-3">
                        Concessional · Tax-deductible
                      </p>
                      <Row
                        label="Employer SG"
                        value={formatAUD(contributionSummary.employerSG)}
                      />
                      <Row
                        label="Salary Sacrifice"
                        value={formatAUD(contributionSummary.salarySacrifice)}
                      />
                      <Row
                        label="Personal Deductible"
                        value={formatAUD(
                          contributionSummary.personalConcessional,
                        )}
                      />
                      <Row
                        label="Total Concessional"
                        value={formatAUD(
                          contributionSummary.totalConcessional,
                        )}
                        emphasis
                        border
                      />
                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
                          <span>
                            Cap · {formatAUD(contributionSummary.concessionalCap)}
                          </span>
                          <span>
                            Remaining ·{' '}
                            {formatAUD(
                              contributionSummary.concessionalRemaining,
                            )}
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden bg-muted rounded-[1px]">
                          <div
                            className={cn(
                              'h-full transition-all',
                              contributionSummary.concessionalRemaining < 0
                                ? 'bg-destructive'
                                : 'bg-primary',
                            )}
                            style={{
                              width: `${Math.min(100, (contributionSummary.totalConcessional / contributionSummary.concessionalCap) * 100)}%`,
                            }}
                          />
                        </div>
                        {contributionSummary.concessionalRemaining < 0 && (
                          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-destructive">
                            Cap exceeded by{' '}
                            {formatAUD(
                              Math.abs(
                                contributionSummary.concessionalRemaining,
                              ),
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="eyebrow mb-3">
                        Non-Concessional · After-tax
                      </p>
                      <Row
                        label="Personal After-Tax"
                        value={formatAUD(
                          contributionSummary.personalNonConcessional,
                        )}
                      />
                      <Row
                        label="Spouse Contribution"
                        value={formatAUD(
                          contributionSummary.spouseContribution,
                        )}
                      />
                      <Row
                        label="Total Non-Concessional"
                        value={formatAUD(
                          contributionSummary.totalNonConcessional,
                        )}
                        emphasis
                        border
                      />
                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
                          <span>
                            Cap ·{' '}
                            {formatAUD(contributionSummary.nonConcessionalCap)}
                          </span>
                          <span>
                            Remaining ·{' '}
                            {formatAUD(
                              contributionSummary.nonConcessionalRemaining,
                            )}
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden bg-muted rounded-[1px]">
                          <div
                            className={cn(
                              'h-full transition-all',
                              contributionSummary.nonConcessionalRemaining < 0
                                ? 'bg-destructive'
                                : 'bg-primary',
                            )}
                            style={{
                              width: `${Math.min(100, (contributionSummary.totalNonConcessional / contributionSummary.nonConcessionalCap) * 100)}%`,
                            }}
                          />
                        </div>
                        {contributionSummary.nonConcessionalRemaining < 0 && (
                          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-destructive">
                            Cap exceeded · 47% excess tax
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {contributionSummary.personalConcessional > 0 && (
                    <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <Badge variant="accent">Tip</Badge>
                      <p className="text-[12px] leading-relaxed">
                        Your{' '}
                        {formatAUD(
                          contributionSummary.personalConcessional,
                        )}{' '}
                        in personal concessional contributions may be claimed
                        as a tax deduction. Submit Notice of Intent to your
                        super fund.
                      </p>
                    </div>
                  )}
                </SectionShell>
              )}

              {/* ATO Categories */}
              <SectionShell
                title="ATO Deductions"
                subtitle="D1–D10 · By category"
                icon={Receipt}
                delay={0.4}
              >
                <div className="grid gap-2 md:grid-cols-2">
                  {Object.entries(atoCategoryDescriptions).map(
                    ([code, info]) => {
                      const amount = categoryAmounts.get(code) || 0;
                      const active = amount > 0;
                      return (
                        <div
                          key={code}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                            active
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border bg-muted/20',
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-7 w-9 items-center justify-center rounded-lg font-mono text-[11px] font-semibold',
                              active
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-[--text-subtle]',
                            )}
                          >
                            {code}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium">
                              {info.name}
                            </p>
                            <p className="line-clamp-2 text-[11px] text-muted-foreground">
                              {info.description}
                            </p>
                          </div>
                          <p
                            className={cn(
                              'font-mono text-[12px] tabular-nums font-medium',
                              active ? 'text-primary' : 'text-[--text-subtle]',
                            )}
                          >
                            {formatAUD(amount)}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>
              </SectionShell>

              {/* Empty State */}
              {deductionsSummary.totalCount === 0 &&
                capitalGainsData.totalGains === 0 &&
                capitalGainsData.totalLosses === 0 && (
                  <section className="rounded-lg border border-border/80 fintech-panel px-5 py-16 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/40">
                      <Calculator
                        className="h-5 w-5 text-[--text-subtle]"
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="font-display text-lg tracking-tight">
                      No tax-related transactions
                    </p>
                    <p className="mx-auto mt-2 max-w-xs text-[13px] text-muted-foreground">
                      Mark transactions as tax deductible to track them here.
                    </p>
                  </section>
                )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

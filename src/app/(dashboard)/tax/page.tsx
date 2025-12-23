'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  TrendingDown,
  Receipt,
  Loader2,
  Landmark,
  Banknote,
} from 'lucide-react';
import { getCurrentFinancialYear, formatFinancialYear } from '@/lib/utils/financial-year';
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
import { toast } from 'sonner';

export default function TaxPage() {
  const [selectedFY, setSelectedFY] = useState(getCurrentFinancialYear());

  const { years, isLoading: yearsLoading } = useAvailableFinancialYears();
  const { summary: deductionsSummary, isLoading: deductionsLoading } = useDeductionsSummary(selectedFY);
  const { data: capitalGainsData, isLoading: cgtLoading } = useCapitalGains(selectedFY);
  const { summary: incomeSummary, isLoading: incomeLoading } = useIncomeSummary(selectedFY);
  const { summary: frankingSummary, isLoading: frankingLoading } = useFrankingSummary(selectedFY);
  const { summary: contributionSummary, isLoading: superLoading } = useContributionSummary(selectedFY);

  const isLoading =
    yearsLoading || deductionsLoading || cgtLoading || incomeLoading || frankingLoading || superLoading;

  // Create a map of ATO category amounts
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
        nonConcessionalCapRemaining: contributionSummary.nonConcessionalRemaining,
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
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
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Tax Overview</h2>
            <p className="text-sm text-muted-foreground">
              {formatFinancialYear(selectedFY)} - Australian Tax Year
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedFY} onValueChange={setSelectedFY}>
              <SelectTrigger className="w-[150px]">
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
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatAUD(incomeSummary.combinedIncome)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {incomeSummary.incomeCount} transactions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatAUD(deductionsSummary.totalDeductions)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {deductionsSummary.totalCount} items
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">GST Claimed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatAUD(deductionsSummary.totalGst)}
                  </div>
                  <p className="text-xs text-muted-foreground">For BAS (if applicable)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Net Capital Gain</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      'text-2xl font-bold',
                      capitalGainsData.netCapitalGain >= 0 ? 'text-amber-600' : 'text-green-600'
                    )}
                  >
                    {formatAUD(Math.abs(capitalGainsData.netCapitalGain))}
                    {capitalGainsData.netCapitalGain < 0 && (
                      <span className="text-sm ml-1">(loss)</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">After 50% CGT discount</p>
                </CardContent>
              </Card>
            </div>

            {/* Capital Gains Breakdown */}
            {(capitalGainsData.totalGains > 0 || capitalGainsData.totalLosses > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Capital Gains Summary
                  </CardTitle>
                  <CardDescription>
                    Investment disposals during the financial year
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Short-term gains (&lt;12 months)</span>
                        <span className="font-medium text-amber-600">
                          {formatAUD(capitalGainsData.shortTermGains)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Long-term gains (12+ months)</span>
                        <span className="font-medium text-amber-600">
                          {formatAUD(capitalGainsData.longTermGains)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm text-muted-foreground">50% CGT discount applied</span>
                        <span className="font-medium text-green-600">
                          -{formatAUD(capitalGainsData.longTermGains - capitalGainsData.discountedLongTermGains)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total gains</span>
                        <span className="font-medium text-amber-600">
                          {formatAUD(capitalGainsData.totalGains)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total losses</span>
                        <span className="font-medium text-green-600">
                          -{formatAUD(capitalGainsData.totalLosses)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm font-medium">Net taxable gain</span>
                        <span
                          className={cn(
                            'font-bold',
                            capitalGainsData.netCapitalGain >= 0 ? 'text-amber-600' : 'text-green-600'
                          )}
                        >
                          {formatAUD(capitalGainsData.netCapitalGain)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Franking Credits Section */}
            {frankingSummary.totalFrankingCredits > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Franking Credits (Dividend Imputation)
                  </CardTitle>
                  <CardDescription>
                    Tax offset from franked dividends - reduces your tax payable
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Summary */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Cash dividends received</span>
                        <span className="font-medium">{formatAUD(frankingSummary.totalDividends)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Franking credits</span>
                        <span className="font-medium text-green-600">
                          +{formatAUD(frankingSummary.totalFrankingCredits)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm font-medium">Grossed-up dividend income</span>
                        <span className="font-bold">{formatAUD(frankingSummary.totalGrossedUpDividends)}</span>
                      </div>
                    </div>

                    {/* Tax Offset */}
                    <div className="space-y-4">
                      <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          Tax Offset Available
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatAUD(frankingSummary.totalFrankingCredits)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Reduces your tax payable dollar-for-dollar
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Holdings Breakdown */}
                  {frankingSummary.byHolding.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-3">By Holding</h4>
                      <div className="space-y-2">
                        {frankingSummary.byHolding.map((h) => (
                          <div
                            key={h.holdingId}
                            className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{h.symbol}</span>
                              <span className="text-xs text-muted-foreground">
                                {h.transactionCount} {h.transactionCount === 1 ? 'dividend' : 'dividends'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">{formatAUD(h.dividends)}</span>
                              <span className="text-green-600 font-medium">
                                +{formatAUD(h.frankingCredits)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tax Tip */}
                  <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm">
                      <span className="font-medium">ATO Note:</span> Report the grossed-up dividend amount
                      ({formatAUD(frankingSummary.totalGrossedUpDividends)}) as assessable income. The franking
                      credit ({formatAUD(frankingSummary.totalFrankingCredits)}) is claimed as a tax offset.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Superannuation Contributions */}
            {(contributionSummary.totalConcessional > 0 || contributionSummary.totalNonConcessional > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="h-5 w-5" />
                    Superannuation Contributions
                  </CardTitle>
                  <CardDescription>
                    Contribution cap tracking for tax planning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Concessional Contributions */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Concessional (Tax-Deductible)</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Employer SG</span>
                          <span className="font-medium">{formatAUD(contributionSummary.employerSG)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Salary Sacrifice</span>
                          <span className="font-medium">{formatAUD(contributionSummary.salarySacrifice)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Personal Deductible</span>
                          <span className="font-medium">{formatAUD(contributionSummary.personalConcessional)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t pt-2">
                          <span className="font-medium">Total Concessional</span>
                          <span className="font-bold">{formatAUD(contributionSummary.totalConcessional)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Cap: {formatAUD(contributionSummary.concessionalCap)}</span>
                          <span>Remaining: {formatAUD(contributionSummary.concessionalRemaining)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all',
                              contributionSummary.concessionalRemaining < 0 ? 'bg-destructive' : 'bg-primary'
                            )}
                            style={{
                              width: `${Math.min(100, (contributionSummary.totalConcessional / contributionSummary.concessionalCap) * 100)}%`,
                            }}
                          />
                        </div>
                        {contributionSummary.concessionalRemaining < 0 && (
                          <p className="text-xs text-destructive font-medium">
                            Cap exceeded by {formatAUD(Math.abs(contributionSummary.concessionalRemaining))} - excess taxed at marginal rate
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Non-Concessional Contributions */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Non-Concessional (After-Tax)</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Personal After-Tax</span>
                          <span className="font-medium">{formatAUD(contributionSummary.personalNonConcessional)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Spouse Contribution</span>
                          <span className="font-medium">{formatAUD(contributionSummary.spouseContribution)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t pt-2">
                          <span className="font-medium">Total Non-Concessional</span>
                          <span className="font-bold">{formatAUD(contributionSummary.totalNonConcessional)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Cap: {formatAUD(contributionSummary.nonConcessionalCap)}</span>
                          <span>Remaining: {formatAUD(contributionSummary.nonConcessionalRemaining)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all',
                              contributionSummary.nonConcessionalRemaining < 0 ? 'bg-destructive' : 'bg-primary'
                            )}
                            style={{
                              width: `${Math.min(100, (contributionSummary.totalNonConcessional / contributionSummary.nonConcessionalCap) * 100)}%`,
                            }}
                          />
                        </div>
                        {contributionSummary.nonConcessionalRemaining < 0 && (
                          <p className="text-xs text-destructive font-medium">
                            Cap exceeded - excess contributions taxed at 47%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tax Tip */}
                  {contributionSummary.personalConcessional > 0 && (
                    <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-sm">
                        <span className="font-medium">Tax Tip:</span> Your {formatAUD(contributionSummary.personalConcessional)} in personal concessional contributions may be claimed as a tax deduction. Ensure you&apos;ve submitted a Notice of Intent to your super fund.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ATO Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  ATO Deduction Categories (D1-D10)
                </CardTitle>
                <CardDescription>
                  Work-related and other deductions by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(atoCategoryDescriptions).map(([code, info]) => {
                    const amount = categoryAmounts.get(code) || 0;
                    return (
                      <div
                        key={code}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border',
                          amount > 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                        )}
                      >
                        <div
                          className={cn(
                            'flex items-center justify-center h-8 w-8 rounded text-xs font-bold',
                            amount > 0
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {code}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{info.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {info.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              'font-semibold text-sm',
                              amount > 0 ? 'text-primary' : 'text-muted-foreground'
                            )}
                          >
                            {formatAUD(amount)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Empty State */}
            {deductionsSummary.totalCount === 0 &&
              capitalGainsData.totalGains === 0 &&
              capitalGainsData.totalLosses === 0 && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-4" />
                      <p>No tax-related transactions yet</p>
                      <p className="text-sm mt-1">
                        Mark transactions as tax deductible to track them here
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
          </>
        )}
      </div>
    </>
  );
}

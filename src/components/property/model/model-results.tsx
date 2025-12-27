"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { PropertyCalculatedResults, PropertyAssumptions } from "@/types";
import { formatAUD, formatPercentValue } from "@/lib/utils/currency";
import {
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Calculator,
} from "lucide-react";
import { FormulaTooltip, PropertyFormulas } from "./formula-tooltip";
import { EditableValue } from "@/components/ui/editable-value";

interface ModelResultsProps {
  results: PropertyCalculatedResults | undefined;
  assumptions?: PropertyAssumptions;
  onAssumptionsChange?: (assumptions: PropertyAssumptions) => void;
  purchasePrice?: number;
}

export function ModelResults({
  results,
  assumptions,
  onAssumptionsChange,
  purchasePrice,
}: ModelResultsProps) {
  if (!results) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Enter property details to see calculations
          </p>
        </CardContent>
      </Card>
    );
  }

  const isEditable = !!assumptions && !!onAssumptionsChange;
  const price = purchasePrice || assumptions?.purchasePrice || 0;

  // Update expense helper
  const updateExpense = (field: keyof PropertyAssumptions, annualValue: number) => {
    if (assumptions && onAssumptionsChange) {
      onAssumptionsChange({ ...assumptions, [field]: annualValue });
    }
  };

  return (
    <div className="space-y-4">
      {/* Investment Summary Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Investment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Capital Required */}
            <SummaryMetric
              icon={<Wallet className="h-4 w-4" />}
              label="Capital Required"
              value={formatAUD(results.totalCapitalRequired)}
            />

            {/* Gross Yield Range */}
            <SummaryMetric
              icon={<Percent className="h-4 w-4" />}
              label="Gross Yield"
              value={`${formatPercentValue(results.grossYieldLow)} - ${formatPercentValue(results.grossYieldHigh)}`}
              formula={PropertyFormulas.grossYield.formula}
              detailedFormula={PropertyFormulas.grossYield.getDetailed(
                formatAUD(results.annualRentalIncomeLow),
                formatAUD(price),
                formatPercentValue(results.grossYieldLow)
              )}
            />

            {/* Net Yield Range */}
            <SummaryMetric
              icon={<TrendingUp className="h-4 w-4" />}
              label="Net Yield"
              value={`${formatPercentValue(results.netYieldLow)} - ${formatPercentValue(results.netYieldHigh)}`}
              formula={PropertyFormulas.netYield.formula}
              detailedFormula={PropertyFormulas.netYield.getDetailed(
                formatAUD(results.annualRentalIncomeAfterVacancyLow),
                formatAUD(results.totalAnnualExpenses),
                formatAUD(price),
                formatPercentValue(results.netYieldLow)
              )}
            />

            {/* Weekly Cashflow */}
            <SummaryMetric
              icon={<DollarSign className="h-4 w-4" />}
              label="Weekly Cashflow"
              value={formatAUD(results.cashflowAfterTaxWeeklyLow)}
              valueClassName={
                results.cashflowAfterTaxWeeklyLow >= 0
                  ? "text-success"
                  : "text-destructive"
              }
            />

            {/* Cash-on-Cash Return */}
            <SummaryMetric
              icon={<PiggyBank className="h-4 w-4" />}
              label="Cash-on-Cash"
              value={`${formatPercentValue(results.cashOnCashReturnLow)} - ${formatPercentValue(results.cashOnCashReturnHigh)}`}
              formula={PropertyFormulas.cashOnCash.formula}
              detailedFormula={PropertyFormulas.cashOnCash.getDetailed(
                formatAUD(results.cashflowAfterTaxAnnuallyLow),
                formatAUD(results.totalCapitalRequired),
                formatPercentValue(results.cashOnCashReturnLow)
              )}
            />

            {/* Gearing Status */}
            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background/50">
              <span className="text-xs text-muted-foreground mb-1">Status</span>
              <Badge
                variant={
                  results.cashflowAfterTaxAnnuallyLow >= 0
                    ? "default"
                    : "secondary"
                }
                className={
                  results.cashflowAfterTaxAnnuallyLow >= 0
                    ? "bg-success/20 text-success hover:bg-success/30"
                    : "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30"
                }
              >
                {results.cashflowAfterTaxAnnuallyLow >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Positively Geared
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Negatively Geared
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capital Required */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Capital Required</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Deposit</TableCell>
                <TableCell className="text-right font-medium">
                  {formatAUD(results.depositAmount)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Stamp Duty</TableCell>
                <TableCell className="text-right font-medium">
                  {formatAUD(results.stampDuty)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Legal Fees</TableCell>
                <TableCell className="text-right font-medium">
                  {formatAUD(results.legalFees)}
                </TableCell>
              </TableRow>
              {results.lmiAmount > 0 && (
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      LMI
                      <FormulaTooltip
                        formula={PropertyFormulas.lvr.formula}
                        detailedFormula={PropertyFormulas.lvr.getDetailed(
                          formatAUD(results.loanAmountPostLMI),
                          formatAUD(price),
                          formatPercentValue(results.lvr)
                        )}
                      >
                        <Badge variant="outline" className="text-xs cursor-help">
                          LVR {formatPercentValue(results.lvr)}
                        </Badge>
                      </FormulaTooltip>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAUD(results.lmiAmount)}
                  </TableCell>
                </TableRow>
              )}
              {results.otherCosts > 0 && (
                <TableRow>
                  <TableCell>Other Costs</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAUD(results.otherCosts)}
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="border-t-2">
                <TableCell className="font-semibold">
                  Total Capital Required
                </TableCell>
                <TableCell className="text-right font-bold text-lg">
                  {formatAUD(results.totalCapitalRequired)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Yield on Purchase */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Yield on Purchase</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead className="text-right">Lower Rent</TableHead>
                <TableHead className="text-right">Higher Rent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <FormulaTooltip
                    formula={PropertyFormulas.grossYield.formula}
                    detailedFormula={PropertyFormulas.grossYield.getDetailed(
                      formatAUD(results.annualRentalIncomeLow),
                      formatAUD(price),
                      formatPercentValue(results.grossYieldLow)
                    )}
                  >
                    <span className="cursor-help">Gross Yield</span>
                  </FormulaTooltip>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatPercentValue(results.grossYieldLow)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatPercentValue(results.grossYieldHigh)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <FormulaTooltip
                    formula={PropertyFormulas.netYield.formula}
                    detailedFormula={PropertyFormulas.netYield.getDetailed(
                      formatAUD(results.annualRentalIncomeAfterVacancyLow),
                      formatAUD(results.totalAnnualExpenses),
                      formatAUD(price),
                      formatPercentValue(results.netYieldLow)
                    )}
                  >
                    <span className="cursor-help">Net Yield</span>
                  </FormulaTooltip>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatPercentValue(results.netYieldLow)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatPercentValue(results.netYieldHigh)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Estimated Expenses - Editable */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Estimated Expenses</span>
            {isEditable && (
              <span className="text-xs text-muted-foreground font-normal">
                Click values to edit
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead className="text-right">
                  <FormulaTooltip
                    formula={PropertyFormulas.weekly.formula}
                    detailedFormula="Value shown is Annual amount divided by 52 weeks"
                  >
                    <span className="cursor-help">Weekly</span>
                  </FormulaTooltip>
                </TableHead>
                <TableHead className="text-right">
                  <FormulaTooltip
                    formula={PropertyFormulas.monthly.formula}
                    detailedFormula="Value shown is Annual amount divided by 12 months"
                  >
                    <span className="cursor-help">Monthly</span>
                  </FormulaTooltip>
                </TableHead>
                <TableHead className="text-right">Annually</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Council Rates */}
              {(results.expensesBreakdown["council-rates"] > 0 ||
                isEditable) && (
                <ExpenseRow
                  label="Council Rates"
                  annualAmount={results.expensesBreakdown["council-rates"] || 0}
                  isEditable={isEditable}
                  onAnnualChange={(val) => updateExpense("councilRatesAnnual", val)}
                />
              )}

              {/* Water Rates */}
              {(results.expensesBreakdown["water-rates"] > 0 || isEditable) && (
                <ExpenseRow
                  label="Water Rates"
                  annualAmount={results.expensesBreakdown["water-rates"] || 0}
                  isEditable={isEditable}
                  onAnnualChange={(val) => updateExpense("waterRatesAnnual", val)}
                />
              )}

              {/* Strata Fees */}
              {(results.expensesBreakdown["strata-fees"] > 0 || isEditable) && (
                <ExpenseRow
                  label="Strata Fees"
                  annualAmount={results.expensesBreakdown["strata-fees"] || 0}
                  isEditable={isEditable}
                  onAnnualChange={(val) => updateExpense("strataFeesAnnual", val)}
                />
              )}

              {/* Building Insurance */}
              {(results.expensesBreakdown["building-insurance"] > 0 ||
                isEditable) && (
                <ExpenseRow
                  label="Building Insurance"
                  annualAmount={results.expensesBreakdown["building-insurance"] || 0}
                  isEditable={isEditable}
                  onAnnualChange={(val) =>
                    updateExpense("buildingInsuranceAnnual", val)
                  }
                />
              )}

              {/* Landlord Insurance */}
              {(results.expensesBreakdown["landlord-insurance"] > 0 ||
                isEditable) && (
                <ExpenseRow
                  label="Landlord Insurance"
                  annualAmount={results.expensesBreakdown["landlord-insurance"] || 0}
                  isEditable={isEditable}
                  onAnnualChange={(val) =>
                    updateExpense("landlordInsuranceAnnual", val)
                  }
                />
              )}

              {/* Property Management */}
              {results.expensesBreakdown["property-management"] > 0 && (
                <ExpenseRow
                  label="Property Management"
                  annualAmount={results.expensesBreakdown["property-management"]}
                  isEditable={false}
                  formula="Based on % of net rent"
                />
              )}

              {/* Maintenance */}
              {(results.expensesBreakdown["maintenance"] > 0 || isEditable) && (
                <ExpenseRow
                  label="Maintenance"
                  annualAmount={results.expensesBreakdown["maintenance"] || 0}
                  isEditable={isEditable}
                  onAnnualChange={(val) => updateExpense("maintenanceAnnual", val)}
                />
              )}

              {/* Pool Maintenance */}
              {results.expensesBreakdown["pool-maintenance"] > 0 && (
                <ExpenseRow
                  label="Pool Maintenance"
                  annualAmount={results.expensesBreakdown["pool-maintenance"]}
                  isEditable={isEditable}
                  onAnnualChange={(val) =>
                    updateExpense("poolMaintenanceAnnual", val)
                  }
                />
              )}

              {/* Bank Fees */}
              {results.expensesBreakdown["bank-fees"] > 0 && (
                <ExpenseRow
                  label="Bank Fees"
                  annualAmount={results.expensesBreakdown["bank-fees"]}
                  isEditable={isEditable}
                  onAnnualChange={(val) => updateExpense("bankFeesAnnual", val)}
                />
              )}

              {/* Interest Payments */}
              {results.expensesBreakdown["interest-payments"] > 0 && (
                <ExpenseRow
                  label="Interest Payments"
                  annualAmount={results.expensesBreakdown["interest-payments"]}
                  isEditable={false}
                  formula="Based on loan amount × interest rate"
                />
              )}

              {/* Total */}
              <TableRow className="border-t-2 font-semibold">
                <TableCell>Total Expenses</TableCell>
                <TableCell className="text-right">
                  {formatAUD(Math.round(results.totalAnnualExpenses / 52))}
                </TableCell>
                <TableCell className="text-right">
                  {formatAUD(Math.round(results.totalAnnualExpenses / 12))}
                </TableCell>
                <TableCell className="text-right">
                  {formatAUD(results.totalAnnualExpenses)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Income Comparables */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Income Comparables</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead className="text-right">Weekly</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead className="text-right">Annually</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Lower Rent</TableCell>
                <TableCell className="text-right">
                  {isEditable ? (
                    <EditableValue
                      value={assumptions?.weeklyRentLow || 0}
                      onChange={(val) => updateExpense("weeklyRentLow", val)}
                      type="currency"
                      formatter={(v) => formatAUD(v)}
                    />
                  ) : (
                    formatAUD(Math.round(results.annualRentalIncomeLow / 52))
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <FormulaTooltip
                    formula={PropertyFormulas.monthly.formula}
                    detailedFormula={PropertyFormulas.monthly.getDetailed(
                      formatAUD(results.annualRentalIncomeLow),
                      formatAUD(Math.round(results.annualRentalIncomeLow / 12))
                    )}
                  >
                    <span>{formatAUD(Math.round(results.annualRentalIncomeLow / 12))}</span>
                  </FormulaTooltip>
                </TableCell>
                <TableCell className="text-right">
                  <FormulaTooltip
                    formula={PropertyFormulas.annually.formula}
                    detailedFormula={PropertyFormulas.annually.getDetailed(
                      formatAUD(Math.round(results.annualRentalIncomeLow / 52)),
                      formatAUD(results.annualRentalIncomeLow)
                    )}
                  >
                    <span>{formatAUD(results.annualRentalIncomeLow)}</span>
                  </FormulaTooltip>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Higher Rent</TableCell>
                <TableCell className="text-right">
                  {isEditable ? (
                    <EditableValue
                      value={assumptions?.weeklyRentHigh || 0}
                      onChange={(val) => updateExpense("weeklyRentHigh", val)}
                      type="currency"
                      formatter={(v) => formatAUD(v)}
                    />
                  ) : (
                    formatAUD(Math.round(results.annualRentalIncomeHigh / 52))
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatAUD(Math.round(results.annualRentalIncomeHigh / 12))}
                </TableCell>
                <TableCell className="text-right">
                  {formatAUD(results.annualRentalIncomeHigh)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cashflow Before Tax */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Cashflow Before Tax</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead className="text-right">Weekly</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead className="text-right">Annually</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Lower Rent</TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.cashflowBeforeTaxWeeklyLow} />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.cashflowBeforeTaxMonthlyLow} />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.cashflowBeforeTaxAnnuallyLow} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Higher Rent</TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.cashflowBeforeTaxWeeklyHigh} />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.cashflowBeforeTaxMonthlyHigh} />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.cashflowBeforeTaxAnnuallyHigh} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Depreciation */}
      {results.estimatedDepreciation > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Depreciation (Year 1)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Estimated Depreciation</span>
              <span className="font-medium">
                {formatAUD(results.estimatedDepreciation)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Impact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Tax Benefit / Liability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead className="text-right">Lower Rent</TableHead>
                <TableHead className="text-right">Higher Rent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Taxable Income</TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.taxableIncomeLow} />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.taxableIncomeHigh} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <FormulaTooltip
                    formula={PropertyFormulas.taxBenefit.formula}
                    detailedFormula={
                      results.taxableIncomeLow < 0
                        ? PropertyFormulas.taxBenefit.getDetailed(
                            formatAUD(Math.abs(results.taxableIncomeLow)),
                            `${assumptions?.marginalTaxRate || 39}%`,
                            formatAUD(results.estimatedTaxBenefitLow)
                          )
                        : "Taxable Income × Marginal Rate"
                    }
                  >
                    <span className="cursor-help">
                      {results.taxableIncomeLow < 0
                        ? "Tax Refund (neg gearing)"
                        : "Tax Payable"}
                    </span>
                  </FormulaTooltip>
                </TableCell>
                <TableCell className="text-right">
                  <TaxValue amount={results.estimatedTaxBenefitLow} />
                </TableCell>
                <TableCell className="text-right">
                  <TaxValue amount={results.estimatedTaxBenefitHigh} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cashflow After Tax */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Cashflow After Tax
            {results.cashflowAfterTaxAnnuallyLow < 0 && (
              <Badge variant="secondary" className="text-amber-600">
                Negatively Geared
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead className="text-right">Weekly</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead className="text-right">Annually</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Lower Rent</TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.cashflowAfterTaxWeeklyLow} large />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.cashflowAfterTaxMonthlyLow} large />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.cashflowAfterTaxAnnuallyLow} large />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Higher Rent</TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.cashflowAfterTaxWeeklyHigh} large />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.cashflowAfterTaxMonthlyHigh} large />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue amount={results.cashflowAfterTaxAnnuallyHigh} large />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cash on Cash Return */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Cash-on-Cash Return</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <FormulaTooltip
              formula={PropertyFormulas.cashOnCash.formula}
              detailedFormula={PropertyFormulas.cashOnCash.getDetailed(
                formatAUD(results.cashflowAfterTaxAnnuallyLow),
                formatAUD(results.totalCapitalRequired),
                formatPercentValue(results.cashOnCashReturnLow)
              )}
              className="w-full"
            >
              <div className="text-center p-4 bg-muted/50 rounded-lg w-full">
                <p className="text-sm text-muted-foreground mb-1">Lower Rent</p>
                <p
                  className={`text-2xl font-bold ${
                    results.cashOnCashReturnLow >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {formatPercentValue(results.cashOnCashReturnLow)}
                </p>
              </div>
            </FormulaTooltip>
            <FormulaTooltip
              formula={PropertyFormulas.cashOnCash.formula}
              detailedFormula={PropertyFormulas.cashOnCash.getDetailed(
                formatAUD(results.cashflowAfterTaxAnnuallyHigh),
                formatAUD(results.totalCapitalRequired),
                formatPercentValue(results.cashOnCashReturnHigh)
              )}
              className="w-full"
            >
              <div className="text-center p-4 bg-muted/50 rounded-lg w-full">
                <p className="text-sm text-muted-foreground mb-1">Higher Rent</p>
                <p
                  className={`text-2xl font-bold ${
                    results.cashOnCashReturnHigh >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {formatPercentValue(results.cashOnCashReturnHigh)}
                </p>
              </div>
            </FormulaTooltip>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Summary metric component
interface SummaryMetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
  formula?: string;
  detailedFormula?: string;
}

function SummaryMetric({
  icon,
  label,
  value,
  valueClassName,
  formula,
  detailedFormula,
}: SummaryMetricProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background/50">
      <div className="flex items-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${valueClassName || ""}`}>
        {value}
      </span>
    </div>
  );

  if (formula && detailedFormula) {
    return (
      <FormulaTooltip formula={formula} detailedFormula={detailedFormula}>
        {content}
      </FormulaTooltip>
    );
  }

  return content;
}

// Expense row with editable values
interface ExpenseRowProps {
  label: string;
  annualAmount: number;
  isEditable: boolean;
  onAnnualChange?: (value: number) => void;
  formula?: string;
}

function ExpenseRow({
  label,
  annualAmount,
  isEditable,
  onAnnualChange,
  formula,
}: ExpenseRowProps) {
  const weekly = Math.round(annualAmount / 52);
  const monthly = Math.round(annualAmount / 12);

  return (
    <TableRow>
      <TableCell className="capitalize">
        {formula ? (
          <FormulaTooltip
            formula={formula}
            detailedFormula={formula}
          >
            <span className="cursor-help">{label}</span>
          </FormulaTooltip>
        ) : (
          label
        )}
      </TableCell>
      <TableCell className="text-right text-sm">
        {isEditable && onAnnualChange ? (
          <EditableValue
            value={weekly}
            onChange={(val) => onAnnualChange(val * 52)}
            type="currency"
            formatter={(v) => formatAUD(v)}
          />
        ) : (
          <FormulaTooltip
            formula={PropertyFormulas.weekly.formula}
            detailedFormula={PropertyFormulas.weekly.getDetailed(
              formatAUD(annualAmount),
              formatAUD(weekly)
            )}
          >
            <span>{formatAUD(weekly)}</span>
          </FormulaTooltip>
        )}
      </TableCell>
      <TableCell className="text-right text-sm">
        {isEditable && onAnnualChange ? (
          <EditableValue
            value={monthly}
            onChange={(val) => onAnnualChange(val * 12)}
            type="currency"
            formatter={(v) => formatAUD(v)}
          />
        ) : (
          <FormulaTooltip
            formula={PropertyFormulas.monthly.formula}
            detailedFormula={PropertyFormulas.monthly.getDetailed(
              formatAUD(annualAmount),
              formatAUD(monthly)
            )}
          >
            <span>{formatAUD(monthly)}</span>
          </FormulaTooltip>
        )}
      </TableCell>
      <TableCell className="text-right text-sm">
        {isEditable && onAnnualChange ? (
          <EditableValue
            value={annualAmount}
            onChange={onAnnualChange}
            type="currency"
            formatter={(v) => formatAUD(v)}
          />
        ) : (
          formatAUD(annualAmount)
        )}
      </TableCell>
    </TableRow>
  );
}

function CashflowValue({
  amount,
  large = false,
}: {
  amount: number;
  large?: boolean;
}) {
  const isNegative = amount < 0;
  const colorClass = isNegative ? "text-destructive" : "text-success";
  const sizeClass = large ? "font-bold" : "font-medium";

  return (
    <span className={`${colorClass} ${sizeClass}`}>{formatAUD(amount)}</span>
  );
}

function TaxValue({ amount }: { amount: number }) {
  const isRefund = amount > 0;
  const colorClass = isRefund ? "text-success" : "text-destructive";

  return (
    <span className={`${colorClass} font-medium`}>
      {isRefund ? "+" : ""}
      {formatAUD(Math.abs(amount))}
    </span>
  );
}

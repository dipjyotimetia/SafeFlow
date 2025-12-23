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
import { Separator } from "@/components/ui/separator";
import type { PropertyCalculatedResults } from "@/types";
import { formatAUD, formatPercent } from "@/lib/utils/currency";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface ModelResultsProps {
  results: PropertyCalculatedResults | undefined;
}

export function ModelResults({ results }: ModelResultsProps) {
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

  return (
    <div className="space-y-4">
      {/* Capital Required */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Capital Required
          </CardTitle>
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
                      <Badge variant="outline" className="text-xs">
                        LVR {formatPercent(results.lvr)}
                      </Badge>
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
                <TableCell>Gross Yield</TableCell>
                <TableCell className="text-right font-medium">
                  {formatPercent(results.grossYieldLow)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatPercent(results.grossYieldHigh)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Net Yield</TableCell>
                <TableCell className="text-right font-medium">
                  {formatPercent(results.netYieldLow)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatPercent(results.netYieldHigh)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Estimated Expenses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Estimated Expenses
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
              {Object.entries(results.expensesBreakdown).map(
                ([category, amount]) =>
                  amount > 0 && (
                    <TableRow key={category}>
                      <TableCell className="capitalize">
                        {category.replace(/-/g, " ")}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatAUD(Math.round(amount / 52))}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatAUD(Math.round(amount / 12))}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatAUD(amount)}
                      </TableCell>
                    </TableRow>
                  )
              )}
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
          <CardTitle className="text-sm font-medium">
            Income Comparables
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
                <TableCell>Lower Rent</TableCell>
                <TableCell className="text-right">
                  {formatAUD(Math.round(results.annualRentalIncomeLow / 52))}
                </TableCell>
                <TableCell className="text-right">
                  {formatAUD(Math.round(results.annualRentalIncomeLow / 12))}
                </TableCell>
                <TableCell className="text-right">
                  {formatAUD(results.annualRentalIncomeLow)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Higher Rent</TableCell>
                <TableCell className="text-right">
                  {formatAUD(Math.round(results.annualRentalIncomeHigh / 52))}
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
          <CardTitle className="text-sm font-medium">
            Cashflow Before Tax
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
              <span className="text-muted-foreground">
                Estimated Depreciation
              </span>
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
                  {results.taxableIncomeLow < 0
                    ? "Tax Refund (neg gearing)"
                    : "Tax Payable"}
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
                  <CashflowValue
                    amount={results.cashflowAfterTaxWeeklyLow}
                    large
                  />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue
                    amount={results.cashflowAfterTaxMonthlyLow}
                    large
                  />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue
                    amount={results.cashflowAfterTaxAnnuallyLow}
                    large
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Higher Rent</TableCell>
                <TableCell className="text-right">
                  <CashflowValue
                    amount={results.cashflowAfterTaxWeeklyHigh}
                    large
                  />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue
                    amount={results.cashflowAfterTaxMonthlyHigh}
                    large
                  />
                </TableCell>
                <TableCell className="text-right">
                  <CashflowValue
                    amount={results.cashflowAfterTaxAnnuallyHigh}
                    large
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cash on Cash Return */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Cash-on-Cash Return
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Lower Rent</p>
              <p
                className={`text-2xl font-bold ${
                  results.cashOnCashReturnLow >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatPercent(results.cashOnCashReturnLow)}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Higher Rent</p>
              <p
                className={`text-2xl font-bold ${
                  results.cashOnCashReturnHigh >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatPercent(results.cashOnCashReturnHigh)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
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
  const colorClass = isNegative ? "text-red-600" : "text-green-600";
  const sizeClass = large ? "font-bold" : "font-medium";

  return (
    <span className={`${colorClass} ${sizeClass}`}>{formatAUD(amount)}</span>
  );
}

function TaxValue({ amount }: { amount: number }) {
  const isRefund = amount > 0;
  const colorClass = isRefund ? "text-green-600" : "text-red-600";

  return (
    <span className={`${colorClass} font-medium`}>
      {isRefund ? "+" : ""}
      {formatAUD(Math.abs(amount))}
    </span>
  );
}

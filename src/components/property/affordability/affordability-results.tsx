"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatAUD } from "@/lib/utils/currency";
import {
  DSR_GREEN_MAX,
  DSR_AMBER_MAX,
  LSR_GREEN_MAX,
  LSR_AMBER_MAX,
} from "@/lib/utils/affordability";
import type { AffordabilityResults as AffordabilityResultsType } from "@/types";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface AffordabilityResultsProps {
  results: AffordabilityResultsType | null;
}

const statusIcons = {
  green: <CheckCircle className="h-6 w-6 text-green-500" />,
  amber: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
  red: <XCircle className="h-6 w-6 text-red-500" />,
};

const statusColors = {
  green: "bg-green-500",
  amber: "bg-yellow-500",
  red: "bg-red-500",
};

const statusBgColors = {
  green: "bg-green-50 border-green-200",
  amber: "bg-yellow-50 border-yellow-200",
  red: "bg-red-50 border-red-200",
};

export function AffordabilityResults({ results }: AffordabilityResultsProps) {
  if (!results) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Enter your income to see borrowing capacity
        </CardContent>
      </Card>
    );
  }

  const {
    maxBorrowingAmount,
    assessmentRate,
    debtServiceRatio,
    loanServiceRatio,
    dsrStatus,
    lsrStatus,
    monthlyGrossIncome,
    monthlyNetIncome,
    monthlyLivingExpenses,
    monthlyExistingDebtPayments,
    availableForHousing,
    proposedRepayment,
    surplus,
    rentalCoverageRatio,
    overallStatus,
    statusDescription,
  } = results;

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card className={`border-2 ${statusBgColors[overallStatus]}`}>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            {statusIcons[overallStatus]}
            <div className="flex-1">
              <p className="font-semibold">
                {overallStatus === "green"
                  ? "Loan Serviceable"
                  : overallStatus === "amber"
                  ? "Stretched Capacity"
                  : "May Not Be Serviceable"}
              </p>
              <p className="text-sm text-muted-foreground">{statusDescription}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Max Borrowing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Maximum Borrowing Capacity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {formatAUD(maxBorrowingAmount)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Assessed at {assessmentRate.toFixed(1)}% (including buffer)
          </p>
        </CardContent>
      </Card>

      {/* Serviceability Ratios */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Serviceability Ratios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* DSR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">
                Debt Service Ratio (DSR)
              </span>
              <Badge className={statusColors[dsrStatus]}>
                {debtServiceRatio.toFixed(1)}%
              </Badge>
            </div>
            <Progress
              value={Math.min(debtServiceRatio, 100)}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Target: &lt;{DSR_GREEN_MAX}%</span>
              <span>Limit: {DSR_AMBER_MAX}%</span>
            </div>
          </div>

          {/* LSR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">
                Loan Service Ratio (LSR)
              </span>
              <Badge className={statusColors[lsrStatus]}>
                {loanServiceRatio.toFixed(1)}%
              </Badge>
            </div>
            <Progress
              value={Math.min((loanServiceRatio / LSR_AMBER_MAX) * 100, 100)}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Target: &lt;{LSR_GREEN_MAX}%</span>
              <span>Limit: {LSR_AMBER_MAX}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Monthly Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Income</span>
              <span className="font-medium">{formatAUD(monthlyGrossIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Income (est.)</span>
              <span className="font-medium">{formatAUD(monthlyNetIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Living Expenses</span>
              <span className="font-medium text-red-500">
                -{formatAUD(monthlyLivingExpenses)}
              </span>
            </div>
            {monthlyExistingDebtPayments > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Existing Debts</span>
                <span className="font-medium text-red-500">
                  -{formatAUD(monthlyExistingDebtPayments)}
                </span>
              </div>
            )}
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="font-medium">Available for Housing</span>
                <span className="font-bold">{formatAUD(availableForHousing)}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proposed Repayment</span>
              <span className="font-medium text-red-500">
                -{formatAUD(proposedRepayment)}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="font-medium">Monthly Surplus/Shortfall</span>
                <span
                  className={`font-bold ${
                    surplus >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {surplus >= 0 ? "+" : ""}
                  {formatAUD(surplus)}
                </span>
              </div>
            </div>
            {rentalCoverageRatio !== undefined && (
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-medium">Rental Coverage Ratio</span>
                  <span
                    className={`font-bold ${
                      rentalCoverageRatio >= 1.3
                        ? "text-green-600"
                        : rentalCoverageRatio >= 1.0
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {rentalCoverageRatio.toFixed(2)}x
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {rentalCoverageRatio >= 1.3
                    ? "Excellent - rent covers interest with buffer"
                    : rentalCoverageRatio >= 1.0
                    ? "Adequate - rent covers interest payments"
                    : "Negative gearing - rent below interest"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

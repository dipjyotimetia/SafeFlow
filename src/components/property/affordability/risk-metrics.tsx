"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAUD } from "@/lib/utils/currency";
import type { RiskMetrics } from "@/types";
import { AlertTriangle, TrendingDown, Clock, Percent } from "lucide-react";

interface RiskMetricsCardProps {
  metrics: RiskMetrics;
  rentalCoverageRatio?: number;
}

export function RiskMetricsCard({
  metrics,
  rentalCoverageRatio,
}: RiskMetricsCardProps) {
  const {
    maxVacancyBeforeNegative,
    sensitivityPerPercent,
    bufferMonths,
    breakEvenRate,
  } = metrics;

  const getVacancyColor = (vacancy: number) => {
    if (vacancy >= 10) return "text-success";
    if (vacancy >= 5) return "text-yellow-600";
    return "text-destructive";
  };

  const getCoverageColor = (ratio: number) => {
    if (ratio >= 1.3) return "text-success";
    if (ratio >= 1.0) return "text-yellow-600";
    return "text-destructive";
  };

  const getBufferColor = (months: number) => {
    if (months >= 6) return "text-success";
    if (months >= 3) return "text-yellow-600";
    return "text-destructive";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Investment Risk Analysis
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Key risk metrics for this investment property
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Vacancy Tolerance */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Percent className="h-3 w-3" />
              Max Vacancy
            </div>
            <p className={`text-lg font-bold ${getVacancyColor(maxVacancyBeforeNegative)}`}>
              {maxVacancyBeforeNegative.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Before negative cashflow
            </p>
          </div>

          {/* Rate Sensitivity */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              Rate Sensitivity
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatAUD(sensitivityPerPercent)}
            </p>
            <p className="text-xs text-muted-foreground">
              Monthly impact per 1%
            </p>
          </div>

          {/* Buffer Months */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Buffer Months
            </div>
            <p className={`text-lg font-bold ${getBufferColor(bufferMonths)}`}>
              {bufferMonths}
            </p>
            <p className="text-xs text-muted-foreground">
              Months expenses covered
            </p>
          </div>

          {/* Break-even Rate */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Percent className="h-3 w-3" />
              Break-even Rate
            </div>
            <p className="text-lg font-bold text-foreground">
              {breakEvenRate.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Rate where cashflow = 0
            </p>
          </div>
        </div>

        {/* Rental Coverage Ratio */}
        {rentalCoverageRatio !== undefined && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium">Rental Coverage Ratio</span>
                <p className="text-xs text-muted-foreground">
                  Rent / Interest payments (target: &gt;1.3x)
                </p>
              </div>
              <span className={`text-xl font-bold ${getCoverageColor(rentalCoverageRatio)}`}>
                {rentalCoverageRatio.toFixed(2)}x
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-muted">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> These metrics help assess investment risk.
            Higher vacancy tolerance and coverage ratio indicate more resilient
            investments. Consider maintaining 3-6 months buffer for unexpected
            expenses or vacancy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

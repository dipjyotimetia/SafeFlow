"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAUD } from "@/lib/utils/currency";
import type { YieldCalculatorResults } from "@/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface YieldResultsProps {
  results: YieldCalculatorResults | null;
}

const assessmentColors = {
  excellent: "bg-green-500",
  good: "bg-blue-500",
  fair: "bg-yellow-500",
  poor: "bg-red-500",
};

const assessmentDescriptions = {
  excellent: "Excellent yield - strong investment potential",
  good: "Good yield - solid investment",
  fair: "Fair yield - consider other factors",
  poor: "Below average yield - may need negotiation",
};

export function YieldResults({ results }: YieldResultsProps) {
  if (!results) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Enter property value and rent to see yield calculations
        </CardContent>
      </Card>
    );
  }

  const { grossYield, netYield, assessment, annualRent, annualExpenses, netOperatingIncome } = results;

  const getYieldIcon = (yieldValue: number) => {
    if (yieldValue >= 5) return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (yieldValue >= 4) return <Minus className="h-5 w-5 text-yellow-500" />;
    return <TrendingDown className="h-5 w-5 text-red-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Main Yield Display */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Rental Yield</CardTitle>
            <Badge className={assessmentColors[assessment.category]}>
              {assessment.category.charAt(0).toUpperCase() +
                assessment.category.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Gross Yield */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Gross Yield</p>
              <div className="flex items-center gap-2">
                {getYieldIcon(grossYield)}
                <span className="text-3xl font-bold">{grossYield.toFixed(2)}%</span>
              </div>
            </div>

            {/* Net Yield */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Net Yield</p>
              <div className="flex items-center gap-2">
                {getYieldIcon(netYield)}
                <span className="text-3xl font-bold">{netYield.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {assessmentDescriptions[assessment.category]}
          </p>
        </CardContent>
      </Card>

      {/* Income Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Income Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Annual Rental Income</span>
              <span className="font-medium">{formatAUD(annualRent)}</span>
            </div>
            {annualExpenses > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Annual Expenses</span>
                  <span className="font-medium text-red-500">
                    -{formatAUD(annualExpenses)}
                  </span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Net Operating Income</span>
                    <span className="font-bold">{formatAUD(netOperatingIncome)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Yield Benchmarks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Yield Benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>&gt; 6% - Excellent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span>5% - 6% - Good</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span>4% - 5% - Fair</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span>&lt; 4% - Below Average</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

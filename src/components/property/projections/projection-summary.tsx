"use client";

/**
 * Projection Summary Component
 *
 * Displays key metrics from property projections in a compact format.
 */

import { TrendingUp, TrendingDown, Calendar, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAUD } from "@/lib/utils/currency";
import type { ProjectionSummary as ProjectionSummaryType } from "@/lib/utils/property-projections";
import { cn } from "@/lib/utils";

// ============ Types ============

interface ProjectionSummaryProps {
  projection: ProjectionSummaryType;
  className?: string;
}

interface ProjectionMetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

// ============ Components ============

function ProjectionMetricCard({
  title,
  value,
  subValue,
  icon,
  trend,
  className,
}: ProjectionMetricCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend && trend !== "neutral" && (
            <span
              className={cn(
                "flex items-center text-xs",
                trend === "up" ? "text-success" : "text-destructive"
              )}
            >
              {trend === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectionSummary({
  projection,
  className,
}: ProjectionSummaryProps) {
  const { projections, inputs, year10, year20, totalCashflowAfterTax, averageAnnualReturn, totalEquityBuilt } = projection;

  if (projections.length === 0) {
    return (
      <div className={cn("text-center text-muted-foreground py-8", className)}>
        No projection data available
      </div>
    );
  }

  const firstYear = projections[0];
  const finalYear = projections[projections.length - 1];
  const years = projections.length;

  // Calculate growth metrics
  const initialValue = inputs.currentValue;
  const finalValue = finalYear.propertyValue;
  const totalGrowthPercent =
    initialValue > 0
      ? ((finalValue - initialValue) / initialValue) * 100
      : 0;

  // Find year when cashflow turns positive
  const positiveGearingYear = projections.find(
    (p) => p.annualCashflowBeforeTax > 0
  )?.year;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ProjectionMetricCard
          title="Final Property Value"
          value={formatAUD(finalValue)}
          subValue={`+${totalGrowthPercent.toFixed(1)}% growth`}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
        <ProjectionMetricCard
          title="Final Equity"
          value={formatAUD(finalYear.equity)}
          subValue={`From ${formatAUD(firstYear.equity)}`}
          icon={<Wallet className="h-4 w-4" />}
          trend="up"
        />
        <ProjectionMetricCard
          title="Total Equity Built"
          value={formatAUD(totalEquityBuilt)}
          subValue={`Over ${years} years`}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
        <ProjectionMetricCard
          title="Net Cashflow"
          value={formatAUD(totalCashflowAfterTax)}
          subValue={totalCashflowAfterTax >= 0 ? "Net positive" : "Net negative"}
          icon={<Wallet className="h-4 w-4" />}
          trend={totalCashflowAfterTax >= 0 ? "up" : "down"}
        />
      </div>

      {/* Additional Insights */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Projection Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Positive Gearing Year */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Positive Gearing</p>
                <p className="text-xs text-muted-foreground">
                  {positiveGearingYear
                    ? `Year ${positiveGearingYear}`
                    : "Not within projection period"}
                </p>
              </div>
            </div>

            {/* LVR Reduction */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingDown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">LVR Reduction</p>
                <p className="text-xs text-muted-foreground">
                  {firstYear.lvr.toFixed(1)}% → {finalYear.lvr.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Average Annual Return */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Avg Annual Return</p>
                <p className="text-xs text-muted-foreground">
                  {averageAnnualReturn.toFixed(1)}% p.a.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Milestones */}
      {(year10 || year20) && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Key Milestones</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {year10 && (
                <div className="rounded-lg border p-4">
                  <Badge variant="outline" className="mb-2">Year 10</Badge>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value</span>
                      <span className="font-medium">{formatAUD(year10.propertyValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Equity</span>
                      <span className="font-medium">{formatAUD(year10.equity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LVR</span>
                      <span className="font-medium">{(100 - year10.equityRatio).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
              {year20 && (
                <div className="rounded-lg border p-4">
                  <Badge variant="outline" className="mb-2">Year 20</Badge>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value</span>
                      <span className="font-medium">{formatAUD(year20.propertyValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Equity</span>
                      <span className="font-medium">{formatAUD(year20.equity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LVR</span>
                      <span className="font-medium">{(100 - year20.equityRatio).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Year-by-Year Breakdown (Condensed) */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Year-by-Year Snapshot</CardTitle>
            <Badge variant="outline">{years} years</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Year</th>
                  <th className="pb-2 pr-4 text-right">Value</th>
                  <th className="pb-2 pr-4 text-right">Equity</th>
                  <th className="pb-2 pr-4 text-right">LVR</th>
                  <th className="pb-2 text-right">Cashflow</th>
                </tr>
              </thead>
              <tbody>
                {projections
                  .filter((_, i) => i % 5 === 0 || i === projections.length - 1)
                  .map((p) => (
                    <tr key={p.year} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">Y{p.year}</td>
                      <td className="py-2 pr-4 text-right">
                        {formatAUD(p.propertyValue)}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {formatAUD(p.equity)}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {p.lvr.toFixed(1)}%
                      </td>
                      <td
                        className={cn(
                          "py-2 text-right",
                          p.annualCashflowBeforeTax >= 0
                            ? "text-success"
                            : "text-destructive"
                        )}
                      >
                        {formatAUD(p.annualCashflowBeforeTax)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

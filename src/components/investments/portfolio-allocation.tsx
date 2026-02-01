"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHoldingsByType, usePortfolioSummary } from "@/hooks";
import { CHART_COLORS } from "@/lib/charts/config";
import { useChartAccessibility, useChartAnimations } from "@/lib/charts/hooks";
import { formatAUD } from "@/lib/utils/currency";
import type { HoldingType } from "@/types";
import { BarChart3, Bitcoin, Building2, Landmark } from "lucide-react";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const TYPE_LABELS: Record<HoldingType, string> = {
  etf: "ETFs",
  stock: "Stocks",
  crypto: "Crypto",
  "managed-fund": "Managed Funds",
};

const TYPE_ICONS: Record<HoldingType, React.ReactNode> = {
  etf: <BarChart3 className="h-3 w-3" />,
  stock: <Building2 className="h-3 w-3" />,
  crypto: <Bitcoin className="h-3 w-3" />,
  "managed-fund": <Landmark className="h-3 w-3" />,
};

interface ChartDataItem {
  type: HoldingType;
  label: string;
  value: number; // dollars
  valueCents: number;
  fill: string;
  percentage: number;
  holdingCount: number;
  [key: string]: string | number;
}

// Tooltip component defined outside to avoid recreating during render
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataItem }>;
}) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-xl min-w-40">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: item.fill }}
          />
          <p className="font-semibold text-sm">{item.label}</p>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold tabular-nums">
            {formatAUD(item.valueCents)}
          </p>
          <p className="text-sm text-primary font-medium">
            {item.percentage.toFixed(1)}% of portfolio
          </p>
          <p className="text-xs text-muted-foreground">
            {item.holdingCount} holding{item.holdingCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function PortfolioAllocation() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { grouped, isLoading: isGroupedLoading } = useHoldingsByType();
  const { summary, isLoading: isSummaryLoading } = usePortfolioSummary();
  const accessibilityProps = useChartAccessibility(
    "Portfolio allocation by investment type",
    "Distribution of investments across different asset classes",
  );

  const isLoading = isGroupedLoading || isSummaryLoading;

  const chartData = useMemo(() => {
    const data: ChartDataItem[] = [];
    const total = summary.totalValue;

    const types: HoldingType[] = ["etf", "stock", "crypto", "managed-fund"];

    for (const type of types) {
      const group = grouped[type];
      if (group.totalValue > 0) {
        data.push({
          type,
          label: TYPE_LABELS[type],
          value: group.totalValue / 100,
          valueCents: group.totalValue,
          fill: CHART_COLORS.investment[type],
          percentage: total > 0 ? (group.totalValue / total) * 100 : 0,
          holdingCount: group.holdings.length,
        });
      }
    }

    // Sort by value descending
    data.sort((a, b) => b.valueCents - a.valueCents);

    return data;
  }, [grouped, summary.totalValue]);

  const animationConfig = useChartAnimations(chartData.length);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <Skeleton className="h-[160px] w-[160px] rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No holdings to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer
              width="100%"
              height={200}
              {...accessibilityProps}
            >
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={activeIndex !== null ? 80 : 75}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="label"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  isAnimationActive={animationConfig.isAnimationActive}
                  animationDuration={animationConfig.animationDuration}
                  animationEasing={animationConfig.animationEasing}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      style={{
                        cursor: "pointer",
                        transition: "all 0.2s ease-out",
                        opacity:
                          activeIndex === null || activeIndex === index
                            ? 1
                            : 0.5,
                        transform:
                          activeIndex === index ? "scale(1.05)" : "scale(1)",
                        transformOrigin: "center",
                        filter:
                          activeIndex === index
                            ? "drop-shadow(0 4px 6px rgba(0,0,0,0.15))"
                            : "none",
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label showing total */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center bg-card/50 backdrop-blur-[2px] rounded-full p-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Total
                </p>
                <p className="text-sm font-bold tabular-nums">
                  {formatAUD(summary.totalValue)}
                </p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs px-2 pt-4">
            {chartData.map((entry, index) => (
              <div
                key={entry.type}
                className={`flex items-center justify-between gap-2 transition-opacity duration-200 ${
                  activeIndex === null || activeIndex === index
                    ? "opacity-100"
                    : "opacity-50"
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                style={{ cursor: "pointer" }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {TYPE_ICONS[entry.type]}
                    <span className="truncate">{entry.label}</span>
                  </span>
                </div>
                <span className="font-medium text-foreground flex-shrink-0">
                  {entry.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

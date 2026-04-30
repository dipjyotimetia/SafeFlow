"use client";

import { CHART_COLORS } from "@/lib/charts/config";
import {
  useChartAccessibility,
  useChartAnimations,
  useResponsiveHeight,
} from "@/lib/charts/hooks";
import { formatAUD } from "@/lib/utils/currency";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface CategoryData {
  categoryId: string;
  categoryName: string;
  amount: number;
  color?: string;
}

interface CategoryPieChartProps {
  data: CategoryData[];
  maxCategories?: number;
  showLegend?: boolean;
  interactive?: boolean;
  ariaLabel?: string;
  height?: number;
}

interface ChartDataItem {
  categoryId: string;
  categoryName: string;
  amount: number;
  fill: string;
  percentage: number;
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
      <div className="bg-popover border border-border/80 rounded-lg p-3 min-w-[180px] animate-scale-in shadow-premium-lg">
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="h-1.5 w-1.5 rounded-[1px]"
            style={{ backgroundColor: item.fill }}
          />
          <p className="eyebrow">{item.categoryName}</p>
        </div>
        <p className="display-number text-2xl tabular-nums">
          {formatAUD(item.amount * 100)}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1 flex-1 bg-muted overflow-hidden rounded-[1px]">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.fill,
              }}
            />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
            {item.percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export function CategoryPieChart({
  data,
  maxCategories = 8,
  showLegend = true,
  interactive = true,
  ariaLabel = "Category spending breakdown",
  height = 300,
}: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const responsiveHeight = useResponsiveHeight(height);
  const accessibilityProps = useChartAccessibility(
    ariaLabel,
    `Spending breakdown across ${data.length} categories`,
  );

  // Calculate total for percentages
  const total = data.reduce((sum, d) => sum + d.amount, 0);

  // Convert cents to dollars and limit to configured max categories
  const chartData: ChartDataItem[] = data
    .slice(0, maxCategories)
    .map((d, index) => ({
      ...d,
      amount: d.amount / 100,
      fill:
        d.color || CHART_COLORS.category[index % CHART_COLORS.category.length],
      percentage: total > 0 ? (d.amount / total) * 100 : 0,
    }));

  const otherTotal = data
    .slice(maxCategories)
    .reduce((sum, d) => sum + d.amount, 0);
  if (otherTotal > 0) {
    chartData.push({
      categoryId: "other",
      categoryName: "Other",
      amount: otherTotal / 100,
      fill: "oklch(0.45 0.005 240)", // mono dim
      percentage: total > 0 ? (otherTotal / total) * 100 : 0,
    });
  }

  const animationConfig = useChartAnimations(chartData.length);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No spending data
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: responsiveHeight }}>
      <div className="flex-1 min-h-0 relative">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={180}
          minHeight={160}
          {...accessibilityProps}
        >
          <PieChart accessibilityLayer>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={activeIndex !== null ? 80 : 75}
              paddingAngle={2}
              dataKey="amount"
              nameKey="categoryName"
              onMouseEnter={
                interactive ? (_, index) => setActiveIndex(index) : undefined
              }
              onMouseLeave={
                interactive ? () => setActiveIndex(null) : undefined
              }
              isAnimationActive={animationConfig.isAnimationActive}
              animationDuration={animationConfig.animationDuration}
              animationEasing={animationConfig.animationEasing}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  stroke="var(--background)"
                  strokeWidth={1}
                  style={{
                    cursor: interactive ? "pointer" : "default",
                    transition: "opacity 0.18s ease-out",
                    opacity:
                      !interactive ||
                      activeIndex === null ||
                      activeIndex === index
                        ? 1
                        : 0.35,
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label showing total. */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="eyebrow">Total</p>
            <p className="mt-1 display-number text-xl tabular-nums">
              {formatAUD(total)}
            </p>
          </div>
        </div>
      </div>

      {/* Custom legend with percentages */}
      {showLegend && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-2 pt-3 max-h-[90px] overflow-y-auto">
          {chartData.map((entry, index) => (
            <div
              key={entry.categoryId}
              className={`flex items-center justify-between gap-2 py-0.5 px-1 transition-opacity duration-150 ${
                interactive ? "cursor-pointer" : ""
              } ${
                !interactive || activeIndex === null || activeIndex === index
                  ? "opacity-100"
                  : "opacity-40"
              }`}
              onMouseEnter={
                interactive ? () => setActiveIndex(index) : undefined
              }
              onMouseLeave={
                interactive ? () => setActiveIndex(null) : undefined
              }
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : -1}
              aria-label={
                interactive
                  ? `${entry.categoryName}: ${entry.percentage.toFixed(1)}%`
                  : undefined
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-1.5 w-1.5 rounded-[1px] shrink-0"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
                  {entry.categoryName}
                </span>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-foreground shrink-0">
                {entry.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

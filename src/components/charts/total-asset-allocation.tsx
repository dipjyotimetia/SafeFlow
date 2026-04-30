"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useChartAccessibility, useChartAnimations } from "@/lib/charts/hooks";
import { formatAUD } from "@/lib/utils/currency";
import type { AssetAllocationSlice } from "@/hooks/use-total-allocation";
import {
  Banknote,
  TrendingUp,
  Landmark,
  Building2,
  Layers,
  PieChart as PieChartIcon,
  Plus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const ASSET_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-3 w-3" />,
  investments: <TrendingUp className="h-3 w-3" />,
  superannuation: <Landmark className="h-3 w-3" />,
  property: <Building2 className="h-3 w-3" />,
  other: <Layers className="h-3 w-3" />,
};

// Tooltip component defined outside to avoid recreating during render
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: AssetAllocationSlice }>;
}) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border/50 rounded-lg p-4 shadow-premium-lg min-w-[200px] animate-scale-in">
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <p className="eyebrow-strong">{item.label}</p>
        </div>
        <p className="display-number text-2xl tabular-nums">
          {formatAUD(item.value)}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1 flex-1 bg-muted overflow-hidden rounded-[1px]">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
            {item.percentage.toFixed(1)}%
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {item.accountCount} {item.accountCount === 1 ? "account" : "accounts"}
        </p>
      </div>
    );
  }
  return null;
}

interface TotalAssetAllocationProps {
  slices: AssetAllocationSlice[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  isLoading: boolean;
}

export function TotalAssetAllocation({
  slices,
  totalAssets,
  totalLiabilities,
  netWorth,
  isLoading,
}: TotalAssetAllocationProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const accessibilityProps = useChartAccessibility(
    "Total asset allocation across all financial categories",
    "Distribution of wealth across cash, investments, superannuation, property, and other assets",
  );
  const animationConfig = useChartAnimations(slices.length);

  // Memoize chart data to avoid unnecessary recalculations
  const chartData = useMemo(() => slices, [slices]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <Skeleton className="h-[160px] w-[160px] rounded-full" />
        <div className="grid grid-cols-2 gap-2 w-full px-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40">
          <PieChartIcon
            className="h-4 w-4 text-[--text-subtle]"
            strokeWidth={1.5}
          />
        </div>
        <p className="font-display text-base tracking-tight text-foreground">
          No assets tracked
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Add accounts to see your full allocation.
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/accounts">
            <Button variant="outline" size="sm">
              <Wallet className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              Accounts
            </Button>
          </Link>
          <Link href="/investments">
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              Invest
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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
              dataKey="valueDollars"
              nameKey="label"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              isAnimationActive={animationConfig.isAnimationActive}
              animationDuration={animationConfig.animationDuration}
              animationEasing={animationConfig.animationEasing}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.key}`}
                  fill={entry.color}
                  stroke="var(--background)"
                  strokeWidth={1}
                  style={{
                    cursor: "pointer",
                    transition: "opacity 0.18s ease-out",
                    opacity:
                      activeIndex === null || activeIndex === index ? 1 : 0.35,
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label showing total assets */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="eyebrow">Total</p>
            <p className="mt-1 display-number text-lg tabular-nums">
              {formatAUD(totalAssets)}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-2 pt-3 max-h-[100px] overflow-y-auto">
        {chartData.map((entry, index) => (
          <div
            key={entry.key}
            className={`flex items-center justify-between gap-2 py-0.5 px-1 cursor-pointer transition-opacity duration-150 ${
              activeIndex === null || activeIndex === index
                ? "opacity-100"
                : "opacity-40"
            }`}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            role="button"
            tabIndex={0}
            aria-label={`${entry.label}: ${entry.percentage.toFixed(1)}%`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-1.5 w-1.5 rounded-[1px] shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
                {ASSET_ICONS[entry.key]}
                <span className="truncate">{entry.label}</span>
              </span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-foreground shrink-0">
              {entry.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* Liabilities summary */}
      {totalLiabilities > 0 && (
        <div className="mt-2 px-3 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
              Liabilities
            </span>
            <span className="font-mono text-[11px] tabular-nums text-destructive">
              −{formatAUD(totalLiabilities)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
              Net Worth
            </span>
            <span
              className={`font-mono text-[11px] tabular-nums font-medium ${netWorth >= 0 ? "text-success" : "text-destructive"}`}
            >
              {formatAUD(netWorth)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

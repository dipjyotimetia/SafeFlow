"use client";

import { CHART_DEFAULTS } from "@/lib/charts/config";
import {
  useChartAccessibility,
  useChartAnimations,
  useChartGradients,
  useOptimizedChartData,
} from "@/lib/charts/hooks";
import { formatAUD } from "@/lib/utils/currency";
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CashflowData {
  month: string;
  year: number;
  income: number;
  expenses: number;
  net: number;
}

interface CashflowChartProps {
  data: CashflowData[];
  ariaLabel?: string;
}

// Tooltip component defined outside to avoid recreating during render
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-xl border border-border/40 rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.15)] animate-scale-in">
        <p className="font-semibold text-sm mb-3 text-foreground">{label}</p>
        <div className="space-y-2">
          {payload.map((entry) => (
            <div
              key={entry.dataKey}
              className="flex items-center justify-between gap-6"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {entry.dataKey === "income"
                    ? "Income"
                    : entry.dataKey === "expenses"
                      ? "Expenses"
                      : "Net"}
                </span>
              </div>
              <span
                className="text-sm font-semibold tabular-nums font-display"
                style={{ color: entry.color }}
              >
                {formatAUD(entry.value * 100)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function formatLegendValue(value: string) {
  if (value === "income") return "Income";
  if (value === "expenses") return "Expenses";
  if (value === "net") return "Net";
  return value;
}

export function CashflowChart({
  data,
  ariaLabel = "Monthly cashflow showing income vs expenses",
}: CashflowChartProps) {
  const gradients = useChartGradients();
  const accessibilityProps = useChartAccessibility(
    ariaLabel,
    `Cashflow data for ${data.length} months`,
  );
  const optimizedData = useOptimizedChartData(data);
  const animationConfig = useChartAnimations(data.length);

  // Convert cents to dollars for display and format label with year
  const chartData = useMemo(() => {
    return optimizedData.data.map((d) => ({
      ...d,
      income: d.income / 100,
      expenses: d.expenses / 100,
      net: d.net / 100,
      label: `${d.month} '${String(d.year).slice(-2)}`,
    }));
  }, [optimizedData.data]);

  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minHeight={200}
      {...accessibilityProps}
    >
      <ComposedChart data={chartData} margin={CHART_DEFAULTS.margin}>
        <defs>
          <linearGradient id={gradients.income.id} x1="0" y1="0" x2="0" y2="1">
            {gradients.income.stops.map((stop) => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </linearGradient>
          <linearGradient id={gradients.expense.id} x1="0" y1="0" x2="0" y2="1">
            {gradients.expense.stops.map((stop) => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </linearGradient>
          <linearGradient id={gradients.net.id} x1="0" y1="0" x2="1" y2="0">
            {gradients.net.stops.map((stop) => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </linearGradient>
        </defs>
        <CartesianGrid {...CHART_DEFAULTS.grid} />
        <XAxis
          dataKey="label"
          tick={CHART_DEFAULTS.axis.tick}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={CHART_DEFAULTS.axis.tick}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "12px" }}
          formatter={formatLegendValue}
        />
        <Bar
          dataKey="income"
          fill={`url(#${gradients.income.id})`}
          radius={[6, 6, 0, 0]}
          isAnimationActive={animationConfig.isAnimationActive}
          animationDuration={animationConfig.animationDuration}
          animationEasing={animationConfig.animationEasing}
          className="drop-shadow-sm"
        />
        <Bar
          dataKey="expenses"
          fill={`url(#${gradients.expense.id})`}
          radius={[6, 6, 0, 0]}
          isAnimationActive={animationConfig.isAnimationActive}
          animationDuration={animationConfig.animationDuration}
          animationEasing={animationConfig.animationEasing}
          className="drop-shadow-sm"
        />
        <Line
          type="monotone"
          dataKey="net"
          stroke={`url(#${gradients.net.id})`}
          strokeWidth={3}
          dot={{
            fill: "oklch(0.55 0.18 265)",
            strokeWidth: 2,
            r: 5,
            stroke: "white",
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))",
          }}
          activeDot={{
            r: 8,
            fill: "oklch(0.55 0.18 265)",
            stroke: "white",
            strokeWidth: 3,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))",
          }}
          isAnimationActive={animationConfig.isAnimationActive}
          animationDuration={animationConfig.animationDuration + 200} // Slight delay for line animation
          animationEasing={animationConfig.animationEasing}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

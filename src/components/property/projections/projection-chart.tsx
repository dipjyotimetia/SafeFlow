"use client";

/**
 * Property Projection Chart
 *
 * Visualizes multi-year property projections including:
 * - Property value growth
 * - Equity accumulation
 * - Debt reduction
 * - Cashflow trajectory
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAUD } from "@/lib/utils/currency";
import type { YearlyProjection } from "@/lib/utils/property-projections";

// ============ Types ============

interface ProjectionChartProps {
  projections: YearlyProjection[];
  variant?: "equity" | "value" | "cashflow" | "combined";
  height?: number;
  showGrid?: boolean;
}

// ============ Chart Formatters ============

const formatYAxisTick = (value: number): string => {
  if (value >= 100000000) {
    return `$${(value / 100000000).toFixed(1)}M`;
  }
  if (value >= 100000) {
    return `$${(value / 100000).toFixed(0)}K`;
  }
  return formatAUD(value);
};

const formatTooltipValue = (value: number | undefined): string => {
  if (value === undefined) return "-";
  return formatAUD(value);
};

// ============ Chart Components ============

function EquityChart({
  projections,
  height,
  showGrid,
}: Omit<ProjectionChartProps, "variant">) {
  const data = projections.map((p) => ({
    year: p.year,
    equity: p.equity,
    debt: p.loanBalance,
    value: p.propertyValue,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis
          dataKey="year"
          tickFormatter={(year) => `Y${year}`}
          className="text-xs"
        />
        <YAxis
          tickFormatter={formatYAxisTick}
          width={80}
          className="text-xs"
        />
        <Tooltip
          formatter={(value, name) => [
            formatTooltipValue(typeof value === "number" ? value : undefined),
            name === "equity" ? "Equity" : name === "debt" ? "Debt" : "Property Value",
          ]}
          labelFormatter={(year) => `Year ${year}`}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="equity"
          stackId="1"
          stroke="hsl(var(--chart-1))"
          fill="hsl(var(--chart-1))"
          fillOpacity={0.6}
          name="Equity"
        />
        <Area
          type="monotone"
          dataKey="debt"
          stackId="1"
          stroke="hsl(var(--chart-2))"
          fill="hsl(var(--chart-2))"
          fillOpacity={0.4}
          name="Debt"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ValueChart({
  projections,
  height,
  showGrid,
}: Omit<ProjectionChartProps, "variant">) {
  const data = projections.map((p) => ({
    year: p.year,
    value: p.propertyValue,
    purchasePrice: projections[0]?.propertyValue || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis
          dataKey="year"
          tickFormatter={(year) => `Y${year}`}
          className="text-xs"
        />
        <YAxis
          tickFormatter={formatYAxisTick}
          width={80}
          className="text-xs"
        />
        <Tooltip
          formatter={(value, name) => [
            formatTooltipValue(typeof value === "number" ? value : undefined),
            name === "value" ? "Property Value" : "Purchase Price",
          ]}
          labelFormatter={(year) => `Year ${year}`}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={false}
          name="Property Value"
        />
        <Line
          type="monotone"
          dataKey="purchasePrice"
          stroke="hsl(var(--chart-3))"
          strokeWidth={1}
          strokeDasharray="5 5"
          dot={false}
          name="Purchase Price"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CashflowChart({
  projections,
  height,
  showGrid,
}: Omit<ProjectionChartProps, "variant">) {
  // Calculate cumulative cashflow using reduce to avoid mutable variable
  const data = projections.reduce<Array<{
    year: number;
    beforeTax: number;
    afterTax: number;
    cumulative: number;
  }>>((acc, p) => {
    const prevCumulative = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
    acc.push({
      year: p.year,
      beforeTax: p.annualCashflowBeforeTax,
      afterTax: p.annualCashflowAfterTax,
      cumulative: prevCumulative + p.annualCashflowAfterTax,
    });
    return acc;
  }, []);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis
          dataKey="year"
          tickFormatter={(year) => `Y${year}`}
          className="text-xs"
        />
        <YAxis
          tickFormatter={formatYAxisTick}
          width={80}
          className="text-xs"
        />
        <Tooltip
          formatter={(value, name) => [
            formatTooltipValue(typeof value === "number" ? value : undefined),
            name === "beforeTax"
              ? "Before Tax"
              : name === "afterTax"
                ? "After Tax"
                : "Cumulative",
          ]}
          labelFormatter={(year) => `Year ${year}`}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="beforeTax"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={false}
          name="Before Tax"
        />
        <Line
          type="monotone"
          dataKey="afterTax"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          dot={false}
          name="After Tax"
        />
        <Line
          type="monotone"
          dataKey="cumulative"
          stroke="hsl(var(--chart-3))"
          strokeWidth={1}
          strokeDasharray="5 5"
          dot={false}
          name="Cumulative"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CombinedChart({
  projections,
  height,
  showGrid,
}: Omit<ProjectionChartProps, "variant">) {
  const data = projections.map((p) => ({
    year: p.year,
    value: p.propertyValue,
    equity: p.equity,
    debt: p.loanBalance,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis
          dataKey="year"
          tickFormatter={(year) => `Y${year}`}
          className="text-xs"
        />
        <YAxis
          tickFormatter={formatYAxisTick}
          width={80}
          className="text-xs"
        />
        <Tooltip
          formatter={(value, name) => [
            formatTooltipValue(typeof value === "number" ? value : undefined),
            name === "value"
              ? "Property Value"
              : name === "equity"
                ? "Equity"
                : "Debt",
          ]}
          labelFormatter={(year) => `Year ${year}`}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={false}
          name="Property Value"
        />
        <Line
          type="monotone"
          dataKey="equity"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          dot={false}
          name="Equity"
        />
        <Line
          type="monotone"
          dataKey="debt"
          stroke="hsl(var(--chart-3))"
          strokeWidth={2}
          dot={false}
          name="Debt"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ============ Main Component ============

export function ProjectionChart({
  projections,
  variant = "equity",
  height = 300,
  showGrid = true,
}: ProjectionChartProps) {
  if (!projections || projections.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        No projection data available
      </div>
    );
  }

  switch (variant) {
    case "value":
      return (
        <ValueChart
          projections={projections}
          height={height}
          showGrid={showGrid}
        />
      );
    case "cashflow":
      return (
        <CashflowChart
          projections={projections}
          height={height}
          showGrid={showGrid}
        />
      );
    case "combined":
      return (
        <CombinedChart
          projections={projections}
          height={height}
          showGrid={showGrid}
        />
      );
    case "equity":
    default:
      return (
        <EquityChart
          projections={projections}
          height={height}
          showGrid={showGrid}
        />
      );
  }
}

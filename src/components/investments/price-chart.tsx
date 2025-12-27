'use client';

import { useId } from 'react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatAUD } from '@/lib/utils/currency';
import type { PriceHistoryEntry } from '@/types';

interface PriceChartProps {
  data: PriceHistoryEntry[];
  height?: number;
  showAxis?: boolean;
  showTooltip?: boolean;
}

// Tooltip component defined outside to avoid recreating during render
function PriceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}) {
  if (active && payload && payload.length && label) {
    const date = new Date(label);
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">
          {date.toLocaleDateString('en-AU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
        <p className="font-semibold text-sm">{formatAUD(payload[0].value * 100)}</p>
      </div>
    );
  }
  return null;
}

/**
 * Sparkline component for showing price trends in a compact format
 * @param data - Array of price history entries (minimum 2 points required)
 */
export function PriceSparkline({ data }: { data: PriceHistoryEntry[] }) {
  // Use unique ID to avoid gradient collisions when multiple sparklines render
  const uniqueId = useId();

  if (data.length < 2) {
    return <div className="w-16 h-6 bg-muted/30 rounded" />;
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).getTime(),
    price: d.price / 100, // Convert cents to dollars
  }));

  // Determine if the trend is positive (first price < last price)
  const isPositive = chartData[0].price <= chartData[chartData.length - 1].price;
  const strokeColor = isPositive ? 'oklch(0.65 0.18 145)' : 'oklch(0.65 0.2 25)';
  const gradientId = `sparkGradient-${uniqueId}`;

  return (
    <div className="w-16 h-6">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Full price chart with axes and tooltips for detail view
 */
export function PriceChart({ data, height = 200, showAxis = true, showTooltip = true }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ height }}
      >
        No price history available
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).getTime(),
    dateLabel: new Date(d.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    price: d.price / 100, // Convert cents to dollars
  }));

  // Determine if the trend is positive
  const isPositive = chartData[0].price <= chartData[chartData.length - 1].price;
  const strokeColor = isPositive ? 'oklch(0.65 0.18 145)' : 'oklch(0.65 0.2 25)';

  // Calculate min/max for Y axis
  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        {showAxis && (
          <>
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              width={50}
            />
          </>
        )}
        {showTooltip && <Tooltip content={<PriceTooltip />} />}
        <Area
          type="monotone"
          dataKey="price"
          stroke={strokeColor}
          strokeWidth={2}
          fill="url(#priceGradient)"
          isAnimationActive={true}
          animationDuration={500}
          dot={false}
          activeDot={{
            r: 4,
            fill: strokeColor,
            stroke: 'white',
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Time range options for the chart
 */
export type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export function getTimeRangeDays(range: TimeRange): number {
  switch (range) {
    case '1W':
      return 7;
    case '1M':
      return 30;
    case '3M':
      return 90;
    case '6M':
      return 180;
    case '1Y':
      return 365;
    case 'ALL':
      return 9999; // Large number to get all data
    default:
      return 30;
  }
}

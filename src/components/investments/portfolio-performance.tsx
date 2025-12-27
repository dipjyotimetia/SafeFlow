'use client';

import { useState, useMemo, useId } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolioHistory, usePortfolioPerformance, getTimeRangeDays } from '@/hooks';
import type { TimeRange } from '@/hooks';
import { formatAUD } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'All' },
];

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  value: number;
  valueCents: number;
}

// Tooltip component defined outside to avoid recreating during render
function PerformanceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{item.dateLabel}</p>
        <p className="text-lg font-bold tabular-nums">
          {formatAUD(item.valueCents)}
        </p>
      </div>
    );
  }
  return null;
}

export function PortfolioPerformance() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');
  const gradientId = useId();

  const days = getTimeRangeDays(selectedRange);
  const { history, isLoading: isHistoryLoading } = usePortfolioHistory(days);
  const { performance, isLoading: isPerformanceLoading } =
    usePortfolioPerformance(selectedRange);

  const isLoading = isHistoryLoading || isPerformanceLoading;

  const chartData = useMemo(() => {
    return history.map((snapshot) => {
      const date = new Date(snapshot.date);
      return {
        date: date.toISOString(),
        dateLabel: date.toLocaleDateString('en-AU', {
          month: 'short',
          day: 'numeric',
        }),
        value: snapshot.totalValue / 100, // Convert to dollars
        valueCents: snapshot.totalValue,
      };
    });
  }, [history]);

  // Determine if trend is positive, negative, or neutral
  const trendDirection = useMemo(() => {
    if (!performance) return 'neutral';
    if (performance.valueChange > 0) return 'positive';
    if (performance.valueChange < 0) return 'negative';
    return 'neutral';
  }, [performance]);

  const strokeColor =
    trendDirection === 'positive'
      ? 'oklch(0.65 0.18 145)'
      : trendDirection === 'negative'
        ? 'oklch(0.65 0.2 25)'
        : 'oklch(0.6 0.02 160)';

  // Calculate Y-axis domain with padding
  const yDomain = useMemo(() => {
    if (chartData.length < 2) return ['auto', 'auto'];
    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || max * 0.05;
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Portfolio Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = chartData.length >= 2;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Portfolio Performance</CardTitle>
          <div className="flex gap-1">
            {TIME_RANGES.map((range) => (
              <Button
                key={range.value}
                variant={selectedRange === range.value ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSelectedRange(range.value)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Performance Summary */}
        {performance && (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              {trendDirection === 'positive' && (
                <TrendingUp className="h-5 w-5 text-success" />
              )}
              {trendDirection === 'negative' && (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              {trendDirection === 'neutral' && (
                <Minus className="h-5 w-5 text-muted-foreground" />
              )}
              <span
                className={cn(
                  'text-lg font-bold',
                  trendDirection === 'positive' && 'text-success',
                  trendDirection === 'negative' && 'text-destructive'
                )}
              >
                {performance.valueChange >= 0 ? '+' : ''}
                {formatAUD(performance.valueChange)}
              </span>
            </div>
            <span
              className={cn(
                'text-sm font-medium px-2 py-0.5 rounded-full',
                trendDirection === 'positive' &&
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                trendDirection === 'negative' &&
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                trendDirection === 'neutral' &&
                  'bg-muted text-muted-foreground'
              )}
            >
              {performance.percentChange >= 0 ? '+' : ''}
              {performance.percentChange.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Chart */}
        {hasData ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                  <stop
                    offset="100%"
                    stopColor={strokeColor}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="dateLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickMargin={8}
                minTickGap={30}
              />
              <YAxis
                domain={yDomain as [number, number]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) =>
                  value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
                }
                width={50}
              />
              <Tooltip content={<PerformanceTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: strokeColor,
                  strokeWidth: 2,
                  fill: 'var(--background)',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
            <div className="text-center">
              <p>Not enough data yet</p>
              <p className="text-xs mt-1">
                Portfolio history will appear after refreshing prices
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

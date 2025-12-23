'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatAUD } from '@/lib/utils/currency';

interface CategoryData {
  categoryId: string;
  categoryName: string;
  amount: number;
  color?: string;
}

interface CategoryPieChartProps {
  data: CategoryData[];
}

// Premium emerald/teal color palette
const COLORS = [
  'oklch(0.55 0.15 160)', // emerald primary
  'oklch(0.6 0.12 180)',  // teal
  'oklch(0.7 0.14 85)',   // gold accent
  'oklch(0.5 0.08 220)',  // slate blue
  'oklch(0.65 0.18 145)', // success green
  'oklch(0.6 0.1 200)',   // cyan
  'oklch(0.55 0.12 280)', // purple
  'oklch(0.65 0.15 30)',  // coral
  'oklch(0.6 0.14 120)',  // lime
  'oklch(0.5 0.1 260)',   // indigo
];

interface ChartDataItem {
  categoryId: string;
  categoryName: string;
  amount: number;
  fill: string;
  percentage: number;
  [key: string]: string | number;
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Calculate total for percentages
  const total = data.reduce((sum, d) => sum + d.amount, 0);

  // Convert cents to dollars and limit to top 8 categories
  const chartData: ChartDataItem[] = data
    .slice(0, 8)
    .map((d, index) => ({
      ...d,
      amount: d.amount / 100,
      fill: d.color || COLORS[index % COLORS.length],
      percentage: total > 0 ? (d.amount / total) * 100 : 0,
    }));

  const otherTotal = data.slice(8).reduce((sum, d) => sum + d.amount, 0);
  if (otherTotal > 0) {
    chartData.push({
      categoryId: 'other',
      categoryName: 'Other',
      amount: otherTotal / 100,
      fill: 'oklch(0.65 0.02 160)', // muted teal
      percentage: total > 0 ? (otherTotal / total) * 100 : 0,
    });
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataItem }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover/95 backdrop-blur-xl border border-border/40 rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.15)] min-w-[160px] animate-scale-in">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="h-3 w-3 rounded-full shadow-sm"
              style={{ backgroundColor: item.fill }}
            />
            <p className="font-semibold text-sm">{item.categoryName}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xl font-bold tabular-nums font-display">{formatAUD(item.amount * 100)}</p>
            <div className="flex items-center gap-1.5">
              <div
                className="h-1.5 rounded-full flex-1 bg-muted overflow-hidden"
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.fill,
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground font-medium">{item.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No spending data
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%" minHeight={160}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={activeIndex !== null ? 80 : 75}
              paddingAngle={2}
              dataKey="amount"
              nameKey="categoryName"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              isAnimationActive={true}
              animationDuration={500}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out',
                    opacity: activeIndex === null || activeIndex === index ? 1 : 0.5,
                    transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                    filter: activeIndex === index ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label showing total - positioned absolutely */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-card/80 backdrop-blur-sm rounded-full px-3 py-2 shadow-sm border border-border/20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</p>
            <p className="text-base font-bold tabular-nums font-display">{formatAUD(total)}</p>
          </div>
        </div>
      </div>

      {/* Custom legend with percentages */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs px-2 pt-3 max-h-[90px] overflow-y-auto">
        {chartData.map((entry, index) => (
          <div
            key={entry.categoryId}
            className={`flex items-center justify-between gap-2 py-1 px-1.5 rounded-md transition-all duration-200 cursor-pointer ${
              activeIndex === null || activeIndex === index
                ? 'opacity-100'
                : 'opacity-40'
            } ${
              activeIndex === index ? 'bg-accent/50' : 'hover:bg-accent/30'
            }`}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="text-muted-foreground truncate font-medium">{entry.categoryName}</span>
            </div>
            <span className="font-semibold text-foreground flex-shrink-0 tabular-nums">
              {entry.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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

const COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  // Convert cents to dollars and limit to top 8 categories
  const chartData = data
    .slice(0, 8)
    .map((d, index) => ({
      ...d,
      amount: d.amount / 100,
      fill: d.color || COLORS[index % COLORS.length],
    }));

  const otherTotal = data.slice(8).reduce((sum, d) => sum + d.amount, 0);
  if (otherTotal > 0) {
    chartData.push({
      categoryId: 'other',
      categoryName: 'Other',
      amount: otherTotal / 100,
      fill: '#94a3b8',
    });
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { categoryName: string; amount: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.categoryName}</p>
          <p className="text-sm text-muted-foreground">{formatAUD(data.amount * 100)}</p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = ({ payload }: { payload?: ReadonlyArray<{ value?: string; color?: string }> }) => {
    return (
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {payload?.map((entry, index) => (
          <li key={index} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No spending data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="amount"
          nameKey="categoryName"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={renderLegend} />
      </PieChart>
    </ResponsiveContainer>
  );
}

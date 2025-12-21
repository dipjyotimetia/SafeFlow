'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatAUD } from '@/lib/utils/currency';

interface CashflowData {
  month: string;
  year: number;
  income: number;
  expenses: number;
  net: number;
}

interface CashflowChartProps {
  data: CashflowData[];
}

export function CashflowChart({ data }: CashflowChartProps) {
  // Convert cents to dollars for display and format label with year
  const chartData = data.map((d) => ({
    ...d,
    income: d.income / 100,
    expenses: d.expenses / 100,
    net: d.net / 100,
    label: `${d.month} '${String(d.year).slice(-2)}`,
  }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-xl">
          <p className="font-semibold text-sm mb-3 text-foreground">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry) => (
              <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  {entry.dataKey === 'income' ? 'Income' : entry.dataKey === 'expenses' ? 'Expenses' : 'Net'}
                </span>
                <span className="text-sm font-medium tabular-nums" style={{ color: entry.color }}>
                  {formatAUD(entry.value * 100)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const formatLegendValue = (value: string) => {
    if (value === 'income') return 'Income';
    if (value === 'expenses') return 'Expenses';
    if (value === 'net') return 'Net';
    return value;
  };

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
      <ComposedChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
      >
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.18 145)" />
            <stop offset="100%" stopColor="oklch(0.55 0.16 145)" />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.2 25)" />
            <stop offset="100%" stopColor="oklch(0.55 0.18 25)" />
          </linearGradient>
          <linearGradient id="netGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.55 0.15 160)" />
            <stop offset="100%" stopColor="oklch(0.6 0.12 180)" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          className="text-muted-foreground"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          formatter={formatLegendValue}
        />
        <Bar
          dataKey="income"
          fill="url(#incomeGradient)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationDuration={500}
          animationEasing="ease-out"
        />
        <Bar
          dataKey="expenses"
          fill="url(#expenseGradient)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationDuration={500}
          animationEasing="ease-out"
        />
        <Line
          type="monotone"
          dataKey="net"
          stroke="url(#netGradient)"
          strokeWidth={2.5}
          dot={{ fill: 'oklch(0.55 0.15 160)', strokeWidth: 2, r: 4, stroke: 'white' }}
          activeDot={{ r: 6, fill: 'oklch(0.55 0.15 160)', stroke: 'white', strokeWidth: 2 }}
          isAnimationActive={true}
          animationDuration={500}
          animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

'use client';

import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { calculateIncomeTax, getMarginalTaxRate, MEDICARE_LEVY_RATE } from '@/domain/services/tax.service';
import { FinancialYear } from '@/domain/value-objects/financial-year';
import { calculateMonthsToTarget, calculateFutureValue } from '@/lib/utils/projections';
import { formatAUD, formatAUDCompact } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

// Concessional super contributions are taxed at 15% inside the fund.
const SUPER_CONTRIBUTIONS_TAX_RATE = 15;

// ── helpers ──────────────────────────────────────────────────────────────────

function buildProjection(
  monthlyInvestDollars: number,
  years: number,
  annualRate: number,
): { year: string; balance: number }[] {
  const data: { year: string; balance: number }[] = [];
  for (let y = 0; y <= years; y++) {
    // calculateFutureValue operates in cents and compounds monthly,
    // matching the ETA produced by calculateMonthsToTarget.
    const balanceCents = calculateFutureValue(0, monthlyInvestDollars * 100, annualRate, y * 12);
    data.push({ year: `Y${y}`, balance: Math.round(balanceCents / 100) });
  }
  return data;
}

const EXPENSE_COLORS = ['#c9a84c', '#6c8ebf', '#82b366', '#d6a4a4', '#a78bfa', '#38bdf8'];
const EXPENSE_LABELS = ['Mortgage/Rent', 'School/Childcare', 'Groceries', 'Transport', 'Insurance/Utils', 'Lifestyle'];

// ── Sub-components ────────────────────────────────────────────────────────────

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  valueColor?: string;
}

function SliderRow({ label, value, min, max, step = 100, onChange, prefix = '$', suffix = '', valueColor }: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
        <span className={cn('font-mono text-sm font-bold tabular-nums', valueColor ?? 'text-[--color-gold]')}>
          {prefix}{value >= 1000 ? value.toLocaleString('en-AU') : value}{suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={min}
        max={max}
        step={step}
      />
      <div className="flex justify-between">
        <span className="font-mono text-[10px] text-muted-foreground/50">{prefix}{min.toLocaleString('en-AU')}</span>
        <span className="font-mono text-[10px] text-muted-foreground/50">{prefix}{max.toLocaleString('en-AU')}</span>
      </div>
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

function StatTile({ label, value, sub, accent = 'text-[--color-gold]' }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mb-1">{label}</p>
      <p className={cn('font-mono text-xl font-bold tabular-nums leading-none', accent)}>{value}</p>
      {sub && <p className="font-mono text-[10px] text-muted-foreground/60 mt-1">{sub}</p>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="eyebrow">{children}</span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

function ProjectionTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: { year: string } }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border/80 rounded-lg p-3 animate-scale-in shadow-premium-lg">
      <p className="font-mono text-sm font-bold text-[#a78bfa]">{formatAUDCompact(payload[0].value * 100)}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{payload[0].payload.year}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FICalculator() {
  const [grossIncome, setGrossIncome] = useState(300000);
  const [superExtra, setSuperExtra] = useState(5000);

  const [mortgage, setMortgage] = useState(4500);
  const [school, setSchool] = useState(2000);
  const [groceries, setGroceries] = useState(1400);
  const [transport, setTransport] = useState(1000);
  const [insurance, setInsurance] = useState(900);
  const [lifestyle, setLifestyle] = useState(1500);

  const [savingsPct, setSavingsPct] = useState(10);
  const [investPct, setInvestPct] = useState(20);

  const [retireTarget, setRetireTarget] = useState(2500000);
  const [returnRate, setReturnRate] = useState(7);

  // ── Derived values ──────────────────────────────────────────────────────────
  // Salary sacrifice reduces taxable income (and the take-home pool).
  const currentFY = FinancialYear.current().value;
  const taxableIncomeDollars = Math.max(0, grossIncome - superExtra);
  const taxResult = calculateIncomeTax(taxableIncomeDollars * 100, { financialYear: currentFY });
  const annualNetDollars = taxableIncomeDollars - taxResult.totalTax.toDollars();
  const monthlyNet = Math.round(annualNetDollars / 12);

  const totalMonthlyExpenses = mortgage + school + groceries + transport + insurance + lifestyle;
  const monthlySavings = Math.round(monthlyNet * savingsPct / 100);
  const monthlyInvest = Math.round(monthlyNet * investPct / 100);
  const monthlyDiscretionary = monthlyNet - totalMonthlyExpenses - monthlySavings - monthlyInvest;

  const expensePct = (totalMonthlyExpenses / monthlyNet) * 100;
  const savingsPctActual = (monthlySavings / monthlyNet) * 100;
  const investPctActual = (monthlyInvest / monthlyNet) * 100;
  const discretionaryPct = 100 - expensePct - savingsPctActual - investPctActual;

  const annualInvest = monthlyInvest * 12;
  const months = calculateMonthsToTarget(0, retireTarget * 100, monthlyInvest * 100, returnRate / 100);
  const years = months === null ? 60 : Math.ceil(months / 12);
  const projectionData = buildProjection(monthlyInvest, Math.min(years + 5, 35), returnRate / 100);

  const effectiveTaxRate = taxResult.effectiveRate;
  const incomeStatus =
    grossIncome >= 450000 ? 'Affluent' :
    grossIncome >= 350000 ? 'Premium Lifestyle' :
    grossIncome >= 300000 ? 'Upper Comfortable' :
    grossIncome >= 250000 ? 'Comfortable + Travel' :
    'Comfortable Basics';

  const healthScore =
    monthlyDiscretionary > 0 && investPctActual >= 20 ? 'Strong' :
    monthlyDiscretionary > 0 ? 'Moderate' :
    'Under Pressure';

  const healthColor =
    healthScore === 'Strong' ? 'text-positive' :
    healthScore === 'Moderate' ? 'text-warning' :
    'text-destructive';

  const expenseData = [
    { name: EXPENSE_LABELS[0], value: mortgage },
    { name: EXPENSE_LABELS[1], value: school },
    { name: EXPENSE_LABELS[2], value: groceries },
    { name: EXPENSE_LABELS[3], value: transport },
    { name: EXPENSE_LABELS[4], value: insurance },
    { name: EXPENSE_LABELS[5], value: lifestyle },
  ];

  const allocationRows = [
    { label: 'Expenses',      pct: expensePct,        color: 'bg-destructive',    textColor: 'text-destructive' },
    { label: 'Savings',       pct: savingsPctActual,   color: 'bg-positive',       textColor: 'text-positive' },
    { label: 'Invest',        pct: investPctActual,    color: 'bg-[#38bdf8]',      textColor: 'text-[#38bdf8]' },
    { label: 'Discretionary', pct: discretionaryPct,   color: 'bg-[--color-gold]', textColor: 'text-[--color-gold]' },
  ];

  const insights = [
    {
      title: 'Lifestyle Creep Risk',
      desc: grossIncome >= 300000
        ? 'At this income, lifestyle creep is your #1 enemy. Keep expenses below 55% of net.'
        : 'Moderate risk. Focus on building good habits now.',
      textColor: 'text-warning',
      borderBg: 'border-warning/20 bg-warning/5',
    },
    {
      title: 'Optimal Zone',
      desc: '$300k–$400k with discipline hits the sweet spot: live well, invest aggressively, avoid burnout.',
      textColor: 'text-positive',
      borderBg: 'border-positive/20 bg-positive/5',
    },
    {
      title: grossIncome >= 450000 ? 'Structure Now' : 'Super Focus',
      desc: grossIncome >= 450000
        ? 'Consider trusts & company structures. Max concessional super ($30,000/yr).'
        : (() => {
            // Net saving per $ sacrificed = (marginal + medicare − super contributions tax)
            const marginalRate = getMarginalTaxRate(grossIncome * 100, { financialYear: currentFY });
            const netSavingRate = Math.max(0, marginalRate + MEDICARE_LEVY_RATE - SUPER_CONTRIBUTIONS_TAX_RATE);
            const taxSaved = (superExtra * netSavingRate) / 100;
            return `Extra super saves ~${formatAUD(taxSaved * 100)}/yr in tax at your ${marginalRate}% marginal rate.`;
          })(),
      textColor: 'text-[#38bdf8]',
      borderBg: 'border-[#38bdf8]/20 bg-[#38bdf8]/5',
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Badge variant="outline" className={cn('font-mono', healthColor)}>
          Financial Health: {healthScore}
        </Badge>
        <Badge variant="outline" className="font-mono text-[--color-gold]">
          {incomeStatus}
        </Badge>
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
          FY {currentFY} · Household
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">

        {/* Left panel — Controls */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <SectionLabel>Income</SectionLabel>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-5">
              <SliderRow label="Gross Household Income (Annual)" value={grossIncome} min={150000} max={600000} step={5000} onChange={setGrossIncome} />
              <SliderRow label="Extra Super Contributions (Annual)" value={superExtra} min={0} max={30000} step={500} onChange={setSuperExtra} valueColor="text-[#6c8ebf]" />
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-muted/30 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Annual Net</p>
                  <p className="font-mono text-lg font-bold text-positive tabular-nums">{formatAUD(annualNetDollars * 100)}</p>
                </div>
                <div className="rounded-lg bg-muted/30 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Effective Tax</p>
                  <p className="font-mono text-lg font-bold text-destructive tabular-nums">{effectiveTaxRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <SectionLabel>Monthly Expenses</SectionLabel>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-5">
              <SliderRow label="Mortgage / Rent" value={mortgage} min={1500} max={8000} step={100} onChange={setMortgage} valueColor="text-[#c9a84c]" />
              <SliderRow label="Schooling / Childcare" value={school} min={0} max={5000} step={100} onChange={setSchool} valueColor="text-[#6c8ebf]" />
              <SliderRow label="Groceries" value={groceries} min={600} max={3000} step={50} onChange={setGroceries} valueColor="text-[#82b366]" />
              <SliderRow label="Transport" value={transport} min={300} max={2500} step={50} onChange={setTransport} valueColor="text-[#d6a4a4]" />
              <SliderRow label="Insurance / Utilities" value={insurance} min={400} max={2500} step={50} onChange={setInsurance} valueColor="text-[#a78bfa]" />
              <SliderRow label="Lifestyle / Dining / Travel" value={lifestyle} min={500} max={5000} step={100} onChange={setLifestyle} valueColor="text-[#38bdf8]" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <SectionLabel>Allocation (% of Net Income)</SectionLabel>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-5">
              <SliderRow label="Cash Savings %" value={savingsPct} min={0} max={30} step={1} onChange={setSavingsPct} prefix="" suffix="%" valueColor="text-positive" />
              <SliderRow label="Investments %" value={investPct} min={0} max={40} step={1} onChange={setInvestPct} prefix="" suffix="%" valueColor="text-[#38bdf8]" />
              <div className="rounded-lg bg-muted/20 p-4 space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Allocation Check</p>
                {allocationRows.map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-mono text-[11px] text-muted-foreground">{row.label}</span>
                      <span className={cn('font-mono text-[11px]', row.textColor)}>{Math.max(0, row.pct).toFixed(1)}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full transition-all', row.color)}
                        style={{ width: `${Math.min(100, Math.max(0, row.pct))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <SectionLabel>Retirement Parameters</SectionLabel>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-5">
              <SliderRow label="Target Nest Egg" value={retireTarget} min={1000000} max={5000000} step={100000} onChange={setRetireTarget} valueColor="text-[#a78bfa]" />
              <SliderRow label="Expected Annual Return %" value={returnRate} min={4} max={12} step={0.5} onChange={setReturnRate} prefix="" suffix="%" valueColor="text-[#a78bfa]" />
            </CardContent>
          </Card>
        </div>

        {/* Right panel — Dashboard */}
        <div className="flex flex-col gap-4">

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Monthly Net" value={formatAUD(monthlyNet * 100)} sub="after tax + medicare" accent="text-positive" />
            <StatTile label="Monthly Expenses" value={formatAUD(totalMonthlyExpenses * 100)} sub={`${expensePct.toFixed(1)}% of net`} accent="text-destructive" />
            <StatTile label="Monthly Investment" value={formatAUD(monthlyInvest * 100)} sub={`${formatAUD(annualInvest * 100)}/yr`} accent="text-[#38bdf8]" />
            <StatTile label="Years to Retire" value={years >= 60 ? '60+ yrs' : `${years} yrs`} sub={`target ${formatAUDCompact(retireTarget * 100)}`} accent="text-[#a78bfa]" />
          </div>

          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <SectionLabel>Monthly Cash Flow</SectionLabel>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Net Income',    value: monthlyNet,            color: 'text-positive' },
                  { label: '− Expenses',    value: totalMonthlyExpenses,  color: 'text-destructive' },
                  { label: '− Savings',     value: monthlySavings,        color: 'text-[#82b366]' },
                  { label: '− Investment',  value: monthlyInvest,         color: 'text-[#38bdf8]' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-muted/20 px-3 py-3 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">{item.label}</p>
                    <p className={cn('font-mono text-base font-bold tabular-nums', item.color)}>{formatAUD(item.value * 100)}</p>
                  </div>
                ))}
              </div>
              <div className={cn(
                'rounded-lg border px-5 py-3 flex justify-between items-center',
                monthlyDiscretionary >= 0 ? 'bg-positive/5 border-positive/20' : 'bg-destructive/5 border-destructive/20'
              )}>
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Remaining Discretionary</span>
                <span className={cn('font-mono text-xl font-bold tabular-nums', monthlyDiscretionary >= 0 ? 'text-positive' : 'text-destructive')}>
                  {formatAUD(monthlyDiscretionary * 100)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <SectionLabel>Expense Breakdown</SectionLabel>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={expenseData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                      {expenseData.map((_, i) => <Cell key={i} fill={EXPENSE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatAUD((v as number) * 100)}
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontFamily: 'monospace', fontSize: 12, color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {expenseData.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: EXPENSE_COLORS[i] }} />
                        <span className="font-mono text-[10px] text-muted-foreground">{EXPENSE_LABELS[i]}</span>
                      </div>
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: EXPENSE_COLORS[i] }}>{formatAUD(item.value * 100)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <SectionLabel>Wealth Projection</SectionLabel>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <StatTile label="Annual Investment" value={formatAUDCompact(annualInvest * 100)} accent="text-[#38bdf8]" />
                  <StatTile label="Target" value={formatAUDCompact(retireTarget * 100)} accent="text-[#a78bfa]" />
                  <StatTile label="ETA" value={years >= 60 ? '60+ yrs' : `${years} yrs`} accent="text-positive" />
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={projectionData} margin={{ top: 4, right: 4, bottom: 0, left: 8 }}>
                    <defs>
                      <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="year"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={false}
                      axisLine={false}
                      interval={Math.floor(projectionData.length / 6)}
                    />
                    <YAxis
                      tickFormatter={(v) => formatAUDCompact((v as number) * 100)}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={false}
                      axisLine={false}
                      width={52}
                    />
                    <Tooltip content={<ProjectionTooltip />} />
                    <ReferenceLine
                      y={retireTarget}
                      stroke="#c9a84c"
                      strokeDasharray="4 4"
                      label={{ value: 'TARGET', position: 'insideTopRight', fill: '#c9a84c', fontSize: 9, fontFamily: 'monospace' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      fill="url(#wealthGrad)"
                      dot={false}
                      activeDot={{ fill: '#a78bfa', r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <SectionLabel>Income Benchmark Table</SectionLabel>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr>
                      {['Gross', 'Monthly Net', 'Expenses', 'Savings', 'Investment', 'Inv. Rate', 'Lifestyle'].map((h) => (
                        <th key={h} className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground border-b border-border whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [200000, 12000, 7500, 1500, 3000, '18%', 'Comfortable Basics'],
                      [250000, 14500, 8500, 2000, 4000, '19%', 'Comfortable + Travel'],
                      [300000, 17000, 9500, 2500, 5000, '20%', 'Upper Comfortable'],
                      [350000, 19500, 10500, 3000, 6000, '21%', 'Premium Lifestyle'],
                      [400000, 22000, 11500, 3500, 7000, '22%', 'High-end Comfort'],
                      [450000, 24000, 12500, 4000, 8000, '23%', 'Affluent'],
                      [500000, 26500, 13500, 4500, 9000, '24%', 'Wealth-Builder'],
                    ].map((row, i) => {
                      const isActive = (row[0] as number) === Math.round(grossIncome / 50000) * 50000;
                      return (
                        <tr key={i} className={cn('transition-colors', isActive && 'bg-[--color-gold]/5 border-l-2 border-[--color-gold]')}>
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className={cn(
                                'px-3 py-2 font-mono text-xs border-b border-border/30 whitespace-nowrap',
                                j === 0 ? 'text-[--color-gold]' : j === 6 ? 'text-muted-foreground' : 'text-foreground/80'
                              )}
                            >
                              {typeof cell === 'number' ? formatAUD(cell * 100) : cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {insights.map((insight, i) => (
              <div key={i} className={cn('rounded-lg border p-4', insight.borderBg)}>
                <p className={cn('text-sm font-semibold mb-1.5', insight.textColor)}>{insight.title}</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{insight.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}

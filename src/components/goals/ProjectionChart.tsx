'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useNetWorthProjection, useFinancialSummary } from '@/hooks';
import { formatAUD, parseAUD } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

export function ProjectionChart() {
  const [monthlyContribution, setMonthlyContribution] = useState('1000');
  const [returnRate, setReturnRate] = useState(7);
  const [years, setYears] = useState(10);

  const { summary } = useFinancialSummary();
  // Use parseAUD for consistent NaN handling and currency parsing
  const contributionCents = parseAUD(monthlyContribution) ?? 0;

  const { projection } = useNetWorthProjection(contributionCents, returnRate / 100, years * 12);

  const growth = projection.projectedNetWorth - projection.currentNetWorth;
  const growthPercent =
    projection.currentNetWorth > 0
      ? ((growth / projection.currentNetWorth) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      {/* Current Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatAUD(projection.currentNetWorth)}</p>
            <p className="text-xs text-muted-foreground">
              Assets: {formatAUD(projection.totalAssets)} | Liabilities:{' '}
              {formatAUD(projection.totalLiabilities)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Projected Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatAUD(projection.projectedNetWorth)}
            </p>
            <p className="text-xs text-muted-foreground">
              In {years} years at {returnRate}% return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Projected Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">+{formatAUD(growth)}</p>
            <p className="text-xs text-muted-foreground">+{growthPercent}% from today</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Net Worth Projection
          </CardTitle>
          <CardDescription>
            Adjust parameters to see how your net worth could grow over time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="contribution">Monthly Savings ($)</Label>
              <Input
                id="contribution"
                type="number"
                min="0"
                step="100"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Expected Return</Label>
                <span className="text-sm font-medium">{returnRate}%</span>
              </div>
              <Slider
                value={[returnRate]}
                onValueChange={(v) => setReturnRate(v[0])}
                min={0}
                max={12}
                step={0.5}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Time Period</Label>
                <span className="text-sm font-medium">{years} years</span>
              </div>
              <Slider
                value={[years]}
                onValueChange={(v) => setYears(v[0])}
                min={1}
                max={30}
                step={1}
              />
            </div>
          </div>

          {/* Projection Timeline */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-4">Projection Timeline</h4>
            <div className="relative">
              {/* Timeline bar */}
              <div className="absolute top-4 left-0 right-0 h-1 bg-muted rounded-full">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Points */}
              <div className="flex justify-between relative z-10">
                {projection.points.slice(0, 6).map((point, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary border-2 border-background" />
                    <div className="mt-3 text-center">
                      <p className="text-xs font-medium">{formatAUD(point.value)}</p>
                      <p className="text-xs text-muted-foreground">{point.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Contributions Over Period</p>
              <p className="text-lg font-bold">
                {formatAUD(contributionCents * years * 12)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Estimated Investment Earnings</p>
              <p className="text-lg font-bold text-success">
                +{formatAUD(growth - contributionCents * years * 12)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useCompoundInterest } from '@/hooks';
import { formatAUD, parseAUD } from '@/lib/utils/currency';

export function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState('10000');
  const [monthlyContribution, setMonthlyContribution] = useState('500');
  const [annualRate, setAnnualRate] = useState(7);
  const [years, setYears] = useState(10);

  // Use parseAUD for consistent NaN handling and currency parsing
  const principalCents = parseAUD(principal) ?? 0;
  const monthlyCents = parseAUD(monthlyContribution) ?? 0;

  const { result } = useCompoundInterest(principalCents, monthlyCents, annualRate / 100, years);

  const contributionPercentage =
    result.futureValue > 0 ? (result.totalContributions / result.futureValue) * 100 : 0;
  const interestPercentage =
    result.futureValue > 0 ? (result.interestEarned / result.futureValue) * 100 : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Calculator Inputs</CardTitle>
          <CardDescription>Adjust the values to see how your money grows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="principal">Initial Investment ($)</Label>
            <Input
              id="principal"
              type="number"
              min="0"
              step="100"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly">Monthly Contribution ($)</Label>
            <Input
              id="monthly"
              type="number"
              min="0"
              step="50"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Annual Return Rate</Label>
              <span className="text-sm font-medium">{annualRate}%</span>
            </div>
            <Slider
              value={[annualRate]}
              onValueChange={(v) => setAnnualRate(v[0])}
              min={0}
              max={15}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>Conservative</span>
              <span>Aggressive</span>
              <span>15%</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Investment Period</Label>
              <span className="text-sm font-medium">{years} years</span>
            </div>
            <Slider
              value={[years]}
              onValueChange={(v) => setYears(v[0])}
              min={1}
              max={40}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 year</span>
              <span>40 years</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Projected Results</CardTitle>
          <CardDescription>After {years} years of compounding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Future Value */}
          <div className="text-center p-6 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">Future Value</p>
            <p className="text-4xl font-bold text-primary">{formatAUD(result.futureValue)}</p>
          </div>

          {/* Breakdown */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Contributions</span>
              <span className="font-medium">{formatAUD(result.totalContributions)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Interest Earned</span>
              <span className="font-medium text-success">
                +{formatAUD(result.interestEarned)}
              </span>
            </div>
          </div>

          {/* Visual Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Contributions ({contributionPercentage.toFixed(0)}%)</span>
              <span>Interest ({interestPercentage.toFixed(0)}%)</span>
            </div>
            <div className="h-4 rounded-full overflow-hidden flex">
              <div
                className="bg-muted-foreground/30 transition-all"
                style={{ width: `${contributionPercentage}%` }}
              />
              <div className="bg-green-500 transition-all" style={{ width: `${interestPercentage}%` }} />
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {result.totalContributions > 0
                  ? ((result.interestEarned / result.totalContributions) * 100).toFixed(0)
                  : '0'}%
              </p>
              <p className="text-xs text-muted-foreground">Return on contributions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {formatAUD(Math.round(result.futureValue / (years * 12)))}
              </p>
              <p className="text-xs text-muted-foreground">Avg. monthly value</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

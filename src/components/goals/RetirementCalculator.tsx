'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useRetirementProjection, useFinancialSummary } from '@/hooks';
import { formatAUD, parseAUD } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

export function RetirementCalculator() {
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(67);
  const [monthlySuperContribution, setMonthlySuperContribution] = useState('');
  const [monthlyInvestmentContribution, setMonthlyInvestmentContribution] = useState('');
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState('5000');

  const { summary } = useFinancialSummary();

  // Use parseAUD for consistent NaN handling and currency parsing
  const superContributionCents = parseAUD(monthlySuperContribution) ?? 0;
  const investmentContributionCents = parseAUD(monthlyInvestmentContribution) ?? 0;
  const targetIncomeCents = parseAUD(targetMonthlyIncome) ?? 500000; // Default $5000

  const { projection } = useRetirementProjection(
    currentAge,
    retirementAge,
    superContributionCents,
    investmentContributionCents,
    0.07,
    0.07,
    targetIncomeCents
  );

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Position</CardTitle>
          <CardDescription>Your existing retirement savings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/30 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Superannuation Balance</span>
              <span className="font-bold">{formatAUD(summary.superBalance)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Investment Holdings</span>
              <span className="font-bold">{formatAUD(summary.holdingsValue)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-medium">Total Retirement Savings</span>
              <span className="font-bold text-primary">
                {formatAUD(summary.superBalance + summary.holdingsValue)}
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Current Age</Label>
                <span className="text-sm font-medium">{currentAge} years</span>
              </div>
              <Slider
                value={[currentAge]}
                onValueChange={(v) => setCurrentAge(v[0])}
                min={18}
                max={70}
                step={1}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Retirement Age</Label>
                <span className="text-sm font-medium">{retirementAge} years</span>
              </div>
              <Slider
                value={[retirementAge]}
                onValueChange={(v) => setRetirementAge(v[0])}
                min={currentAge + 1}
                max={75}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                {yearsToRetirement} years until retirement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contributions */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Contributions</CardTitle>
          <CardDescription>Expected regular savings towards retirement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="superContrib">Super Contributions ($/month)</Label>
            <Input
              id="superContrib"
              type="number"
              min="0"
              step="50"
              value={monthlySuperContribution}
              onChange={(e) => setMonthlySuperContribution(e.target.value)}
              placeholder="Employer SG + voluntary"
            />
            <p className="text-xs text-muted-foreground">
              Include employer SG (11.5%) + any salary sacrifice
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="investContrib">Investment Contributions ($/month)</Label>
            <Input
              id="investContrib"
              type="number"
              min="0"
              step="50"
              value={monthlyInvestmentContribution}
              onChange={(e) => setMonthlyInvestmentContribution(e.target.value)}
              placeholder="Outside super"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetIncome">Desired Monthly Income in Retirement ($)</Label>
            <Input
              id="targetIncome"
              type="number"
              min="0"
              step="100"
              value={targetMonthlyIncome}
              onChange={(e) => setTargetMonthlyIncome(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Projection Results */}
      {projection && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Retirement Projection
            </CardTitle>
            <CardDescription>
              Based on 7% return (super earnings taxed at 15%), 4% withdrawal rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Projected Balance */}
              <div
                className={cn(
                  'p-6 rounded-lg text-center',
                  projection.isOnTrack ? 'bg-green-500/10' : 'bg-amber-500/10'
                )}
              >
                <p className="text-sm text-muted-foreground mb-2">Projected Balance at {retirementAge}</p>
                <p className="text-3xl font-bold">
                  {formatAUD(projection.projectedBalance)}
                </p>
                <div className="mt-3 flex items-center justify-center gap-1 text-sm">
                  {projection.isOnTrack ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-success">On track</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-amber-600">May need adjustment</span>
                    </>
                  )}
                </div>
              </div>

              {/* Monthly Income */}
              <div className="p-6 rounded-lg bg-primary/5 text-center">
                <p className="text-sm text-muted-foreground mb-2">Estimated Monthly Income</p>
                <p className="text-3xl font-bold text-primary">
                  {formatAUD(projection.monthlyIncomeAtRetirement)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Sustainable for ~{projection.yearsOfIncome} years
                </p>
              </div>

              {/* Balance Breakdown */}
              <div className="p-6 rounded-lg bg-muted/30 space-y-3">
                <p className="text-sm font-medium">Balance Breakdown</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Super (after 15% tax)</span>
                    <span>{formatAUD(projection.superBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Investments</span>
                    <span>{formatAUD(projection.investmentBalance)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            {!projection.isOnTrack && projection.requiredMonthlyContribution && (
              <div className="mt-6 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-sm">
                  <span className="font-medium">Recommendation:</span> To reach your target of{' '}
                  {formatAUD(targetIncomeCents)}/month income, consider increasing your total
                  monthly contributions to approximately{' '}
                  <span className="font-bold">
                    {formatAUD(projection.requiredMonthlyContribution)}
                  </span>
                  .
                </p>
              </div>
            )}

            {/* Assumptions */}
            <div className="mt-6 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Assumptions:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Super earnings: 7% gross, 5.95% net (after 15% tax)</li>
                <li>Investment returns: 7% (before personal tax)</li>
                <li>Preservation age: 60 (for those born after 1 July 1964)</li>
                <li>Retirement withdrawal rate: 4% per annum (sustainable)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatAUD, centsToDollars } from "@/lib/utils/currency";
import { calculateRequiredRentForYield } from "@/lib/utils/property-yield";

interface ReverseCalculatorProps {
  purchasePrice: number; // cents
  annualExpenses: number; // cents
}

const TARGET_YIELDS = [4, 4.5, 5, 5.5, 6, 6.5, 7];

export function ReverseCalculator({
  purchasePrice,
  annualExpenses,
}: ReverseCalculatorProps) {
  const [targetYield, setTargetYield] = useState(5);

  const requiredRent = useMemo(() => {
    if (purchasePrice <= 0 || targetYield <= 0) return null;

    // For gross yield: required annual rent = price × yield / 100
    const annualRent = calculateRequiredRentForYield(purchasePrice, targetYield);
    const weeklyRent = Math.round(annualRent / 52);

    // For net yield, we need to add expenses back
    const netAnnualRent = Math.round(
      ((purchasePrice * targetYield) / 100) + annualExpenses
    );
    const netWeeklyRent = Math.round(netAnnualRent / 52);

    return {
      grossAnnual: annualRent,
      grossWeekly: weeklyRent,
      netAnnual: netAnnualRent,
      netWeekly: netWeeklyRent,
    };
  }, [purchasePrice, targetYield, annualExpenses]);

  const presetYields = useMemo(() => {
    if (purchasePrice <= 0) return [];

    return TARGET_YIELDS.map((yield_) => {
      const annualRent = calculateRequiredRentForYield(purchasePrice, yield_);
      const weeklyRent = Math.round(annualRent / 52);
      return {
        yield: yield_,
        weeklyRent,
        annualRent,
      };
    });
  }, [purchasePrice]);

  if (purchasePrice <= 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Enter a property value to calculate required rent
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Target Yield Calculator
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Find the rent needed to achieve your target yield
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Custom Target Input */}
        <div className="space-y-2">
          <Label htmlFor="targetYield">Target Gross Yield (%)</Label>
          <div className="relative">
            <Input
              id="targetYield"
              type="number"
              step="0.1"
              value={targetYield}
              onChange={(e) => setTargetYield(parseFloat(e.target.value) || 0)}
            />
            <span className="absolute right-3 top-2.5 text-muted-foreground">
              %
            </span>
          </div>
        </div>

        {/* Result */}
        {requiredRent && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground mb-2">
              Required rent for {targetYield}% gross yield:
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                ${centsToDollars(requiredRent.grossWeekly).toLocaleString()}
              </span>
              <span className="text-muted-foreground">/week</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatAUD(requiredRent.grossAnnual)} per year
            </p>

            {annualExpenses > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  For {targetYield}% net yield (after expenses):
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    ${centsToDollars(requiredRent.netWeekly).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">/week</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preset Yields Table */}
        <div>
          <p className="text-sm font-medium mb-3">Quick Reference</p>
          <div className="grid grid-cols-2 gap-2">
            {presetYields.map((preset) => (
              <button
                key={preset.yield}
                onClick={() => setTargetYield(preset.yield)}
                className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                  targetYield === preset.yield
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted"
                }`}
              >
                <Badge
                  variant={targetYield === preset.yield ? "default" : "outline"}
                >
                  {preset.yield}%
                </Badge>
                <span className="font-medium">
                  ${centsToDollars(preset.weeklyRent).toLocaleString()}/wk
                </span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

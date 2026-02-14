"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatAUD, centsToDollars } from "@/lib/utils/currency";
import { calculateGrossYield, calculateNetYield, assessYield } from "@/lib/utils/property-yield";
import type { RentScenario } from "@/types";

interface YieldScenariosProps {
  purchasePrice: number; // cents
  currentWeeklyRent: number; // cents
  annualExpenses: number; // cents
}

const assessmentColors = {
  excellent: "bg-success",
  good: "bg-primary",
  fair: "bg-warning",
  poor: "bg-destructive",
};

export function YieldScenarios({
  purchasePrice,
  currentWeeklyRent,
  annualExpenses,
}: YieldScenariosProps) {
  const scenarios = useMemo<RentScenario[]>(() => {
    if (purchasePrice <= 0 || currentWeeklyRent <= 0) return [];

    // Generate scenarios at different rent levels
    const percentages = [-10, -5, 0, 5, 10, 15];

    return percentages.map((pct) => {
      const weeklyRent = Math.round(currentWeeklyRent * (1 + pct / 100));
      const annualRent = weeklyRent * 52;
      const grossYield = calculateGrossYield(annualRent, purchasePrice);
      const netYield = calculateNetYield(annualRent, annualExpenses, purchasePrice);
      const assessment = assessYield(grossYield);

      return {
        weeklyRent,
        annualRent,
        grossYield,
        netYield,
        assessment: assessment.category,
      };
    });
  }, [purchasePrice, currentWeeklyRent, annualExpenses]);

  if (scenarios.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Enter property value and rent to see scenarios
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Rent Scenario Comparison
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          See how different rent levels affect your yield
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Weekly Rent</TableHead>
              <TableHead className="text-right">Gross Yield</TableHead>
              <TableHead className="text-right">Net Yield</TableHead>
              <TableHead className="text-right">Rating</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scenarios.map((scenario, index) => {
              const isCurrent = index === 2; // 0% change is current

              return (
                <TableRow
                  key={scenario.weeklyRent}
                  className={isCurrent ? "bg-muted/50" : ""}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        ${centsToDollars(scenario.weeklyRent).toLocaleString()}
                      </span>
                      {isCurrent && (
                        <Badge variant="outline" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatAUD(scenario.annualRent)}/year
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {scenario.grossYield.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {scenario.netYield.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={assessmentColors[scenario.assessment]}>
                      {scenario.assessment.charAt(0).toUpperCase() +
                        scenario.assessment.slice(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

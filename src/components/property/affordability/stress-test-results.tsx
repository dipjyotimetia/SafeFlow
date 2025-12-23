"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAUD } from "@/lib/utils/currency";
import type { StressTestScenario } from "@/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StressTestResultsProps {
  scenarios: StressTestScenario[];
  baseRate: number;
}

const statusColors = {
  green: "bg-green-500",
  amber: "bg-yellow-500",
  red: "bg-red-500",
};

export function StressTestResults({
  scenarios,
  baseRate,
}: StressTestResultsProps) {
  if (scenarios.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Interest Rate Stress Test
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          How your cashflow changes if rates rise
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scenario</TableHead>
              <TableHead className="text-right">Repayment</TableHead>
              <TableHead className="text-right">Cashflow</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scenarios.map((scenario) => (
              <TableRow key={scenario.rateIncrease}>
                <TableCell>
                  <div>
                    <span className="font-medium">
                      +{scenario.rateIncrease}%
                    </span>
                    <span className="text-muted-foreground ml-2">
                      ({scenario.newRate.toFixed(1)}%)
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatAUD(scenario.newRepayment)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {scenario.monthlyCashflow >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : scenario.monthlyCashflow >= -50000 ? (
                      <Minus className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={
                        scenario.monthlyCashflow >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {scenario.monthlyCashflow >= 0 ? "+" : ""}
                      {formatAUD(scenario.monthlyCashflow)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge className={statusColors[scenario.status]}>
                    {scenario.status === "green"
                      ? "OK"
                      : scenario.status === "amber"
                      ? "Tight"
                      : "Risk"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 p-3 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Stress tests show impact from the assessment
            rate ({baseRate.toFixed(1)}%). Banks already test at this higher
            rate to ensure you can handle rate rises.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

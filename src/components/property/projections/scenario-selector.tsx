"use client";

/**
 * Projection Scenario Selector
 *
 * Allows users to select between conservative, moderate, and optimistic
 * growth scenarios for property projections.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CAPITAL_GROWTH_RATES,
  RENT_GROWTH_RATES,
  EXPENSE_GROWTH_RATE,
  type GrowthScenario,
} from "@/lib/utils/property-projections";

// ============ Types ============

export type ScenarioType = "conservative" | "moderate" | "optimistic";

interface ScenarioSelectorProps {
  selected: ScenarioType;
  onSelect: (scenario: ScenarioType) => void;
  className?: string;
}

interface ScenarioDetailsProps {
  scenario: ScenarioType;
  className?: string;
}

interface GrowthAssumptions {
  capitalGrowthRate: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
  vacancyRate: number;
}

// ============ Scenario Metadata ============

const SCENARIO_INFO: Record<
  ScenarioType,
  {
    label: string;
    description: string;
    vacancyRate: number;
    color: string;
  }
> = {
  conservative: {
    label: "Conservative",
    description: "Lower growth, higher costs - stress test scenario",
    vacancyRate: 3.0,
    color: "text-warning",
  },
  moderate: {
    label: "Moderate",
    description: "Long-term average growth rates",
    vacancyRate: 2.0,
    color: "text-primary",
  },
  optimistic: {
    label: "Optimistic",
    description: "Above-average growth, favorable conditions",
    vacancyRate: 1.0,
    color: "text-success",
  },
};

function getAssumptions(scenario: ScenarioType): GrowthAssumptions {
  return {
    capitalGrowthRate: CAPITAL_GROWTH_RATES[scenario],
    rentGrowthRate: RENT_GROWTH_RATES[scenario],
    expenseGrowthRate: EXPENSE_GROWTH_RATE,
    vacancyRate: SCENARIO_INFO[scenario].vacancyRate,
  };
}

// ============ Components ============

export function ScenarioSelector({
  selected,
  onSelect,
  className,
}: ScenarioSelectorProps) {
  return (
    <Tabs
      value={selected}
      onValueChange={(value) => onSelect(value as ScenarioType)}
      className={className}
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="conservative" className="text-xs">
          Conservative
        </TabsTrigger>
        <TabsTrigger value="moderate" className="text-xs">
          Moderate
        </TabsTrigger>
        <TabsTrigger value="optimistic" className="text-xs">
          Optimistic
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export function ScenarioDetails({ scenario, className }: ScenarioDetailsProps) {
  const info = SCENARIO_INFO[scenario];
  const assumptions = getAssumptions(scenario);

  return (
    <Card className={cn("border-l-4", className)} style={{ borderLeftColor: `var(--${scenario === "conservative" ? "amber" : scenario === "moderate" ? "blue" : "emerald"}-500)` }}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={info.color}>{info.label}</span>
          <Badge variant="outline" className="text-xs font-normal">
            {assumptions.capitalGrowthRate}% capital growth
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{info.description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Capital Growth</p>
            <p className="font-medium">{assumptions.capitalGrowthRate}% p.a.</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Rent Growth</p>
            <p className="font-medium">{assumptions.rentGrowthRate}% p.a.</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Expense Increase</p>
            <p className="font-medium">{assumptions.expenseGrowthRate}% p.a.</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Vacancy Rate</p>
            <p className="font-medium">{assumptions.vacancyRate}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Combined Selector with Details ============

interface ScenarioSelectorWithDetailsProps {
  selected: ScenarioType;
  onSelect: (scenario: ScenarioType) => void;
  showDetails?: boolean;
  className?: string;
}

export function ScenarioSelectorWithDetails({
  selected,
  onSelect,
  showDetails = true,
  className,
}: ScenarioSelectorWithDetailsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <ScenarioSelector selected={selected} onSelect={onSelect} />
      {showDetails && <ScenarioDetails scenario={selected} />}
    </div>
  );
}

// ============ Hook for Scenario State ============

export function useProjectionScenario(defaultScenario: ScenarioType = "moderate") {
  const [scenario, setScenario] = useState<ScenarioType>(defaultScenario);

  const assumptions = getAssumptions(scenario);

  return {
    scenario,
    setScenario,
    assumptions,
    info: SCENARIO_INFO[scenario],
    growthScenario: scenario as GrowthScenario,
  };
}

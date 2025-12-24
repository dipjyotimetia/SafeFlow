"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { YieldInputs } from "@/components/property/yield/yield-inputs";
import { YieldResults } from "@/components/property/yield/yield-results";
import { YieldScenarios } from "@/components/property/yield/yield-scenarios";
import { ReverseCalculator } from "@/components/property/yield/reverse-calculator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateGrossYield,
  calculateNetYield,
  assessYield,
} from "@/lib/utils/property-yield";
import type { YieldCalculatorInputs, YieldCalculatorResults } from "@/types";

export default function YieldCalculatorPage() {
  const [inputs, setInputs] = useState<YieldCalculatorInputs>({
    purchasePrice: 60000000, // $600,000
    weeklyRent: 55000, // $550/week
    annualExpenses: 0,
  });

  const results = useMemo<YieldCalculatorResults | null>(() => {
    if (inputs.purchasePrice <= 0 || inputs.weeklyRent <= 0) {
      return null;
    }

    const annualRent = inputs.weeklyRent * 52;
    const annualExpenses = inputs.annualExpenses || 0;
    const netOperatingIncome = annualRent - annualExpenses;

    const grossYield = calculateGrossYield(annualRent, inputs.purchasePrice);
    const netYield = calculateNetYield(
      annualRent,
      annualExpenses,
      inputs.purchasePrice
    );
    const assessment = assessYield(grossYield);

    return {
      grossYield,
      netYield,
      annualRent,
      annualExpenses,
      netOperatingIncome,
      assessment,
    };
  }, [inputs]);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/property">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Rental Yield Calculator</h1>
          <p className="text-muted-foreground">
            Calculate gross and net yield for investment properties
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Inputs */}
        <div>
          <YieldInputs inputs={inputs} onChange={setInputs} />
        </div>

        {/* Right: Results */}
        <div className="space-y-6">
          <YieldResults results={results} />

          <Tabs defaultValue="scenarios" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scenarios">Rent Scenarios</TabsTrigger>
              <TabsTrigger value="reverse">Target Yield</TabsTrigger>
            </TabsList>
            <TabsContent value="scenarios">
              <YieldScenarios
                purchasePrice={inputs.purchasePrice}
                currentWeeklyRent={inputs.weeklyRent}
                annualExpenses={inputs.annualExpenses || 0}
              />
            </TabsContent>
            <TabsContent value="reverse">
              <ReverseCalculator
                purchasePrice={inputs.purchasePrice}
                annualExpenses={inputs.annualExpenses || 0}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

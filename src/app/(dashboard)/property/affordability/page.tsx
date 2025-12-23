"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BorrowerInputs } from "@/components/property/affordability/borrower-inputs";
import { DebtInputs } from "@/components/property/affordability/debt-inputs";
import { PropertyInputs } from "@/components/property/affordability/property-inputs";
import { AffordabilityResults } from "@/components/property/affordability/affordability-results";
import { StressTestResults } from "@/components/property/affordability/stress-test-results";
import { RiskMetricsCard } from "@/components/property/affordability/risk-metrics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateAffordability,
  generateStressTests,
  calculateRiskMetrics,
  createDefaultAffordabilityInputs,
  APRA_BUFFER_DEFAULT,
} from "@/lib/utils/affordability";
import type { AffordabilityInputs, AffordabilityResults as AffordabilityResultsType, StressTestScenario, RiskMetrics } from "@/types";

export default function AffordabilityCalculatorPage() {
  const [inputs, setInputs] = useState<AffordabilityInputs>(
    createDefaultAffordabilityInputs()
  );

  const results = useMemo<AffordabilityResultsType | null>(() => {
    if (inputs.borrower.grossAnnualIncome <= 0) {
      return null;
    }
    return calculateAffordability(inputs);
  }, [inputs]);

  // Calculate proposed loan amount (used by stress tests and risk metrics)
  const proposedLoan = useMemo(() => {
    if (!results) return 0;
    let loan = results.maxBorrowingAmount;
    if (inputs.purchasePrice) {
      const deposit =
        inputs.depositAmount ||
        Math.round((inputs.purchasePrice * (inputs.depositPercent || 20)) / 100);
      loan = Math.min(inputs.purchasePrice - deposit, results.maxBorrowingAmount);
    }
    return loan;
  }, [results, inputs.purchasePrice, inputs.depositAmount, inputs.depositPercent]);

  const stressTests = useMemo<StressTestScenario[]>(() => {
    if (!results || proposedLoan <= 0) return [];

    return generateStressTests(
      proposedLoan,
      inputs.interestRate + inputs.apraBuffer, // Use assessment rate
      inputs.loanTermYears,
      results.availableForHousing,
      inputs.isInterestOnly
    );
  }, [results, proposedLoan, inputs.interestRate, inputs.apraBuffer, inputs.loanTermYears, inputs.isInterestOnly]);

  // Calculate risk metrics for investment properties
  const riskMetrics = useMemo<RiskMetrics | null>(() => {
    if (!results || !inputs.expectedWeeklyRent || proposedLoan <= 0) return null;

    // Estimate monthly expenses (roughly 1% of property value annually / 12)
    const estimatedMonthlyExpenses = inputs.purchasePrice
      ? Math.round((inputs.purchasePrice * 0.01) / 12)
      : 0;

    return calculateRiskMetrics(
      proposedLoan,
      inputs.interestRate,
      inputs.expectedWeeklyRent,
      estimatedMonthlyExpenses,
      results.availableForHousing,
      inputs.isInterestOnly,
      inputs.loanTermYears
    );
  }, [results, inputs.expectedWeeklyRent, inputs.purchasePrice, proposedLoan, inputs.interestRate, inputs.isInterestOnly, inputs.loanTermYears]);

  const updateBorrower = (
    updates: Partial<AffordabilityInputs["borrower"]>
  ) => {
    setInputs((prev) => ({
      ...prev,
      borrower: { ...prev.borrower, ...updates },
    }));
  };

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
          <h1 className="text-2xl font-bold">Affordability Calculator</h1>
          <p className="text-muted-foreground">
            APRA-style serviceability assessment with {APRA_BUFFER_DEFAULT}%
            buffer
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Inputs */}
        <div className="space-y-4">
          <Tabs defaultValue="borrower" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="borrower">Income</TabsTrigger>
              <TabsTrigger value="debts">Debts</TabsTrigger>
              <TabsTrigger value="property">Loan</TabsTrigger>
            </TabsList>

            <TabsContent value="borrower" className="mt-4">
              <BorrowerInputs
                borrower={inputs.borrower}
                onChange={updateBorrower}
              />
            </TabsContent>

            <TabsContent value="debts" className="mt-4">
              <DebtInputs
                debts={inputs.existingDebts}
                grossAnnualIncome={inputs.borrower.grossAnnualIncome}
                onChange={(debts) =>
                  setInputs((prev) => ({ ...prev, existingDebts: debts }))
                }
              />
            </TabsContent>

            <TabsContent value="property" className="mt-4">
              <PropertyInputs
                inputs={inputs}
                onChange={(updates) =>
                  setInputs((prev) => ({ ...prev, ...updates }))
                }
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Results */}
        <div className="space-y-6">
          <AffordabilityResults results={results} />
          {stressTests.length > 0 && (
            <StressTestResults
              scenarios={stressTests}
              baseRate={inputs.interestRate + inputs.apraBuffer}
            />
          )}
          {riskMetrics && (
            <RiskMetricsCard
              metrics={riskMetrics}
              rentalCoverageRatio={results?.rentalCoverageRatio}
            />
          )}
        </div>
      </div>
    </div>
  );
}

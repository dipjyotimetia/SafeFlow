"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { dollarsToCents, centsToDollars, formatAUD } from "@/lib/utils/currency";
import { calculateHecsRepayment, CREDIT_CARD_MONTHLY_FACTOR } from "@/lib/utils/affordability";
import type { ExistingDebt, DebtType } from "@/types";
import { v4 as uuid } from "uuid";

interface DebtInputsProps {
  debts: ExistingDebt[];
  grossAnnualIncome: number;
  onChange: (debts: ExistingDebt[]) => void;
}

const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: "credit-card", label: "Credit Card" },
  { value: "personal-loan", label: "Personal Loan" },
  { value: "car-loan", label: "Car Loan" },
  { value: "hecs-help", label: "HECS/HELP" },
  { value: "other-mortgage", label: "Other Mortgage" },
  { value: "other", label: "Other" },
];

export function DebtInputs({ debts, grossAnnualIncome, onChange }: DebtInputsProps) {
  const addDebt = () => {
    const newDebt: ExistingDebt = {
      id: uuid(),
      type: "credit-card",
      currentBalance: 0,
    };
    onChange([...debts, newDebt]);
  };

  const removeDebt = (id: string) => {
    onChange(debts.filter((d) => d.id !== id));
  };

  const updateDebt = (id: string, updates: Partial<ExistingDebt>) => {
    onChange(
      debts.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const calculateMonthlyForDebt = (debt: ExistingDebt): number => {
    switch (debt.type) {
      case "credit-card":
        const limit = debt.creditLimit || debt.currentBalance;
        return Math.round(limit * CREDIT_CARD_MONTHLY_FACTOR);
      case "hecs-help":
        return calculateHecsRepayment(grossAnnualIncome);
      default:
        return debt.monthlyRepayment || 0;
    }
  };

  const totalMonthly = debts.reduce(
    (sum, debt) => sum + calculateMonthlyForDebt(debt),
    0
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">
                Existing Debts
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Include all existing financial commitments
              </p>
            </div>
            <Button size="sm" onClick={addDebt}>
              <Plus className="h-4 w-4 mr-1" />
              Add Debt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {debts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No existing debts. Click &quot;Add Debt&quot; to add one.
            </div>
          ) : (
            <div className="space-y-4">
              {debts.map((debt) => (
                <div
                  key={debt.id}
                  className="rounded-lg border p-4 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <Label>Debt Type</Label>
                      <Select
                        value={debt.type}
                        onValueChange={(v) =>
                          updateDebt(debt.id, { type: v as DebtType })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEBT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeDebt(debt.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {debt.type === "credit-card" && (
                    <div className="space-y-2">
                      <Label>Credit Limit</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          className="pl-7"
                          value={centsToDollars(debt.creditLimit || 0)}
                          onChange={(e) =>
                            updateDebt(debt.id, {
                              creditLimit: dollarsToCents(
                                parseFloat(e.target.value) || 0
                              ),
                            })
                          }
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Banks assume 3% of limit as monthly repayment
                      </p>
                    </div>
                  )}

                  {debt.type === "hecs-help" && (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-sm text-muted-foreground">
                        Monthly repayment (2025-26 marginal rates):
                      </p>
                      <p className="font-bold">
                        {formatAUD(calculateHecsRepayment(grossAnnualIncome))}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nil below $67,000. Marginal rates apply above.
                      </p>
                    </div>
                  )}

                  {!["credit-card", "hecs-help"].includes(debt.type) && (
                    <div className="space-y-2">
                      <Label>Monthly Repayment</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          className="pl-7"
                          value={centsToDollars(debt.monthlyRepayment || 0)}
                          onChange={(e) =>
                            updateDebt(debt.id, {
                              monthlyRepayment: dollarsToCents(
                                parseFloat(e.target.value) || 0
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {debt.type !== "hecs-help" && (
                    <div className="text-sm text-muted-foreground">
                      Assessed at:{" "}
                      <span className="font-medium text-foreground">
                        {formatAUD(calculateMonthlyForDebt(debt))}/month
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {debts.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Monthly Debt Payments</span>
                <span className="text-lg font-bold">
                  {formatAUD(totalMonthly)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

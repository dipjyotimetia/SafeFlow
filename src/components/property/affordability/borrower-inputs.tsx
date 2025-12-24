"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { dollarsToCents, centsToDollars, formatAUD } from "@/lib/utils/currency";
import { getHEM } from "@/lib/utils/affordability";
import type { BorrowerProfile, LivingExpensesType } from "@/types";

interface BorrowerInputsProps {
  borrower: BorrowerProfile;
  onChange: (updates: Partial<BorrowerProfile>) => void;
}

export function BorrowerInputs({ borrower, onChange }: BorrowerInputsProps) {
  const [hasPartner, setHasPartner] = useState(
    (borrower.partnerGrossIncome || 0) > 0
  );

  const handleIncomeChange = (
    field: "grossAnnualIncome" | "partnerGrossIncome",
    dollars: string
  ) => {
    const cents = dollarsToCents(parseFloat(dollars) || 0);
    onChange({ [field]: cents });
  };

  const totalIncome =
    borrower.grossAnnualIncome + (borrower.partnerGrossIncome || 0);

  const estimatedHEM = getHEM(
    totalIncome,
    hasPartner,
    borrower.numberOfDependents
  );

  return (
    <div className="space-y-4">
      {/* Primary Income */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Your Income</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grossIncome">Gross Annual Income (before tax)</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">
                $
              </span>
              <Input
                id="grossIncome"
                type="number"
                className="pl-7"
                value={centsToDollars(borrower.grossAnnualIncome)}
                onChange={(e) =>
                  handleIncomeChange("grossAnnualIncome", e.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partner Income */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Partner/Co-applicant
            </CardTitle>
            <Switch
              checked={hasPartner}
              onCheckedChange={(checked) => {
                setHasPartner(checked);
                if (!checked) {
                  onChange({ partnerGrossIncome: undefined });
                }
              }}
            />
          </div>
        </CardHeader>
        {hasPartner && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partnerIncome">Partner Gross Annual Income</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="partnerIncome"
                  type="number"
                  className="pl-7"
                  value={centsToDollars(borrower.partnerGrossIncome || 0)}
                  onChange={(e) =>
                    handleIncomeChange("partnerGrossIncome", e.target.value)
                  }
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Dependents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Dependents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="dependents">Number of Dependent Children</Label>
            <Select
              value={String(borrower.numberOfDependents)}
              onValueChange={(v) =>
                onChange({ numberOfDependents: parseInt(v) })
              }
            >
              <SelectTrigger id="dependents">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 0 ? "None" : n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Living Expenses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Living Expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Expense Method</Label>
            <Select
              value={borrower.livingExpensesType}
              onValueChange={(v) =>
                onChange({ livingExpensesType: v as LivingExpensesType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hem">
                  Use HEM (Household Expenditure Measure)
                </SelectItem>
                <SelectItem value="declared">Declare My Own</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {borrower.livingExpensesType === "hem" ? (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                Estimated monthly expenses (HEM):
              </p>
              <p className="text-lg font-bold">{formatAUD(estimatedHEM)}/month</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatAUD(estimatedHEM * 12)}/year
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="declaredExpenses">
                Annual Living Expenses
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="declaredExpenses"
                  type="number"
                  className="pl-7"
                  value={centsToDollars(borrower.declaredLivingExpenses || 0)}
                  onChange={(e) =>
                    onChange({
                      declaredLivingExpenses: dollarsToCents(
                        parseFloat(e.target.value) || 0
                      ),
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Banks may use HEM if your declared expenses are lower
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

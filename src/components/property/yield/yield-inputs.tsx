"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { dollarsToCents, centsToDollars } from "@/lib/utils/currency";
import type { YieldCalculatorInputs } from "@/types";

interface YieldInputsProps {
  inputs: YieldCalculatorInputs;
  onChange: (inputs: YieldCalculatorInputs) => void;
}

export function YieldInputs({ inputs, onChange }: YieldInputsProps) {
  const [showExpenses, setShowExpenses] = useState(
    (inputs.annualExpenses || 0) > 0
  );

  const handleCurrencyChange = (
    field: keyof YieldCalculatorInputs,
    dollars: string
  ) => {
    const cents = dollarsToCents(parseFloat(dollars) || 0);
    onChange({ ...inputs, [field]: cents });
  };

  return (
    <div className="space-y-4">
      {/* Property Value */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Property Value</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">
                $
              </span>
              <Input
                id="purchasePrice"
                type="number"
                className="pl-7"
                value={centsToDollars(inputs.purchasePrice)}
                onChange={(e) =>
                  handleCurrencyChange("purchasePrice", e.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rental Income */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Rental Income</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weeklyRent">Weekly Rent</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">
                $
              </span>
              <Input
                id="weeklyRent"
                type="number"
                className="pl-7"
                value={centsToDollars(inputs.weeklyRent)}
                onChange={(e) =>
                  handleCurrencyChange("weeklyRent", e.target.value)
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Annual: ${((inputs.weeklyRent * 52) / 100).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Optional Expenses */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Annual Expenses (Optional)
            </CardTitle>
            <Switch
              checked={showExpenses}
              onCheckedChange={(checked) => {
                setShowExpenses(checked);
                if (!checked) {
                  onChange({ ...inputs, annualExpenses: 0 });
                }
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Include expenses for net yield calculation
          </p>
        </CardHeader>
        {showExpenses && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="annualExpenses">Total Annual Expenses</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="annualExpenses"
                  type="number"
                  className="pl-7"
                  value={centsToDollars(inputs.annualExpenses || 0)}
                  onChange={(e) =>
                    handleCurrencyChange("annualExpenses", e.target.value)
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Council rates, insurance, management fees, maintenance, etc.
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

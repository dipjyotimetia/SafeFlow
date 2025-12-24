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
import { dollarsToCents, centsToDollars } from "@/lib/utils/currency";
import { APRA_BUFFER_DEFAULT } from "@/lib/utils/affordability";
import type { AffordabilityInputs } from "@/types";

interface PropertyInputsProps {
  inputs: AffordabilityInputs;
  onChange: (updates: Partial<AffordabilityInputs>) => void;
}

export function PropertyInputs({ inputs, onChange }: PropertyInputsProps) {
  const [mode, setMode] = useState<"capacity" | "property">(
    inputs.purchasePrice ? "property" : "capacity"
  );

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            What do you want to calculate?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={mode}
            onValueChange={(v) => {
              setMode(v as "capacity" | "property");
              if (v === "capacity") {
                onChange({ purchasePrice: undefined, depositAmount: undefined });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="capacity">
                How much can I borrow?
              </SelectItem>
              <SelectItem value="property">
                Can I afford this property?
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Property Details (if mode is property) */}
      {mode === "property" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Property Details
            </CardTitle>
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
                  value={centsToDollars(inputs.purchasePrice || 0)}
                  onChange={(e) =>
                    onChange({
                      purchasePrice: dollarsToCents(
                        parseFloat(e.target.value) || 0
                      ),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="depositPercent">Deposit %</Label>
              <div className="relative">
                <Input
                  id="depositPercent"
                  type="number"
                  value={inputs.depositPercent || 20}
                  onChange={(e) =>
                    onChange({
                      depositPercent: parseFloat(e.target.value) || 20,
                    })
                  }
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground">
                  %
                </span>
              </div>
              {inputs.purchasePrice && (
                <p className="text-xs text-muted-foreground">
                  Deposit: $
                  {Math.round(
                    (inputs.purchasePrice * (inputs.depositPercent || 20)) /
                      100 /
                      100
                  ).toLocaleString()}
                </p>
              )}
            </div>

            {/* Investment Property Rent */}
            <div className="space-y-2">
              <Label htmlFor="expectedWeeklyRent">
                Expected Weekly Rent (Investment)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="expectedWeeklyRent"
                  type="number"
                  className="pl-7"
                  placeholder="Leave blank for owner-occupied"
                  value={
                    inputs.expectedWeeklyRent
                      ? centsToDollars(inputs.expectedWeeklyRent)
                      : ""
                  }
                  onChange={(e) =>
                    onChange({
                      expectedWeeklyRent: e.target.value
                        ? dollarsToCents(parseFloat(e.target.value) || 0)
                        : undefined,
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter expected rent to see investment risk metrics
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loan Assumptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Loan Assumptions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate</Label>
              <div className="relative">
                <Input
                  id="interestRate"
                  type="number"
                  step="0.1"
                  value={inputs.interestRate}
                  onChange={(e) =>
                    onChange({
                      interestRate: parseFloat(e.target.value) || 6.5,
                    })
                  }
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apraBuffer">APRA Buffer</Label>
              <div className="relative">
                <Input
                  id="apraBuffer"
                  type="number"
                  step="0.5"
                  value={inputs.apraBuffer}
                  onChange={(e) =>
                    onChange({
                      apraBuffer:
                        parseFloat(e.target.value) || APRA_BUFFER_DEFAULT,
                    })
                  }
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">Assessment Rate:</p>
            <p className="text-lg font-bold">
              {(inputs.interestRate + inputs.apraBuffer).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Banks assess serviceability at this higher rate
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loanTerm">Loan Term (years)</Label>
            <Select
              value={String(inputs.loanTermYears)}
              onValueChange={(v) =>
                onChange({ loanTermYears: parseInt(v) || 30 })
              }
            >
              <SelectTrigger id="loanTerm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 25, 30].map((years) => (
                  <SelectItem key={years} value={String(years)}>
                    {years} years
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="interestOnly">Interest Only</Label>
              <p className="text-xs text-muted-foreground">
                Calculate using interest-only payments
              </p>
            </div>
            <Switch
              id="interestOnly"
              checked={inputs.isInterestOnly}
              onCheckedChange={(checked) =>
                onChange({ isInterestOnly: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

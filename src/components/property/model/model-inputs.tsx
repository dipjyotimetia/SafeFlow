"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { PropertyAssumptions, AustralianState, PropertyType, LoanType } from "@/types";
import { dollarsToCents, centsToDollars } from "@/lib/utils/currency";

interface ModelInputsProps {
  assumptions: PropertyAssumptions;
  onChange: (assumptions: PropertyAssumptions) => void;
}

const STATES: { value: AustralianState; label: string }[] = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "NT", label: "Northern Territory" },
  { value: "ACT", label: "Australian Capital Territory" },
];

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "townhouse", label: "Townhouse" },
  { value: "unit", label: "Unit" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

const LOAN_TYPES: { value: LoanType; label: string }[] = [
  { value: "interest-only", label: "Interest Only" },
  { value: "principal-interest", label: "Principal + Interest" },
  { value: "variable", label: "Variable" },
  { value: "fixed", label: "Fixed" },
];

// 2025-26 Marginal Tax Rates (ATO)
// Rates include 2% Medicare levy for investment income calculations
// https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
const MARGINAL_TAX_RATES: { value: number; label: string; income: string }[] = [
  { value: 0, label: "0%", income: "$0 – $18,200" },
  { value: 18, label: "18% (16% + 2% ML)", income: "$18,201 – $45,000" },
  { value: 32, label: "32% (30% + 2% ML)", income: "$45,001 – $135,000" },
  { value: 39, label: "39% (37% + 2% ML)", income: "$135,001 – $190,000" },
  { value: 47, label: "47% (45% + 2% ML)", income: "$190,001+" },
];

export function ModelInputs({ assumptions, onChange }: ModelInputsProps) {
  const updateField = <K extends keyof PropertyAssumptions>(
    field: K,
    value: PropertyAssumptions[K]
  ) => {
    onChange({ ...assumptions, [field]: value });
  };

  const handleCurrencyChange = (
    field: keyof PropertyAssumptions,
    dollars: string
  ) => {
    const cents = dollarsToCents(parseFloat(dollars) || 0);
    updateField(field, cents);
  };

  return (
    <div className="space-y-4">
      {/* Property Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Property Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address (optional)</Label>
            <Input
              id="address"
              value={assumptions.address || ""}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Enter property address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={assumptions.state}
                onValueChange={(v) => updateField("state", v as AustralianState)}
              >
                <SelectTrigger id="state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type</Label>
              <Select
                value={assumptions.propertyType}
                onValueChange={(v) => updateField("propertyType", v as PropertyType)}
              >
                <SelectTrigger id="propertyType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                value={centsToDollars(assumptions.purchasePrice)}
                onChange={(e) =>
                  handleCurrencyChange("purchasePrice", e.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finance Assumptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Finance Assumptions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depositPercent">Deposit %</Label>
              <div className="relative">
                <Input
                  id="depositPercent"
                  type="number"
                  step="1"
                  value={assumptions.depositPercent}
                  onChange={(e) =>
                    updateField("depositPercent", parseFloat(e.target.value) || 0)
                  }
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate %</Label>
              <div className="relative">
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  value={assumptions.interestRate}
                  onChange={(e) =>
                    updateField("interestRate", parseFloat(e.target.value) || 0)
                  }
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loanType">Loan Type</Label>
            <Select
              value={assumptions.loanType}
              onValueChange={(v) => updateField("loanType", v as LoanType)}
            >
              <SelectTrigger id="loanType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOAN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {assumptions.loanType === "interest-only" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ioYears">IO Period (years)</Label>
                <Input
                  id="ioYears"
                  type="number"
                  value={assumptions.interestOnlyPeriodYears}
                  onChange={(e) =>
                    updateField(
                      "interestOnlyPeriodYears",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loanTerm">Loan Term (years)</Label>
                <Input
                  id="loanTerm"
                  type="number"
                  value={assumptions.loanTermYears}
                  onChange={(e) =>
                    updateField("loanTermYears", parseInt(e.target.value) || 30)
                  }
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="loanTerm">Loan Term (years)</Label>
              <Input
                id="loanTerm"
                type="number"
                value={assumptions.loanTermYears}
                onChange={(e) =>
                  updateField("loanTermYears", parseInt(e.target.value) || 30)
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income - Rental */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Rental Income</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rentLow">Lower Rent (weekly)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="rentLow"
                  type="number"
                  className="pl-7"
                  value={centsToDollars(assumptions.weeklyRentLow)}
                  onChange={(e) =>
                    handleCurrencyChange("weeklyRentLow", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rentHigh">Higher Rent (weekly)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="rentHigh"
                  type="number"
                  className="pl-7"
                  value={centsToDollars(assumptions.weeklyRentHigh)}
                  onChange={(e) =>
                    handleCurrencyChange("weeklyRentHigh", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vacancy">Vacancy Allowance %</Label>
            <div className="relative">
              <Input
                id="vacancy"
                type="number"
                step="0.5"
                value={assumptions.vacancyPercent}
                onChange={(e) =>
                  updateField("vacancyPercent", parseFloat(e.target.value) || 0)
                }
              />
              <span className="absolute right-3 top-2.5 text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Annual Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mgmtFee">Property Mgt % (inc GST)</Label>
            <div className="relative">
              <Input
                id="mgmtFee"
                type="number"
                step="0.1"
                value={assumptions.propertyManagementPercent}
                onChange={(e) =>
                  updateField(
                    "propertyManagementPercent",
                    parseFloat(e.target.value) || 0
                  )
                }
              />
              <span className="absolute right-3 top-2.5 text-muted-foreground">
                %
              </span>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="councilRates">Council Rates</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="councilRates"
                  type="number"
                  className="pl-7"
                  value={centsToDollars(assumptions.councilRatesAnnual)}
                  onChange={(e) =>
                    handleCurrencyChange("councilRatesAnnual", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waterRates">Water Rates</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="waterRates"
                  type="number"
                  className="pl-7"
                  value={centsToDollars(assumptions.waterRatesAnnual)}
                  onChange={(e) =>
                    handleCurrencyChange("waterRatesAnnual", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buildingIns">Building Insurance</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="buildingIns"
                  type="number"
                  className="pl-7"
                  value={centsToDollars(assumptions.buildingInsuranceAnnual)}
                  onChange={(e) =>
                    handleCurrencyChange("buildingInsuranceAnnual", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="landlordIns">Landlord Insurance</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="landlordIns"
                  type="number"
                  className="pl-7"
                  value={centsToDollars(assumptions.landlordInsuranceAnnual)}
                  onChange={(e) =>
                    handleCurrencyChange("landlordInsuranceAnnual", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="strata">Strata Fees (optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="strata"
                  type="number"
                  className="pl-7"
                  value={centsToDollars(assumptions.strataFeesAnnual || 0)}
                  onChange={(e) =>
                    handleCurrencyChange("strataFeesAnnual", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance">Maintenance</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  $
                </span>
                <Input
                  id="maintenance"
                  type="number"
                  className="pl-7"
                  value={centsToDollars(assumptions.maintenanceAnnual || 0)}
                  onChange={(e) =>
                    handleCurrencyChange("maintenanceAnnual", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax (2025-26 FY) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Tax (2025-26 FY)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taxRate">Marginal Tax Rate</Label>
            <Select
              value={String(assumptions.marginalTaxRate)}
              onValueChange={(v) => updateField("marginalTaxRate", parseFloat(v))}
            >
              <SelectTrigger id="taxRate">
                <SelectValue placeholder="Select tax rate" />
              </SelectTrigger>
              <SelectContent>
                {MARGINAL_TAX_RATES.map((rate) => (
                  <SelectItem key={rate.value} value={String(rate.value)}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{rate.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {rate.income}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              ML = Medicare Levy (2%)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="depreciation">Est. Depreciation Year 1</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">
                $
              </span>
              <Input
                id="depreciation"
                type="number"
                className="pl-7"
                value={centsToDollars(assumptions.estimatedDepreciationYear1 || 0)}
                onChange={(e) =>
                  handleCurrencyChange("estimatedDepreciationYear1", e.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

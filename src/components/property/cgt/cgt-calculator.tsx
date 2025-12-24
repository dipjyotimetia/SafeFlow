"use client";

/**
 * CGT Calculator Component
 *
 * Allows users to calculate Capital Gains Tax on property sale scenarios.
 * Supports Australian CGT rules including:
 * - 50% discount for 12+ month holdings
 * - Division 40/43 depreciation recapture
 * - Main residence exemptions
 * - Capital loss offsets
 */

import { useState } from "react";
import { Calculator, DollarSign, Calendar, Percent, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatAUD } from "@/lib/utils/currency";
import {
  calculateCGT,
  type CGTInputs,
  type CGTResult,
} from "@/lib/utils/cgt-calculator";
import { cn } from "@/lib/utils";

// ============ Types ============

interface CGTCalculatorProps {
  // Pre-fill from property data
  initialValues?: Partial<CGTInputs>;
  className?: string;
}

// ============ Helper Functions ============

function centsFromDollars(dollars: string): number {
  const value = parseFloat(dollars);
  return isNaN(value) ? 0 : Math.round(value * 100);
}

function dollarsFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ============ Component ============

export function CGTCalculator({
  initialValues,
  className,
}: CGTCalculatorProps) {
  // Form state
  const [salePrice, setSalePrice] = useState(
    initialValues?.salePrice ? dollarsFromCents(initialValues.salePrice) : ""
  );
  const [purchasePrice, setPurchasePrice] = useState(
    initialValues?.purchasePrice ? dollarsFromCents(initialValues.purchasePrice) : ""
  );
  const [stampDuty, setStampDuty] = useState(
    initialValues?.stampDuty ? dollarsFromCents(initialValues.stampDuty) : ""
  );
  const [agentCommission, setAgentCommission] = useState(
    initialValues?.agentCommission ? dollarsFromCents(initialValues.agentCommission) : ""
  );
  const [legalFeesPurchase, setLegalFeesPurchase] = useState(
    initialValues?.legalFeesOnPurchase ? dollarsFromCents(initialValues.legalFeesOnPurchase) : "2000"
  );
  const [legalFeesSale, setLegalFeesSale] = useState(
    initialValues?.legalFeesOnSale ? dollarsFromCents(initialValues.legalFeesOnSale) : "2000"
  );
  const [capitalImprovements, setCapitalImprovements] = useState(
    initialValues?.capitalImprovements ? dollarsFromCents(initialValues.capitalImprovements) : "0"
  );
  const [division40, setDivision40] = useState(
    initialValues?.division40Depreciation ? dollarsFromCents(initialValues.division40Depreciation) : "0"
  );
  const [division43, setDivision43] = useState(
    initialValues?.division43Depreciation ? dollarsFromCents(initialValues.division43Depreciation) : "0"
  );
  const [marginalRate, setMarginalRate] = useState(
    initialValues?.marginalTaxRate?.toString() ?? "32.5"
  );
  const [isMainResidence, setIsMainResidence] = useState(
    initialValues?.isMainResidence ?? false
  );
  const [purchaseDate, setPurchaseDate] = useState(
    initialValues?.purchaseDate
      ? initialValues.purchaseDate.toISOString().split("T")[0]
      : ""
  );
  const [saleDate, setSaleDate] = useState(
    initialValues?.saleDate
      ? initialValues.saleDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  // Result state
  const [result, setResult] = useState<CGTResult | null>(null);

  // Calculate CGT
  const handleCalculate = () => {
    const inputs: CGTInputs = {
      salePrice: centsFromDollars(salePrice),
      saleDate: new Date(saleDate),
      purchasePrice: centsFromDollars(purchasePrice),
      purchaseDate: new Date(purchaseDate),
      stampDuty: centsFromDollars(stampDuty),
      legalFeesOnPurchase: centsFromDollars(legalFeesPurchase),
      otherPurchaseCosts: 0,
      capitalImprovements: centsFromDollars(capitalImprovements),
      agentCommission: centsFromDollars(agentCommission),
      advertisingCosts: 0,
      legalFeesOnSale: centsFromDollars(legalFeesSale),
      otherSellingCosts: 0,
      division40Depreciation: centsFromDollars(division40),
      division43Depreciation: centsFromDollars(division43),
      marginalTaxRate: parseFloat(marginalRate) || 32.5,
      isMainResidence,
    };

    const cgtResult = calculateCGT(inputs);
    setResult(cgtResult);
  };

  // Auto-calculate agent commission (2.5% of sale price)
  const handleSalePriceChange = (value: string) => {
    setSalePrice(value);
    const price = parseFloat(value);
    if (!isNaN(price)) {
      setAgentCommission((price * 0.025).toFixed(2));
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            CGT Calculator
          </CardTitle>
          <CardDescription>
            Calculate Capital Gains Tax on your property sale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sale Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Sale Details
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salePrice">Sale Price ($)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  placeholder="1,200,000"
                  value={salePrice}
                  onChange={(e) => handleSalePriceChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saleDate">Sale Date</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agentCommission">Agent Commission ($)</Label>
                <Input
                  id="agentCommission"
                  type="number"
                  placeholder="30,000"
                  value={agentCommission}
                  onChange={(e) => setAgentCommission(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Typically 2-2.5% of sale price</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalFeesSale">Legal Fees on Sale ($)</Label>
                <Input
                  id="legalFeesSale"
                  type="number"
                  placeholder="2,000"
                  value={legalFeesSale}
                  onChange={(e) => setLegalFeesSale(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Purchase Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Purchase Details
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  placeholder="800,000"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stampDuty">Stamp Duty Paid ($)</Label>
                <Input
                  id="stampDuty"
                  type="number"
                  placeholder="35,000"
                  value={stampDuty}
                  onChange={(e) => setStampDuty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalFeesPurchase">Legal Fees on Purchase ($)</Label>
                <Input
                  id="legalFeesPurchase"
                  type="number"
                  placeholder="2,000"
                  value={legalFeesPurchase}
                  onChange={(e) => setLegalFeesPurchase(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="capitalImprovements">Capital Improvements ($)</Label>
                <Input
                  id="capitalImprovements"
                  type="number"
                  placeholder="50,000"
                  value={capitalImprovements}
                  onChange={(e) => setCapitalImprovements(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Renovations, additions, and structural improvements that add value
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Depreciation */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Depreciation Claimed
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="division40">Division 40 - Plant & Equipment ($)</Label>
                <Input
                  id="division40"
                  type="number"
                  placeholder="15,000"
                  value={division40}
                  onChange={(e) => setDivision40(e.target.value)}
                />
                <p className="text-xs text-muted-foreground text-amber-600">
                  ⚠️ Added back to capital gain on sale
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="division43">Division 43 - Building ($)</Label>
                <Input
                  id="division43"
                  type="number"
                  placeholder="25,000"
                  value={division43}
                  onChange={(e) => setDivision43(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Reduces cost base for CGT calculation
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tax Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Home className="h-4 w-4" />
              Tax Details
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="marginalRate">Marginal Tax Rate (%)</Label>
                <Input
                  id="marginalRate"
                  type="number"
                  step="0.5"
                  placeholder="32.5"
                  value={marginalRate}
                  onChange={(e) => setMarginalRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  2025-26: 16%, 30%, 37%, or 45%
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="mainResidence">Main Residence Exemption</Label>
                  <p className="text-xs text-muted-foreground">
                    Fully exempt from CGT if PPOR
                  </p>
                </div>
                <Switch
                  id="mainResidence"
                  checked={isMainResidence}
                  onCheckedChange={setIsMainResidence}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleCalculate} className="w-full">
            Calculate CGT
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>CGT Calculation Results</span>
              {result.isEligibleForDiscount && (
                <Badge variant="secondary">50% CGT Discount Applied</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Gross Capital Gain</p>
                <p className="text-2xl font-bold">
                  {formatAUD(result.grossCapitalGain)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Taxable Gain</p>
                <p className="text-2xl font-bold">
                  {formatAUD(result.taxableCapitalGain)}
                </p>
              </div>
              <div className="rounded-lg border p-4 bg-destructive/10">
                <p className="text-sm text-muted-foreground">CGT Payable</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatAUD(result.cgtPayable)}
                </p>
              </div>
              <div className="rounded-lg border p-4 bg-primary/10">
                <p className="text-sm text-muted-foreground">Net Proceeds</p>
                <p className="text-2xl font-bold text-primary">
                  {formatAUD(result.netSaleProceeds)}
                </p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="rounded-lg border">
              <div className="border-b p-4">
                <h4 className="font-medium">Calculation Breakdown</h4>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sale Price</span>
                  <span>{formatAUD(centsFromDollars(salePrice))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Less: Selling Costs</span>
                  <span className="text-destructive">
                    -{formatAUD(
                      result.breakdown.agentCommission +
                      result.breakdown.legalFeesSale +
                      result.breakdown.advertisingCosts +
                      result.breakdown.otherSellingCosts
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Capital Proceeds</span>
                  <span>{formatAUD(result.capitalProceeds)}</span>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost Base</span>
                  <span>{formatAUD(result.costBase)}</span>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Capital Gain</span>
                  <span>{formatAUD(result.grossCapitalGain)}</span>
                </div>
                {result.deprecationRecapture > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Add: Div 40 Depreciation Recapture
                    </span>
                    <span className="text-amber-600">
                      +{formatAUD(result.deprecationRecapture)}
                    </span>
                  </div>
                )}
                {result.isEligibleForDiscount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Less: 50% CGT Discount
                    </span>
                    <span className="text-emerald-600">
                      -{formatAUD(Math.round(result.adjustedCapitalGain / 2))}
                    </span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between font-medium">
                  <span>Taxable Capital Gain</span>
                  <span>{formatAUD(result.taxableCapitalGain)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    At {marginalRate}% marginal rate
                  </span>
                  <span className="text-destructive font-medium">
                    {formatAUD(result.cgtPayable)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between text-base font-bold">
                  <span>Net Sale Proceeds</span>
                  <span className="text-primary">{formatAUD(result.netSaleProceeds)}</span>
                </div>
              </div>
            </div>

            {/* Holding Period Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Holding period: {result.holdingPeriodMonths} months
                {result.isEligibleForDiscount
                  ? " (50% discount eligible)"
                  : " (hold for 12+ months to qualify for 50% discount)"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

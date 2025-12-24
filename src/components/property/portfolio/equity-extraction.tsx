"use client";

/**
 * Equity Extraction Calculator Component
 *
 * Displays usable equity per property and calculates total accessible equity
 * based on target LVR (typically 80% for refinancing).
 */

import { useState } from "react";
import { Wallet, TrendingUp, Home, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { formatAUD } from "@/lib/utils/currency";
import { useEquityExtraction } from "@/hooks/use-property";
import { cn } from "@/lib/utils";

// ============ Types ============

interface EquityExtractionProps {
  className?: string;
}

// ============ Component ============

export function EquityExtraction({ className }: EquityExtractionProps) {
  const [targetLVR, setTargetLVR] = useState(80);
  const equityData = useEquityExtraction(targetLVR);

  if (!equityData) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Loading equity data...</p>
        </CardContent>
      </Card>
    );
  }

  const {
    totalUsableEquity,
    totalCurrentEquity,
    totalPropertyValue,
    totalCurrentDebt,
    equityByProperty,
  } = equityData;

  const overallLVR =
    totalPropertyValue > 0
      ? (totalCurrentDebt / totalPropertyValue) * 100
      : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Equity Extraction Calculator
          </CardTitle>
          <CardDescription>
            Calculate how much equity you can access from your property portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target LVR Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Target LVR for Refinancing</Label>
              <Badge variant="outline">{targetLVR}%</Badge>
            </div>
            <Slider
              value={[targetLVR]}
              onValueChange={(value) => setTargetLVR(value[0])}
              min={60}
              max={90}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Most lenders allow refinancing up to 80% LVR without LMI.
              Higher LVRs may incur Lenders Mortgage Insurance.
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
              <p className="text-2xl font-bold">{formatAUD(totalPropertyValue)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Current Equity</p>
              <p className="text-2xl font-bold">{formatAUD(totalCurrentEquity)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Current LVR</p>
              <p className="text-2xl font-bold">{overallLVR.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border p-4 bg-primary/10">
              <p className="text-sm text-muted-foreground">Usable Equity</p>
              <p className="text-2xl font-bold text-primary">
                {formatAUD(totalUsableEquity)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                at {targetLVR}% LVR
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Breakdown */}
      {equityByProperty.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equity by Property</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {equityByProperty.map((property) => (
                <div
                  key={property.propertyId}
                  className={cn(
                    "rounded-lg border p-4",
                    property.canExtractEquity && "border-primary/30 bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm truncate max-w-[200px]">
                        {property.address}
                      </span>
                    </div>
                    {property.canExtractEquity ? (
                      <Badge variant="default" className="shrink-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Equity Available
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        No Equity
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-muted-foreground">Property Value</p>
                      <p className="font-medium">{formatAUD(property.propertyValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Debt</p>
                      <p className="font-medium">{formatAUD(property.currentDebt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current LVR</p>
                      <p className="font-medium">{property.currentLVR}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Equity</p>
                      <p className="font-medium">{formatAUD(property.currentEquity)}</p>
                    </div>
                  </div>

                  {/* LVR Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>LVR</span>
                      <span>
                        {property.currentLVR}% / {targetLVR}% target
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        (property.currentLVR / targetLVR) * 100,
                        100
                      )}
                      className={cn(
                        "h-2",
                        property.currentLVR >= targetLVR && "[&>div]:bg-destructive"
                      )}
                    />
                  </div>

                  {/* Usable Equity */}
                  {property.canExtractEquity && (
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Usable Equity</span>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        {formatAUD(property.usableEquity)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Properties Message */}
      {equityByProperty.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No properties found</p>
            <p className="text-sm text-muted-foreground">
              Add properties to your portfolio to calculate equity
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">About Usable Equity</p>
              <p>
                Usable equity is the amount you can access by refinancing your property
                to a target LVR. For example, at 80% LVR on a $1M property, you can
                borrow up to $800K. If you currently owe $600K, your usable equity is $200K.
              </p>
              <p className="mt-2">
                <strong>Note:</strong> Actual borrowing capacity depends on your income,
                expenses, and lender policies (APRA 3% serviceability buffer applies).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePropertyPortfolioSummary, useRentalIncomeSummary } from "@/hooks";
import { formatAUD, formatPercent } from "@/lib/utils/currency";
import {
  Building2,
  TrendingUp,
  Wallet,
  Landmark,
  Home,
  DollarSign,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function PortfolioSummary() {
  const summary = usePropertyPortfolioSummary();
  const rentalSummary = useRentalIncomeSummary();

  if (!summary || !rentalSummary) {
    return <PortfolioSummarySkeleton />;
  }

  const cards = [
    {
      title: "Properties",
      value: summary.propertyCount.toString(),
      subtitle: `${rentalSummary.occupiedCount} occupied`,
      icon: Building2,
      color: "text-blue-500",
    },
    {
      title: "Total Value",
      value: formatAUD(summary.totalValue),
      subtitle: `${formatPercent(summary.totalGrowth)} growth`,
      icon: Home,
      color: "text-green-500",
    },
    {
      title: "Total Equity",
      value: formatAUD(summary.totalEquity),
      subtitle: `${formatPercent(100 - summary.averageLVR)} equity ratio`,
      icon: TrendingUp,
      color: "text-emerald-500",
    },
    {
      title: "Total Debt",
      value: formatAUD(summary.totalDebt),
      subtitle: `${formatPercent(summary.averageLVR)} avg LVR`,
      icon: Landmark,
      color: "text-orange-500",
    },
    {
      title: "Weekly Rent",
      value: formatAUD(rentalSummary.totalWeeklyRent),
      subtitle: `${formatAUD(rentalSummary.totalAnnualRent)}/year`,
      icon: DollarSign,
      color: "text-violet-500",
    },
    {
      title: "Occupancy",
      value: `${rentalSummary.occupancyRate}%`,
      subtitle: `${rentalSummary.vacantCount} vacant`,
      icon: Wallet,
      color:
        rentalSummary.occupancyRate >= 90 ? "text-green-500" : "text-amber-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PortfolioSummarySkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

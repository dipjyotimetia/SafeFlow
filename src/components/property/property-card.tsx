"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Property } from "@/types";
import { formatAUD, formatPercent } from "@/lib/utils/currency";
import {
  Building2,
  Home,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { usePropertyLoans, useCurrentRental } from "@/hooks";

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const propertyTypeIcons: Record<string, React.ElementType> = {
  house: Home,
  apartment: Building2,
  townhouse: Building2,
  unit: Building2,
  land: MapPin,
  commercial: Building2,
  industrial: Building2,
};

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success dark:bg-success/20",
  sold: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  archived: "bg-warning/15 text-warning dark:bg-warning/20",
};

export function PropertyCard({
  property,
  onClick,
  onEdit,
  onDelete,
}: PropertyCardProps) {
  const { loans } = usePropertyLoans(property.id);
  const currentRental = useCurrentRental(property.id);

  const Icon = propertyTypeIcons[property.propertyType] || Building2;

  // Calculate equity
  const totalDebt = loans.reduce(
    (sum, loan) => sum + loan.currentBalance - (loan.offsetBalance || 0),
    0
  );
  const equity = property.valuationAmount - totalDebt;
  const lvr =
    property.valuationAmount > 0
      ? (totalDebt / property.valuationAmount) * 100
      : 0;

  // Calculate growth
  const growth = property.valuationAmount - property.purchasePrice;
  const growthPercent =
    property.purchasePrice > 0
      ? ((property.valuationAmount - property.purchasePrice) /
          property.purchasePrice) *
        100
      : 0;

  // Calculate yield if rented
  const weeklyRent = currentRental?.weeklyRent || 0;
  const annualRent = weeklyRent * 52;
  const grossYield =
    property.valuationAmount > 0
      ? (annualRent / property.valuationAmount) * 100
      : 0;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base font-medium line-clamp-1">
              {property.address}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {property.suburb}, {property.state}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={statusColors[property.status]}>
            {property.status}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Value</p>
            <p className="text-lg font-semibold">
              {formatAUD(property.valuationAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Equity</p>
            <p className="text-lg font-semibold">{formatAUD(equity)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Growth</p>
            <div className="flex items-center gap-1">
              {growth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span
                className={`text-sm font-medium ${growth >= 0 ? "text-success" : "text-destructive"}`}
              >
                {formatPercent(growthPercent)}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">LVR</p>
            <p
              className={`text-sm font-medium ${lvr > 80 ? "text-warning" : "text-success"}`}
            >
              {formatPercent(lvr)}
            </p>
          </div>
        </div>

        {currentRental && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Weekly Rent</p>
                <p className="text-sm font-medium">
                  {formatAUD(currentRental.weeklyRent)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Gross Yield</p>
                <p className="text-sm font-medium">
                  {formatPercent(grossYield)}
                </p>
              </div>
            </div>
          </div>
        )}

        {!currentRental && (
          <div className="mt-4 pt-4 border-t">
            <Badge variant="outline" className="text-warning border-warning/40">
              Vacant
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

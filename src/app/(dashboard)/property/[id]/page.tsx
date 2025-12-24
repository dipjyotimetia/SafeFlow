"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePropertyWithRelated, useCurrentRental } from "@/hooks";
import { formatAUD, formatPercent } from "@/lib/utils/currency";
import { normalizeToAnnual } from "@/lib/utils/expense-normalizer";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Home,
  Landmark,
  MapPin,
  Pencil,
  TrendingUp,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const data = usePropertyWithRelated(propertyId);
  const currentRental = useCurrentRental(propertyId);

  if (data === undefined) {
    return <PropertyDetailSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold mb-2">Property not found</h2>
        <Button variant="outline" asChild>
          <Link href="/property">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Link>
        </Button>
      </div>
    );
  }

  const { property, loans, expenses, rentals, depreciation } = data;

  // Calculate metrics
  const totalDebt = loans.reduce(
    (sum, loan) => sum + loan.currentBalance - (loan.offsetBalance || 0),
    0
  );
  const equity = property.valuationAmount - totalDebt;
  const lvr =
    property.valuationAmount > 0
      ? (totalDebt / property.valuationAmount) * 100
      : 0;
  const growth = property.valuationAmount - property.purchasePrice;
  const growthPercent =
    property.purchasePrice > 0
      ? ((property.valuationAmount - property.purchasePrice) /
          property.purchasePrice) *
        100
      : 0;

  // Calculate annual expenses
  const annualExpenses = expenses
    .filter((e) => e.isRecurring)
    .reduce((sum, e) => sum + normalizeToAnnual(e.amount, e.frequency), 0);

  // Calculate yield
  const weeklyRent = currentRental?.weeklyRent || 0;
  const annualRent = weeklyRent * 52;
  const grossYield =
    property.valuationAmount > 0
      ? (annualRent / property.valuationAmount) * 100
      : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/property">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{property.address}</h1>
              <Badge
                variant="secondary"
                className={
                  property.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }
              >
                {property.status}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {property.suburb}, {property.state} {property.postcode}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/property/${propertyId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Value</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAUD(property.valuationAmount)}
            </div>
            <p
              className={`text-xs ${growthPercent >= 0 ? "text-success" : "text-destructive"}`}
            >
              {growthPercent >= 0 ? "+" : ""}
              {formatPercent(growthPercent)} from purchase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Equity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAUD(equity)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercent(100 - lvr)} equity ratio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Debt</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAUD(totalDebt)}</div>
            <p
              className={`text-xs ${lvr > 80 ? "text-amber-600" : "text-success"}`}
            >
              {formatPercent(lvr)} LVR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Yield</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(grossYield)}</div>
            <p className="text-xs text-muted-foreground">
              {currentRental
                ? `${formatAUD(weeklyRent)}/week`
                : "No current tenant"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="loans">Loans ({loans.length})</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Property Type</p>
                    <p className="font-medium capitalize">
                      {property.propertyType}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Purpose</p>
                    <p className="font-medium capitalize">{property.purpose}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Purchase Date</p>
                    <p className="font-medium">
                      {format(new Date(property.purchaseDate), "dd MMM yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Purchase Price</p>
                    <p className="font-medium">
                      {formatAUD(property.purchasePrice)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">Purchase Costs</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Stamp Duty</span>
                      <span className="font-medium">
                        {formatAUD(property.stampDuty)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Legal Fees</span>
                      <span className="font-medium">
                        {formatAUD(property.legalFees)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Rental */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Rental</CardTitle>
              </CardHeader>
              <CardContent>
                {currentRental ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Weekly Rent</p>
                        <p className="text-xl font-bold">
                          {formatAUD(currentRental.weeklyRent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Annual Rent</p>
                        <p className="font-medium">
                          {formatAUD(currentRental.weeklyRent * 52)}
                        </p>
                      </div>
                      {currentRental.tenantName && (
                        <div>
                          <p className="text-muted-foreground">Tenant</p>
                          <p className="font-medium">
                            {currentRental.tenantName}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Lease End</p>
                        <p className="font-medium">
                          {format(
                            new Date(currentRental.leaseEndDate),
                            "dd MMM yyyy"
                          )}
                        </p>
                      </div>
                    </div>
                    {currentRental.bondAmount && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Bond Held</p>
                        <p className="font-medium">
                          {formatAUD(currentRental.bondAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      Property is currently vacant
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Manager */}
            {property.hasPropertyManager && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Property Manager</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {property.propertyManagerCompany && (
                    <p className="font-medium">
                      {property.propertyManagerCompany}
                    </p>
                  )}
                  {property.propertyManagerName && (
                    <p>{property.propertyManagerName}</p>
                  )}
                  {property.propertyManagerEmail && (
                    <p className="text-muted-foreground">
                      {property.propertyManagerEmail}
                    </p>
                  )}
                  {property.managementFeePercent && (
                    <p>
                      Management Fee: {property.managementFeePercent}% (inc GST)
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Key Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {property.insuranceRenewalDate && (
                  <div className="flex justify-between">
                    <span>Insurance Renewal</span>
                    <span>
                      {format(
                        new Date(property.insuranceRenewalDate),
                        "dd MMM yyyy"
                      )}
                    </span>
                  </div>
                )}
                {property.nextTermiteInspection && (
                  <div className="flex justify-between">
                    <span>Next Termite Inspection</span>
                    <span>
                      {format(
                        new Date(property.nextTermiteInspection),
                        "dd MMM yyyy"
                      )}
                    </span>
                  </div>
                )}
                {property.airconLastServiced && (
                  <div className="flex justify-between">
                    <span>Aircon Last Serviced</span>
                    <span>
                      {format(
                        new Date(property.airconLastServiced),
                        "dd MMM yyyy"
                      )}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Annual Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.filter((e) => e.isRecurring).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Annual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses
                      .filter((e) => e.isRecurring)
                      .map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="capitalize">
                            {expense.category.replace(/-/g, " ")}
                          </TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell className="text-right">
                            {formatAUD(expense.amount)}/{expense.frequency}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatAUD(
                              normalizeToAnnual(expense.amount, expense.frequency)
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    <TableRow className="font-semibold">
                      <TableCell colSpan={3}>Total Annual Expenses</TableCell>
                      <TableCell className="text-right">
                        {formatAUD(annualExpenses)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No recurring expenses recorded
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans" className="space-y-4">
          {loans.length > 0 ? (
            loans.map((loan) => (
              <Card key={loan.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{loan.loanName || loan.lender}</span>
                    <Badge variant="outline" className="capitalize">
                      {loan.loanType.replace(/-/g, " ")}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="text-xl font-bold">
                        {formatAUD(loan.currentBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Interest Rate
                      </p>
                      <p className="font-medium">{loan.interestRate}%</p>
                    </div>
                    {loan.offsetBalance && loan.offsetBalance > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Offset</p>
                        <p className="font-medium text-success">
                          {formatAUD(loan.offsetBalance)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Effective Balance
                      </p>
                      <p className="font-medium">
                        {formatAUD(
                          loan.currentBalance - (loan.offsetBalance || 0)
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Landmark className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">No loans recorded</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tax Tab */}
        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Depreciation</CardTitle>
            </CardHeader>
            <CardContent>
              {depreciation.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Financial Year</TableHead>
                      <TableHead className="text-right">Division 40</TableHead>
                      <TableHead className="text-right">Division 43</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depreciation.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.financialYear}</TableCell>
                        <TableCell className="text-right">
                          {formatAUD(record.division40Amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAUD(record.division43Amount)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAUD(record.totalDepreciation)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No depreciation records. Add from your quantity surveyor
                  report.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PropertyDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

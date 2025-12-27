"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortfolioSummary } from "@/components/property/portfolio-summary";
import { PropertyCard } from "@/components/property/property-card";
import { useProperties } from "@/hooks";
import { usePropertyStore } from "@/stores/property.store";
import type { PropertyStatus, AustralianState } from "@/types";
import { Plus, Calculator, Building2, Percent, DollarSign } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function PropertyPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">(
    "active"
  );
  const [stateFilter, setStateFilter] = useState<AustralianState | "all">(
    "all"
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { properties, isLoading } = useProperties({
    status: statusFilter === "all" ? undefined : statusFilter,
    state: stateFilter === "all" ? undefined : stateFilter,
  });

  const { deleteProperty } = usePropertyStore();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProperty(deleteId, { cascade: true });
      toast.success("Property deleted");
      setDeleteId(null);
    } catch (error) {
      console.error("Failed to delete property:", error);
      toast.error("Failed to delete property");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Property Portfolio</h1>
          <p className="text-muted-foreground">
            Manage your investment properties
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/property/model">
              <Calculator className="mr-2 h-4 w-4" />
              Model Builder
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/property/yield">
              <Percent className="mr-2 h-4 w-4" />
              Yield Calculator
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/property/affordability">
              <DollarSign className="mr-2 h-4 w-4" />
              Affordability
            </Link>
          </Button>
          <Button asChild>
            <Link href="/property/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Link>
          </Button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <PortfolioSummary />

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as PropertyStatus | "all")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={stateFilter}
          onValueChange={(v) => setStateFilter(v as AustralianState | "all")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            <SelectItem value="NSW">NSW</SelectItem>
            <SelectItem value="VIC">VIC</SelectItem>
            <SelectItem value="QLD">QLD</SelectItem>
            <SelectItem value="SA">SA</SelectItem>
            <SelectItem value="WA">WA</SelectItem>
            <SelectItem value="TAS">TAS</SelectItem>
            <SelectItem value="NT">NT</SelectItem>
            <SelectItem value="ACT">ACT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Property List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No properties yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first investment property to get started
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/property/model">
                <Calculator className="mr-2 h-4 w-4" />
                Model Builder
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/property/yield">
                <Percent className="mr-2 h-4 w-4" />
                Yield Calculator
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/property/affordability">
                <DollarSign className="mr-2 h-4 w-4" />
                Affordability
              </Link>
            </Button>
            <Button asChild>
              <Link href="/property/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={() => router.push(`/property/${property.id}`)}
              onEdit={() => router.push(`/property/edit/${property.id}`)}
              onDelete={() => setDeleteId(property.id)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this property? This will also
              delete all associated loans, expenses, rentals, and depreciation
              records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

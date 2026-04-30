"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
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
    <>
      <Header title="Property" />
      <div className="pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="card-trace relative overflow-hidden rounded-md border border-border bg-card animate-enter">
            <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between md:p-8">
              <div>
                <span className="eyebrow">// Property portfolio</span>
                <h1 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
                  Investment properties
                </h1>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {properties.length} record
                  {properties.length !== 1 ? "s" : ""} · Active filter:{" "}
                  {statusFilter}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/property/model">
                    <Calculator
                      className="h-3.5 w-3.5"
                      strokeWidth={1.5}
                    />
                    Model
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/property/yield">
                    <Percent
                      className="h-3.5 w-3.5"
                      strokeWidth={1.5}
                    />
                    Yield
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/property/affordability">
                    <DollarSign
                      className="h-3.5 w-3.5"
                      strokeWidth={1.5}
                    />
                    Afford.
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/property/new">
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Add Property
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Portfolio Summary */}
          <PortfolioSummary />

          {/* Filters */}
          <section className="flex items-center gap-3 px-1">
            <span className="eyebrow">Filters</span>
            <span className="hairline-v h-3" aria-hidden />
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as PropertyStatus | "all")
              }
            >
              <SelectTrigger className="h-8 w-[140px] rounded-sm border border-border bg-transparent font-mono text-[11px] uppercase tracking-[0.1em] shadow-none">
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
              onValueChange={(v) =>
                setStateFilter(v as AustralianState | "all")
              }
            >
              <SelectTrigger className="h-8 w-[140px] rounded-sm border border-border bg-transparent font-mono text-[11px] uppercase tracking-[0.1em] shadow-none">
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
          </section>

          {/* Property List */}
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-md border border-border bg-card px-5 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[2px] border border-border bg-muted/40">
                <Building2
                  className="h-5 w-5 text-[--text-subtle]"
                  strokeWidth={1.5}
                />
              </div>
              <p className="font-display text-lg tracking-tight">
                No properties yet
              </p>
              <p className="mx-auto mt-2 max-w-xs text-[13px] text-muted-foreground">
                Add your first investment property to get started.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/property/model">
                    <Calculator
                      className="h-3.5 w-3.5"
                      strokeWidth={1.5}
                    />
                    Model
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/property/new">
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Add Property
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property, i) => (
                <div
                  key={property.id}
                  className="animate-enter-fast"
                  style={{ animationDelay: `${0.04 * i}s` }}
                >
                  <PropertyCard
                    property={property}
                    onClick={() => router.push(`/property/${property.id}`)}
                    onEdit={() => router.push(`/property/edit/${property.id}`)}
                    onDelete={() => setDeleteId(property.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
    </>
  );
}

"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { PropertyForm } from "@/components/property/property-form";
import { useProperty } from "@/hooks";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditPropertyClient() {
  const params = useParams();
  const propertyId = params.id as string;
  const property = useProperty(propertyId);

  if (property === undefined) {
    return <EditPropertySkeleton />;
  }

  if (!property) {
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

  return (
    <>
      <Header title="Edit Property" />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="card-trace fintech-surface rounded-lg border border-border/80 p-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/property/${propertyId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <span className="eyebrow">Property portfolio</span>
              <h1 className="mt-2 font-display text-3xl tracking-tight">
                Edit Property
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {property.address}
              </p>
            </div>
          </div>
        </div>

        <PropertyForm property={property} mode="edit" />
      </div>
    </>
  );
}

function EditPropertySkeleton() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div className="card-trace fintech-surface flex items-center gap-4 rounded-lg border border-border/80 p-6">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}

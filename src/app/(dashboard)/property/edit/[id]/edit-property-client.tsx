"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
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
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/property/${propertyId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Property</h1>
          <p className="text-muted-foreground">{property.address}</p>
        </div>
      </div>

      {/* Form */}
      <PropertyForm property={property} mode="edit" />
    </div>
  );
}

function EditPropertySkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
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

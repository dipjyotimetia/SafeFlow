"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PropertyForm } from "@/components/property/property-form";
import { ArrowLeft } from "lucide-react";

export default function NewPropertyPage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/property">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Property</h1>
          <p className="text-muted-foreground">
            Add a new investment property to your portfolio
          </p>
        </div>
      </div>

      {/* Form */}
      <PropertyForm mode="create" />
    </div>
  );
}

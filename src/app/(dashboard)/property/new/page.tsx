"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { PropertyForm } from "@/components/property/property-form";
import { ArrowLeft } from "lucide-react";

export default function NewPropertyPage() {
  return (
    <>
      <Header title="Add Property" />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="card-trace fintech-surface rounded-lg border border-border/80 p-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/property">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <span className="eyebrow">Property portfolio</span>
              <h1 className="mt-2 font-display text-3xl tracking-tight">
                Add Property
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a new investment property to your portfolio.
              </p>
            </div>
          </div>
        </div>

        <PropertyForm mode="create" />
      </div>
    </>
  );
}

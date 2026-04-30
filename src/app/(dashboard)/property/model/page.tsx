"use client";

import { ModelBuilder } from "@/components/property/model/model-builder";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PropertyModelPage() {
  return (
    <>
      <Header title="Property Model" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="card-trace fintech-surface rounded-lg border border-border/80 p-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/property">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <span className="eyebrow">Property toolkit</span>
              <h1 className="mt-2 font-display text-3xl tracking-tight">
                Model Builder
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Analyze potential property investments with live calculations.
              </p>
            </div>
          </div>
        </div>

        <ModelBuilder />
      </div>
    </>
  );
}

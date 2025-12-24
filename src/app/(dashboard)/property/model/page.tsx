"use client";

import { ModelBuilder } from "@/components/property/model/model-builder";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PropertyModelPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/property">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Property Model Builder</h1>
          <p className="text-muted-foreground">
            Analyze potential property investments with live calculations
          </p>
        </div>
      </div>

      {/* Model Builder */}
      <ModelBuilder />
    </div>
  );
}

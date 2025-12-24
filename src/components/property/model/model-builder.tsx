"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ModelInputs } from "./model-inputs";
import { ModelResults } from "./model-results";
import type { PropertyAssumptions, PropertyCalculatedResults } from "@/types";
import {
  calculatePropertyModel,
  createDefaultAssumptions,
} from "@/lib/utils/property-cashflow";
import { usePropertyStore } from "@/stores/property.store";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ModelBuilderProps {
  initialAssumptions?: PropertyAssumptions;
  propertyId?: string;
  modelId?: string;
  onSave?: (modelId: string) => void;
}

export function ModelBuilder({
  initialAssumptions,
  propertyId,
  modelId,
  onSave,
}: ModelBuilderProps) {
  const [assumptions, setAssumptions] = useState<PropertyAssumptions>(
    initialAssumptions || createDefaultAssumptions()
  );
  const [isSaving, setIsSaving] = useState(false);

  const { createModel, updateModel } = usePropertyStore();

  // Calculate results whenever assumptions change
  const results = useMemo<PropertyCalculatedResults>(() => {
    return calculatePropertyModel(assumptions);
  }, [assumptions]);

  const handleAssumptionsChange = useCallback(
    (newAssumptions: PropertyAssumptions) => {
      setAssumptions(newAssumptions);
    },
    []
  );

  const handleReset = useCallback(() => {
    setAssumptions(createDefaultAssumptions());
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (modelId) {
        // Update existing model
        await updateModel(modelId, {
          assumptions,
          calculatedResults: results,
        });
        toast.success("Model updated");
        onSave?.(modelId);
      } else {
        // Create new model
        const name = assumptions.address || "New Property Model";
        const id = await createModel({
          name,
          propertyId,
          assumptions,
          calculatedResults: results,
          isActive: true,
        });
        toast.success("Model saved");
        onSave?.(id);
      }
    } catch (error) {
      console.error("Failed to save model:", error);
      toast.error("Failed to save model");
    } finally {
      setIsSaving(false);
    }
  }, [assumptions, results, modelId, propertyId, createModel, updateModel, onSave]);

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Model"}
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Inputs */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Inputs</h3>
          <ModelInputs
            assumptions={assumptions}
            onChange={handleAssumptionsChange}
          />
        </div>

        {/* Right Column - Results */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Calculated Results</h3>
          <ModelResults
            results={results}
            assumptions={assumptions}
            onAssumptionsChange={handleAssumptionsChange}
            purchasePrice={assumptions.purchasePrice}
          />
        </div>
      </div>
    </div>
  );
}

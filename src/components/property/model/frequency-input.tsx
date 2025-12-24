"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatAUD } from "@/lib/utils/currency";
import { Info } from "lucide-react";

type Frequency = "weekly" | "monthly" | "annually";

interface FrequencyInputProps {
  /** The annual value in cents */
  annualValue: number;
  /** Callback when value changes - receives annual value in cents */
  onChange: (annualValue: number) => void;
  /** Label for the field */
  label?: string;
  /** Whether to show the label */
  showLabel?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** The name of the expense (for formula display) */
  expenseName?: string;
  className?: string;
}

const CONVERSIONS = {
  weekly: { toAnnual: 52, fromAnnual: 1 / 52 },
  monthly: { toAnnual: 12, fromAnnual: 1 / 12 },
  annually: { toAnnual: 1, fromAnnual: 1 },
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  annually: "Annually",
};

const FORMULAS: Record<Frequency, string> = {
  weekly: "Annual ÷ 52",
  monthly: "Annual ÷ 12",
  annually: "Base value",
};

export function FrequencyInput({
  annualValue,
  onChange,
  label,
  showLabel = true,
  disabled = false,
  expenseName = "Amount",
  className,
}: FrequencyInputProps) {
  const [editingFrequency, setEditingFrequency] = useState<Frequency | null>(null);
  const [primaryFrequency, setPrimaryFrequency] = useState<Frequency>("annually");

  // Calculate values for each frequency
  const getValueForFrequency = useCallback(
    (frequency: Frequency): number => {
      return Math.round(annualValue * CONVERSIONS[frequency].fromAnnual);
    },
    [annualValue]
  );

  // Convert display value (dollars) to cents for the given frequency
  const handleValueChange = (frequency: Frequency, displayValue: string) => {
    const dollars = parseFloat(displayValue) || 0;
    const cents = Math.round(dollars * 100);
    const newAnnual = Math.round(cents * CONVERSIONS[frequency].toAnnual);
    setPrimaryFrequency(frequency);
    onChange(newAnnual);
  };

  // Format cents to dollars for display
  const formatForDisplay = (cents: number): string => {
    return (cents / 100).toFixed(2);
  };

  // Get formula with actual values
  const getDetailedFormula = (frequency: Frequency): string => {
    const annual = formatAUD(annualValue);
    const result = formatAUD(getValueForFrequency(frequency));

    switch (frequency) {
      case "weekly":
        return `${annual} ÷ 52 = ${result}`;
      case "monthly":
        return `${annual} ÷ 12 = ${result}`;
      case "annually":
        return `${result} (base value)`;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <div className="grid grid-cols-3 gap-2">
        {(["weekly", "monthly", "annually"] as Frequency[]).map((frequency) => (
          <FrequencyCell
            key={frequency}
            frequency={frequency}
            value={getValueForFrequency(frequency)}
            isPrimary={primaryFrequency === frequency}
            isEditing={editingFrequency === frequency}
            disabled={disabled}
            expenseName={expenseName}
            formula={FORMULAS[frequency]}
            detailedFormula={getDetailedFormula(frequency)}
            onStartEdit={() => setEditingFrequency(frequency)}
            onEndEdit={() => setEditingFrequency(null)}
            onChange={(displayValue) => handleValueChange(frequency, displayValue)}
          />
        ))}
      </div>
    </div>
  );
}

interface FrequencyCellProps {
  frequency: Frequency;
  value: number;
  isPrimary: boolean;
  isEditing: boolean;
  disabled: boolean;
  expenseName: string;
  formula: string;
  detailedFormula: string;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onChange: (value: string) => void;
}

function FrequencyCell({
  frequency,
  value,
  isPrimary,
  isEditing,
  disabled,
  expenseName,
  formula,
  detailedFormula,
  onStartEdit,
  onEndEdit,
  onChange,
}: FrequencyCellProps) {
  const [inputValue, setInputValue] = useState("");

  const handleFocus = () => {
    setInputValue((value / 100).toFixed(2));
    onStartEdit();
  };

  const handleBlur = () => {
    onChange(inputValue);
    onEndEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onChange(inputValue);
      onEndEdit();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      onEndEdit();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {FREQUENCY_LABELS[frequency]}
        </span>
        <TooltipProvider>
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center"
                  >
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {formula}
              </TooltipContent>
            </Tooltip>
            <PopoverContent side="top" className="w-auto p-3">
              <div className="space-y-1">
                <p className="text-xs font-medium">{expenseName} Calculation</p>
                <p className="text-sm font-mono">{detailedFormula}</p>
              </div>
            </PopoverContent>
          </Popover>
        </TooltipProvider>
      </div>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          $
        </span>
        <Input
          type="number"
          step="0.01"
          value={isEditing ? inputValue : (value / 100).toFixed(2)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "pl-5 text-right text-sm h-8",
            isPrimary && "ring-1 ring-primary/30 bg-primary/5",
            !isPrimary && "text-muted-foreground"
          )}
        />
      </div>
    </div>
  );
}

// Display-only version for showing calculated values
interface FrequencyDisplayProps {
  label: string;
  annualValue: number;
  formula?: string;
  detailedFormula?: string;
  className?: string;
}

export function FrequencyDisplay({
  label,
  annualValue,
  formula,
  detailedFormula,
  className,
}: FrequencyDisplayProps) {
  const weekly = Math.round(annualValue / 52);
  const monthly = Math.round(annualValue / 12);

  return (
    <div className={cn("grid grid-cols-4 items-center gap-2", className)}>
      <div className="text-sm font-medium">{label}</div>
      <FrequencyValueCell
        value={weekly}
        formula={formula || "Annual ÷ 52"}
        detailedFormula={detailedFormula || `${formatAUD(annualValue)} ÷ 52 = ${formatAUD(weekly)}`}
      />
      <FrequencyValueCell
        value={monthly}
        formula="Annual ÷ 12"
        detailedFormula={`${formatAUD(annualValue)} ÷ 12 = ${formatAUD(monthly)}`}
      />
      <FrequencyValueCell
        value={annualValue}
        formula="Base value"
        detailedFormula={`${formatAUD(annualValue)} (annual)`}
      />
    </div>
  );
}

interface FrequencyValueCellProps {
  value: number;
  formula: string;
  detailedFormula: string;
}

function FrequencyValueCell({ value, formula, detailedFormula }: FrequencyValueCellProps) {
  return (
    <TooltipProvider>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-right text-sm hover:bg-muted/50 rounded px-1 -mx-1 transition-colors cursor-help"
              >
                {formatAUD(value)}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {formula}
          </TooltipContent>
        </Tooltip>
        <PopoverContent side="top" className="w-auto p-3">
          <p className="text-sm font-mono">{detailedFormula}</p>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

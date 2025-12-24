"use client";

import { ReactNode } from "react";
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
import { Calculator } from "lucide-react";

interface FormulaTooltipProps {
  /** The content to wrap with the tooltip */
  children: ReactNode;
  /** Short formula description shown on hover */
  formula: string;
  /** Detailed calculation shown on click */
  detailedFormula: string;
  /** Optional title for the popover */
  title?: string;
  /** Whether to show the calculator icon */
  showIcon?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Two-tier tooltip component:
 * - Hover: Shows formula pattern (e.g., "Annual Rent ÷ Purchase Price × 100")
 * - Click: Shows detailed calculation with actual values
 */
export function FormulaTooltip({
  children,
  formula,
  detailedFormula,
  title,
  showIcon = false,
  className,
}: FormulaTooltipProps) {
  return (
    <TooltipProvider>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 cursor-help rounded transition-colors",
                  "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  className
                )}
              >
                {children}
                {showIcon && (
                  <Calculator className="h-3 w-3 text-muted-foreground opacity-50" />
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px]">
            <p className="text-xs">{formula}</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent side="top" className="w-auto max-w-[350px] p-3">
          <div className="space-y-2">
            {title && (
              <p className="text-xs font-medium text-muted-foreground">
                {title}
              </p>
            )}
            <p className="text-sm font-mono whitespace-pre-wrap">
              {detailedFormula}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

// Pre-defined formula helpers for common property calculations
export const PropertyFormulas = {
  grossYield: {
    formula: "Gross Yield = Annual Rent ÷ Purchase Price × 100",
    getDetailed: (annualRent: string, purchasePrice: string, result: string) =>
      `${annualRent} ÷ ${purchasePrice} × 100 = ${result}`,
  },
  netYield: {
    formula: "Net Yield = (Annual Rent - Expenses) ÷ Purchase Price × 100",
    getDetailed: (
      annualRent: string,
      expenses: string,
      purchasePrice: string,
      result: string
    ) => `(${annualRent} - ${expenses}) ÷ ${purchasePrice} × 100 = ${result}`,
  },
  cashOnCash: {
    formula: "Cash-on-Cash = Annual Cashflow ÷ Capital Invested × 100",
    getDetailed: (cashflow: string, capital: string, result: string) =>
      `${cashflow} ÷ ${capital} × 100 = ${result}`,
  },
  weekly: {
    formula: "Weekly = Annual ÷ 52",
    getDetailed: (annual: string, result: string) =>
      `${annual} ÷ 52 = ${result}`,
  },
  monthly: {
    formula: "Monthly = Annual ÷ 12",
    getDetailed: (annual: string, result: string) =>
      `${annual} ÷ 12 = ${result}`,
  },
  annually: {
    formula: "Annual = Weekly × 52",
    getDetailed: (weekly: string, result: string) =>
      `${weekly} × 52 = ${result}`,
  },
  vacancy: {
    formula: "Vacancy Deduction = Annual Rent × Vacancy %",
    getDetailed: (rent: string, percent: string, result: string) =>
      `${rent} × ${percent} = ${result}`,
  },
  managementFee: {
    formula: "Management Fee = Net Rent × Management %",
    getDetailed: (rent: string, percent: string, result: string) =>
      `${rent} × ${percent} = ${result}`,
  },
  taxBenefit: {
    formula: "Tax Benefit = Taxable Loss × Marginal Tax Rate",
    getDetailed: (loss: string, rate: string, result: string) =>
      `${loss} × ${rate} = ${result}`,
  },
  lvr: {
    formula: "LVR = Loan Amount ÷ Property Value × 100",
    getDetailed: (loan: string, value: string, result: string) =>
      `${loan} ÷ ${value} × 100 = ${result}`,
  },
};

// Wrapper for displaying values with formula tooltips inline
interface FormulaValueProps {
  value: ReactNode;
  formula: string;
  detailedFormula: string;
  title?: string;
  className?: string;
}

export function FormulaValue({
  value,
  formula,
  detailedFormula,
  title,
  className,
}: FormulaValueProps) {
  return (
    <FormulaTooltip
      formula={formula}
      detailedFormula={detailedFormula}
      title={title}
      className={className}
    >
      <span>{value}</span>
    </FormulaTooltip>
  );
}

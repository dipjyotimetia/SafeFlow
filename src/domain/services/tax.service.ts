/**
 * Tax Domain Service
 *
 * Pure functions for Australian tax-related calculations.
 * Includes income tax brackets, deductions, and tax estimation.
 */

import { Money } from "../value-objects/money";
import { FinancialYear } from "../value-objects/financial-year";
import type { Transaction, InvestmentTransaction } from "@/types";

// ============ Australian Tax Brackets (2024-25) ============

/**
 * Australian resident individual tax brackets for 2024-25
 *
 * Source: Australian Taxation Office (ATO)
 * https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 *
 * @important ANNUAL UPDATE REQUIRED
 * These tax brackets must be updated each financial year when the ATO publishes
 * new rates (typically before July 1). Check for:
 * - Changes to bracket thresholds
 * - Changes to tax rates
 * - Changes to Medicare levy rate
 * - Changes to Medicare Levy Surcharge thresholds
 *
 * Last updated: 2024-25 financial year (effective 1 July 2024)
 */
export const TAX_BRACKETS_2024_25: TaxBracket[] = [
  { min: 0, max: 18200, rate: 0, baseTax: 0 },
  { min: 18201, max: 45000, rate: 16, baseTax: 0 },
  { min: 45001, max: 135000, rate: 30, baseTax: 4288 },
  { min: 135001, max: 190000, rate: 37, baseTax: 31288 },
  { min: 190001, max: Infinity, rate: 45, baseTax: 51638 },
];

/**
 * Medicare levy rate (percentage)
 * Standard rate for most taxpayers. Low-income exemptions/reductions not implemented.
 * Source: ATO - https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy
 */
export const MEDICARE_LEVY_RATE = 2;

/**
 * Medicare Levy Surcharge (MLS) thresholds for singles without private health insurance
 *
 * Source: ATO - https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge
 * Note: Family thresholds are different and not implemented here.
 *
 * @important ANNUAL UPDATE REQUIRED - Thresholds may be indexed annually
 * Last updated: 2024-25 financial year
 */
export const MLS_THRESHOLDS: MLSThreshold[] = [
  { min: 0, max: 93000, rate: 0 },
  { min: 93001, max: 108000, rate: 1 },
  { min: 108001, max: 144000, rate: 1.25 },
  { min: 144001, max: Infinity, rate: 1.5 },
];

// ============ Income Tax Calculations ============

/**
 * Calculate income tax for a given taxable income
 * Uses 2024-25 tax brackets
 */
export function calculateIncomeTax(taxableIncomeCents: number): TaxCalculation {
  const taxableIncome = taxableIncomeCents / 100; // Convert to dollars
  let bracket: TaxBracket | undefined;
  let incomeTax = 0;

  // Find applicable bracket
  for (const b of TAX_BRACKETS_2024_25) {
    if (taxableIncome >= b.min && taxableIncome <= b.max) {
      bracket = b;
      break;
    }
  }

  if (bracket) {
    // Base tax + marginal rate on excess
    const excess = taxableIncome - bracket.min + 1;
    incomeTax = bracket.baseTax + (excess * bracket.rate) / 100;
  }

  // Medicare levy (2%)
  const medicareLevy = (taxableIncome * MEDICARE_LEVY_RATE) / 100;

  // Total tax
  const totalTax = incomeTax + medicareLevy;

  // Effective tax rate
  const effectiveRate = taxableIncome > 0 ? (totalTax / taxableIncome) * 100 : 0;

  return {
    taxableIncome: Money.fromDollars(taxableIncome),
    incomeTax: Money.fromDollars(incomeTax),
    medicareLevy: Money.fromDollars(medicareLevy),
    totalTax: Money.fromDollars(totalTax),
    effectiveRate: Math.round(effectiveRate * 10) / 10,
    marginalRate: bracket?.rate || 0,
  };
}

/**
 * Get marginal tax rate for a given income
 */
export function getMarginalTaxRate(taxableIncomeCents: number): number {
  const taxableIncome = taxableIncomeCents / 100;

  for (const bracket of TAX_BRACKETS_2024_25) {
    if (taxableIncome >= bracket.min && taxableIncome <= bracket.max) {
      return bracket.rate;
    }
  }

  return TAX_BRACKETS_2024_25[TAX_BRACKETS_2024_25.length - 1].rate;
}

// ============ Deduction Calculations ============

/**
 * ATO deduction category codes (D1-D10)
 */
export const ATO_DEDUCTION_CODES = {
  D1: "Work-related car expenses",
  D2: "Work-related travel expenses",
  D3: "Work-related clothing/laundry",
  D4: "Work-related self-education",
  D5: "Other work-related expenses",
  D6: "Low value pool deduction",
  D7: "Interest deductions",
  D8: "Dividend deductions",
  D9: "Gifts or donations",
  D10: "Cost of managing tax affairs",
} as const;

export type ATODeductionCode = keyof typeof ATO_DEDUCTION_CODES;

/**
 * Calculate total deductions from transactions
 */
export function calculateDeductions(
  transactions: Transaction[]
): DeductionSummary {
  const byCategory = new Map<string, number>();
  let totalDeductible = 0;
  let totalGST = 0;

  for (const tx of transactions) {
    if (tx.isDeductible && tx.type === "expense") {
      totalDeductible += tx.amount;
      if (tx.gstAmount) {
        totalGST += tx.gstAmount;
      }

      // Group by ATO category
      const category = tx.atoCategory || "uncategorized";
      byCategory.set(category, (byCategory.get(category) || 0) + tx.amount);
    }
  }

  // Build category breakdown
  const categories: DeductionCategory[] = [];
  for (const [code, amount] of byCategory) {
    categories.push({
      code: code as ATODeductionCode,
      name: ATO_DEDUCTION_CODES[code as ATODeductionCode] || code,
      amount: Money.fromCents(amount),
    });
  }

  // Sort by amount descending
  categories.sort((a, b) => b.amount.cents - a.amount.cents);

  return {
    totalDeductible: Money.fromCents(totalDeductible),
    totalGST: Money.fromCents(totalGST),
    categories,
    transactionCount: transactions.filter(
      (tx) => tx.isDeductible && tx.type === "expense"
    ).length,
  };
}

// ============ Tax Estimate ============

/**
 * Estimate tax for a financial year
 */
export function estimateTax(inputs: TaxEstimateInputs): TaxEstimate {
  const {
    grossIncome,
    deductions,
    capitalGains,
    frankingCredits,
    hasPrivateHealth = true,
  } = inputs;

  // Calculate taxable income
  const taxableIncome = Math.max(0, grossIncome - deductions + capitalGains);

  // Calculate base tax
  const taxCalc = calculateIncomeTax(taxableIncome);

  // Add capital gains tax (already included in taxable income)
  // Apply franking credit offset
  let taxPayable = taxCalc.totalTax.cents - frankingCredits;

  // Medicare Levy Surcharge (if no private health)
  let mls = 0;
  if (!hasPrivateHealth) {
    const incomeForMLS = taxableIncome / 100;
    for (const threshold of MLS_THRESHOLDS) {
      if (incomeForMLS >= threshold.min && incomeForMLS <= threshold.max) {
        mls = Math.round(incomeForMLS * threshold.rate);
        break;
      }
    }
  }

  taxPayable += mls * 100; // Convert back to cents

  // Ensure non-negative (franking credit refund possible)
  const refundDue = taxPayable < 0 ? Math.abs(taxPayable) : 0;
  taxPayable = Math.max(0, taxPayable);

  return {
    grossIncome: Money.fromCents(grossIncome),
    deductions: Money.fromCents(deductions),
    capitalGains: Money.fromCents(capitalGains),
    taxableIncome: Money.fromCents(taxableIncome),
    incomeTax: taxCalc.incomeTax,
    medicareLevy: taxCalc.medicareLevy,
    medicareLevySurcharge: Money.fromCents(mls * 100),
    frankingCredits: Money.fromCents(frankingCredits),
    taxPayable: Money.fromCents(taxPayable),
    refundDue: Money.fromCents(refundDue),
    effectiveRate: taxCalc.effectiveRate,
    marginalRate: taxCalc.marginalRate,
  };
}

// ============ Financial Year Filtering ============

/**
 * Filter transactions for a specific financial year
 */
export function filterTransactionsForFY(
  transactions: Transaction[],
  fy: FinancialYear
): Transaction[] {
  return transactions.filter((tx) => {
    const date = tx.date instanceof Date ? tx.date : new Date(tx.date);
    return fy.contains(date);
  });
}

/**
 * Filter investment transactions for a specific financial year
 */
export function filterInvestmentTransactionsForFY(
  transactions: InvestmentTransaction[],
  fy: FinancialYear
): InvestmentTransaction[] {
  return transactions.filter((tx) => {
    const date = tx.date instanceof Date ? tx.date : new Date(tx.date);
    return fy.contains(date);
  });
}

// ============ Summary Calculations ============

/**
 * Calculate income summary for tax purposes
 */
export function calculateIncomeSummary(
  transactions: Transaction[],
  investmentTransactions: InvestmentTransaction[]
): IncomeSummary {
  let salaryIncome = 0;
  let otherIncome = 0;
  let dividends = 0;
  let frankingCredits = 0;
  let capitalGains = 0;

  // Regular income transactions
  for (const tx of transactions) {
    if (tx.type === "income") {
      // Assume salary unless tagged otherwise
      if (tx.atoCategory === "salary") {
        salaryIncome += tx.amount;
      } else {
        otherIncome += tx.amount;
      }
    }
  }

  // Investment transactions
  for (const tx of investmentTransactions) {
    if (tx.type === "dividend" || tx.type === "distribution") {
      dividends += tx.totalAmount;
      if (tx.frankingCreditAmount) {
        frankingCredits += tx.frankingCreditAmount;
      }
    } else if (tx.type === "sell" && tx.capitalGain) {
      capitalGains += tx.capitalGain;
    }
  }

  const grossedUpDividends = dividends + frankingCredits;
  const totalAssessableIncome =
    salaryIncome + otherIncome + grossedUpDividends + capitalGains;

  return {
    salaryIncome: Money.fromCents(salaryIncome),
    otherIncome: Money.fromCents(otherIncome),
    dividends: Money.fromCents(dividends),
    frankingCredits: Money.fromCents(frankingCredits),
    grossedUpDividends: Money.fromCents(grossedUpDividends),
    capitalGains: Money.fromCents(capitalGains),
    totalAssessableIncome: Money.fromCents(totalAssessableIncome),
  };
}

// ============ Types ============

export interface TaxBracket {
  min: number;
  max: number;
  rate: number; // Percentage
  baseTax: number; // Cumulative tax at bracket start
}

export interface MLSThreshold {
  min: number;
  max: number;
  rate: number; // Percentage
}

export interface TaxCalculation {
  taxableIncome: Money;
  incomeTax: Money;
  medicareLevy: Money;
  totalTax: Money;
  effectiveRate: number; // Percentage
  marginalRate: number; // Percentage
}

export interface DeductionCategory {
  code: ATODeductionCode | string;
  name: string;
  amount: Money;
}

export interface DeductionSummary {
  totalDeductible: Money;
  totalGST: Money;
  categories: DeductionCategory[];
  transactionCount: number;
}

export interface TaxEstimateInputs {
  grossIncome: number; // cents
  deductions: number; // cents
  capitalGains: number; // cents (net, after discount)
  frankingCredits: number; // cents
  hasPrivateHealth?: boolean;
}

export interface TaxEstimate {
  grossIncome: Money;
  deductions: Money;
  capitalGains: Money;
  taxableIncome: Money;
  incomeTax: Money;
  medicareLevy: Money;
  medicareLevySurcharge: Money;
  frankingCredits: Money;
  taxPayable: Money;
  refundDue: Money;
  effectiveRate: number;
  marginalRate: number;
}

export interface IncomeSummary {
  salaryIncome: Money;
  otherIncome: Money;
  dividends: Money;
  frankingCredits: Money;
  grossedUpDividends: Money;
  capitalGains: Money;
  totalAssessableIncome: Money;
}

/**
 * Tax Domain Service
 *
 * Pure functions for Australian tax-related calculations.
 * Includes income tax brackets, deductions, and tax estimation.
 */

import { Money } from "../value-objects/money";
import { FinancialYear } from "../value-objects/financial-year";
import type { Transaction, InvestmentTransaction } from "@/types";

// ============ Australian Tax Configuration ============

/**
 * Australian resident individual tax brackets for 2024-25 and 2025-26.
 * Source: ATO resident tax rates (Stage 3 settings).
 */
export const TAX_BRACKETS_2024_25: TaxBracket[] = [
  { min: 0, max: 18200, rate: 0, baseTax: 0 },
  { min: 18200, max: 45000, rate: 16, baseTax: 0 },
  { min: 45000, max: 135000, rate: 30, baseTax: 4288 },
  { min: 135000, max: 190000, rate: 37, baseTax: 31288 },
  { min: 190000, max: Infinity, rate: 45, baseTax: 51638 },
];

export const TAX_BRACKETS_2025_26: TaxBracket[] = [...TAX_BRACKETS_2024_25];

/**
 * Australian resident individual tax brackets for 2026-27.
 * Source: ATO personal income tax cuts from 1 July 2026.
 */
export const TAX_BRACKETS_2026_27: TaxBracket[] = [
  { min: 0, max: 18200, rate: 0, baseTax: 0 },
  { min: 18200, max: 45000, rate: 15, baseTax: 0 },
  { min: 45000, max: 135000, rate: 29, baseTax: 4020 },
  { min: 135000, max: 190000, rate: 37, baseTax: 30120 },
  { min: 190000, max: Infinity, rate: 45, baseTax: 50470 },
];

/**
 * Medicare levy rate (percentage).
 */
export const MEDICARE_LEVY_RATE = 2;

/**
 * Medicare Levy Surcharge (MLS) thresholds for singles.
 * 2024-25 and 2025-26 values are sourced from ATO thresholds pages.
 */
export const MLS_THRESHOLDS_2024_25_SINGLE: MLSThreshold[] = [
  { min: 0, max: 93000, rate: 0 },
  { min: 93001, max: 108000, rate: 1 },
  { min: 108001, max: 144000, rate: 1.25 },
  { min: 144001, max: Infinity, rate: 1.5 },
];

export const MLS_THRESHOLDS_2025_26_SINGLE: MLSThreshold[] = [
  { min: 0, max: 101000, rate: 0 },
  { min: 101001, max: 118000, rate: 1 },
  { min: 118001, max: 158000, rate: 1.25 },
  { min: 158001, max: Infinity, rate: 1.5 },
];

/**
 * Backward-compatible export; now resolves to current FY singles thresholds.
 */
export const MLS_THRESHOLDS: MLSThreshold[] = MLS_THRESHOLDS_2025_26_SINGLE;

const TAX_YEAR_CONFIGS: Record<string, TaxYearConfig> = {
  "2024-25": {
    brackets: TAX_BRACKETS_2024_25,
    medicareLevy: {
      rate: MEDICARE_LEVY_RATE,
      singleThreshold: 27222,
      familyThreshold: 45907,
      familyPerDependentChild: 4216,
      shadeInRate: 10,
    },
    mls: {
      single: MLS_THRESHOLDS_2024_25_SINGLE,
      familyBaseThresholds: [186000, 216000, 288000],
      familyPerDependentChildAfterFirst: 1500,
    },
  },
  "2025-26": {
    brackets: TAX_BRACKETS_2025_26,
    medicareLevy: {
      // ATO 2025-26 full threshold data is not yet published in production docs,
      // so use latest published threshold values until updated.
      rate: MEDICARE_LEVY_RATE,
      singleThreshold: 27222,
      familyThreshold: 45907,
      familyPerDependentChild: 4216,
      shadeInRate: 10,
    },
    mls: {
      single: MLS_THRESHOLDS_2025_26_SINGLE,
      familyBaseThresholds: [202000, 236000, 316000],
      familyPerDependentChildAfterFirst: 1500,
    },
  },
  "2026-27": {
    brackets: TAX_BRACKETS_2026_27,
    medicareLevy: {
      // Until ATO publishes updated threshold values, keep latest known settings.
      rate: MEDICARE_LEVY_RATE,
      singleThreshold: 27222,
      familyThreshold: 45907,
      familyPerDependentChild: 4216,
      shadeInRate: 10,
    },
    mls: {
      // Until ATO publishes 2026-27 MLS thresholds, keep latest known settings.
      single: MLS_THRESHOLDS_2025_26_SINGLE,
      familyBaseThresholds: [202000, 236000, 316000],
      familyPerDependentChildAfterFirst: 1500,
    },
  },
};

const SUPPORTED_TAX_YEARS = Object.keys(TAX_YEAR_CONFIGS).sort();

function resolveTaxYear(financialYear?: string): string {
  const target = financialYear ?? FinancialYear.current().value;
  if (TAX_YEAR_CONFIGS[target]) {
    return target;
  }

  const parsed = FinancialYear.tryParse(target);
  if (!parsed) {
    return FinancialYear.current().value in TAX_YEAR_CONFIGS
      ? FinancialYear.current().value
      : SUPPORTED_TAX_YEARS[SUPPORTED_TAX_YEARS.length - 1];
  }

  const year = parsed.startYear;
  let closest = SUPPORTED_TAX_YEARS[0];

  for (const fy of SUPPORTED_TAX_YEARS) {
    const fyYear = FinancialYear.parse(fy).startYear;
    if (fyYear <= year) {
      closest = fy;
    }
  }

  return closest;
}

function getTaxConfig(financialYear?: string): TaxYearConfig {
  return TAX_YEAR_CONFIGS[resolveTaxYear(financialYear)];
}

function getMLSThresholdsAdjusted(
  config: TaxYearConfig,
  taxpayerType: TaxpayerType,
  dependentChildren: number
): MLSThreshold[] {
  if (taxpayerType === "single") {
    return config.mls.single;
  }

  const dependentAdjustment =
    Math.max(0, dependentChildren - 1) *
    config.mls.familyPerDependentChildAfterFirst;
  const [base, tier1, tier2] = config.mls.familyBaseThresholds;

  return [
    { min: 0, max: base + dependentAdjustment, rate: 0 },
    { min: base + dependentAdjustment + 1, max: tier1 + dependentAdjustment, rate: 1 },
    {
      min: tier1 + dependentAdjustment + 1,
      max: tier2 + dependentAdjustment,
      rate: 1.25,
    },
    { min: tier2 + dependentAdjustment + 1, max: Infinity, rate: 1.5 },
  ];
}

function calculateMedicareLevy(
  taxableIncome: number,
  config: TaxYearConfig,
  taxpayerType: TaxpayerType,
  dependentChildren: number
): number {
  const baseThreshold =
    taxpayerType === "family"
      ? config.medicareLevy.familyThreshold +
        dependentChildren * config.medicareLevy.familyPerDependentChild
      : config.medicareLevy.singleThreshold;

  if (taxableIncome <= baseThreshold) {
    return 0;
  }

  const standardLevy = (taxableIncome * config.medicareLevy.rate) / 100;
  const reducedLevy =
    ((taxableIncome - baseThreshold) * config.medicareLevy.shadeInRate) / 100;

  return Math.min(standardLevy, standardLevy > 0 ? reducedLevy : 0);
}

// ============ Income Tax Calculations ============

/**
 * Calculate income tax for a given taxable income using FY-specific rates.
 */
export function calculateIncomeTax(
  taxableIncomeCents: number,
  options: TaxCalculationOptions = {}
): TaxCalculation {
  const taxableIncome = Math.max(0, taxableIncomeCents) / 100;
  const config = getTaxConfig(options.financialYear);
  const taxpayerType = options.taxpayerType ?? "single";
  const dependentChildren = Math.max(0, options.dependentChildren ?? 0);

  let bracket: TaxBracket | undefined;
  let incomeTax = 0;

  for (const b of config.brackets) {
    if (taxableIncome >= b.min && taxableIncome <= b.max) {
      bracket = b;
      break;
    }
  }

  if (bracket) {
    const excess = Math.max(0, taxableIncome - bracket.min);
    incomeTax = bracket.baseTax + (excess * bracket.rate) / 100;
  }

  const medicareLevy = calculateMedicareLevy(
    taxableIncome,
    config,
    taxpayerType,
    dependentChildren
  );
  const totalTax = incomeTax + medicareLevy;
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
 * Get marginal tax rate for a given income and FY.
 */
export function getMarginalTaxRate(
  taxableIncomeCents: number,
  options: TaxCalculationOptions = {}
): number {
  const taxableIncome = Math.max(0, taxableIncomeCents) / 100;
  const config = getTaxConfig(options.financialYear);

  for (const bracket of config.brackets) {
    if (taxableIncome >= bracket.min && taxableIncome <= bracket.max) {
      return bracket.rate;
    }
  }

  return config.brackets[config.brackets.length - 1].rate;
}

/**
 * Get MLS thresholds for display/reporting for the selected FY and taxpayer type.
 */
export function getMLSThresholds(
  options: TaxCalculationOptions = {}
): MLSThreshold[] {
  const config = getTaxConfig(options.financialYear);
  const taxpayerType = options.taxpayerType ?? "single";
  const dependentChildren = Math.max(0, options.dependentChildren ?? 0);

  return getMLSThresholdsAdjusted(config, taxpayerType, dependentChildren);
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
    financialYear,
    taxpayerType = "single",
    dependentChildren = 0,
    mlsIncome,
  } = inputs;

  // Calculate taxable income
  // Capital losses generally offset capital gains only, not other income.
  // Prevent negative capital gains from reducing taxable income.
  const taxableCapitalGains = Math.max(0, capitalGains);
  const taxableIncome = Math.max(
    0,
    grossIncome - deductions + taxableCapitalGains
  );

  // Calculate base tax
  const taxCalc = calculateIncomeTax(taxableIncome, {
    financialYear,
    taxpayerType,
    dependentChildren,
  });

  // Add capital gains tax (already included in taxable income)
  // Apply franking credit offset
  let taxPayable = taxCalc.totalTax.cents - frankingCredits;

  // Medicare Levy Surcharge (if no private health)
  let mlsCents = 0;
  if (!hasPrivateHealth) {
    const config = getTaxConfig(financialYear);
    const incomeForMLS = Math.max(0, mlsIncome ?? taxableIncome) / 100;
    const thresholds = getMLSThresholdsAdjusted(
      config,
      taxpayerType,
      Math.max(0, dependentChildren)
    );

    let mlsRate = 0;
    for (const threshold of thresholds) {
      if (incomeForMLS >= threshold.min && incomeForMLS <= threshold.max) {
        mlsRate = threshold.rate;
        break;
      }
    }

    mlsCents = Math.round((Math.max(0, mlsIncome ?? taxableIncome) * mlsRate) / 100);
  }

  taxPayable += mlsCents;

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
    medicareLevySurcharge: Money.fromCents(mlsCents),
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

export type TaxpayerType = "single" | "family";

interface MedicareLevyConfig {
  rate: number;
  singleThreshold: number;
  familyThreshold: number;
  familyPerDependentChild: number;
  shadeInRate: number; // 10% phase-in rule
}

interface MLSConfig {
  single: MLSThreshold[];
  familyBaseThresholds: [number, number, number];
  familyPerDependentChildAfterFirst: number;
}

interface TaxYearConfig {
  brackets: TaxBracket[];
  medicareLevy: MedicareLevyConfig;
  mls: MLSConfig;
}

export interface TaxCalculationOptions {
  financialYear?: string; // e.g. "2025-26"
  taxpayerType?: TaxpayerType;
  dependentChildren?: number;
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
  financialYear?: string;
  taxpayerType?: TaxpayerType;
  dependentChildren?: number;
  mlsIncome?: number; // cents - defaults to taxable income if omitted
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

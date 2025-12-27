/**
 * Investment Capital Gains Tax Calculator
 *
 * Calculates CGT for investment transactions (shares, ETFs, crypto, managed funds)
 * following Australian tax rules:
 * - 50% CGT discount for assets held 12+ months
 * - Uses average cost basis method (proportional reduction)
 *
 * All amounts in cents (integers) to avoid floating-point issues.
 * Uses Decimal.js for precise financial calculations.
 */

import Decimal from "decimal.js";

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============ Types ============

export interface InvestmentCGTInputs {
  // Sale details
  saleProceeds: number; // cents - total sale amount (units × price)
  saleDate: Date;
  fees?: number; // cents - brokerage/transaction fees on sale

  // Cost basis
  costBasis: number; // cents - proportional cost of units sold
  purchaseDate: Date; // earliest purchase date for holding period

  // Tax info (optional - for calculating tax payable)
  marginalTaxRate?: number; // percentage (e.g., 32.5)
}

export interface InvestmentCGTResult {
  // Capital gain calculation
  costBasis: number; // cents
  saleProceeds: number; // cents (after fees)
  grossCapitalGain: number; // cents - can be negative (capital loss)

  // Discount eligibility
  holdingPeriodDays: number;
  holdingPeriodMonths: number;
  isEligibleForDiscount: boolean; // 12+ months
  discountPercent: number; // 0 or 50%

  // Net capital gain
  discountAmount: number; // cents
  netCapitalGain: number; // cents - after discount (taxable amount)

  // Tax estimate (if marginal rate provided)
  estimatedTax?: number; // cents
  effectiveTaxRate?: number; // percentage

  // Is this a loss?
  isCapitalLoss: boolean;
}

export interface CGTSellParams {
  holdingId: string;
  units: number;
  pricePerUnit: number; // cents
  fees?: number; // cents
  saleDate: Date;
  // Historical data for accurate CGT
  totalUnits: number; // total units before sale
  totalCostBasis: number; // total cost basis before sale (cents)
  firstPurchaseDate?: Date; // for holding period calculation
}

// ============ Constants ============

/**
 * CGT discount for assets held 12+ months
 */
export const CGT_DISCOUNT_RATE = 50; // percentage

/**
 * Minimum holding period for CGT discount (in days)
 * Note: Actual eligibility uses 12 calendar months per ATO rules,
 * but we keep this for backwards compatibility/display purposes
 */
export const CGT_DISCOUNT_HOLDING_DAYS = 365;

/**
 * Minimum holding period in months
 */
export const CGT_DISCOUNT_HOLDING_MONTHS = 12;

// ============ Helper Functions ============

/**
 * Calculate days between two dates
 */
function daysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate months between two dates (approximate)
 */
function monthsBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const dayDiff = end.getDate() - start.getDate();

  let months = yearDiff * 12 + monthDiff;
  if (dayDiff < 0) {
    months--;
  }

  return Math.max(0, months);
}

// ============ Main Calculation Functions ============

/**
 * Calculate capital gain/loss for an investment sale
 *
 * Australian CGT rules for investments:
 * 1. Calculate cost basis of units sold
 * 2. Calculate capital proceeds (sale amount - fees)
 * 3. Apply 50% discount if held 12+ months
 *
 * @param inputs - Investment CGT inputs
 * @returns CGT result with detailed breakdown
 */
export function calculateInvestmentCGT(inputs: InvestmentCGTInputs): InvestmentCGTResult {
  const {
    saleProceeds,
    saleDate,
    fees = 0,
    costBasis,
    purchaseDate,
    marginalTaxRate,
  } = inputs;

  // Calculate holding period
  const holdingPeriodDays = daysBetween(purchaseDate, saleDate);
  const holdingPeriodMonths = monthsBetween(purchaseDate, saleDate);
  // Per ATO rules, CGT discount requires 12 calendar months, not 365 days
  // This correctly handles leap years and varying month lengths
  const isEligibleForDiscount = holdingPeriodMonths >= CGT_DISCOUNT_HOLDING_MONTHS;
  const discountPercent = isEligibleForDiscount ? CGT_DISCOUNT_RATE : 0;

  // Calculate capital proceeds (sale amount - fees)
  const netProceeds = new Decimal(saleProceeds).minus(fees);

  // Calculate gross capital gain/loss
  const grossCapitalGain = netProceeds.minus(costBasis);
  const isCapitalLoss = grossCapitalGain.lessThan(0);

  // Apply discount if eligible and there's a gain
  let discountAmount = new Decimal(0);
  let netCapitalGain = grossCapitalGain;

  if (!isCapitalLoss && isEligibleForDiscount) {
    discountAmount = grossCapitalGain.times(discountPercent).dividedBy(100).round();
    netCapitalGain = grossCapitalGain.minus(discountAmount);
  }

  // Calculate estimated tax if marginal rate provided
  let estimatedTax: number | undefined;
  let effectiveTaxRate: number | undefined;

  if (marginalTaxRate !== undefined && netCapitalGain.greaterThan(0)) {
    estimatedTax = netCapitalGain.times(marginalTaxRate).dividedBy(100).round().toNumber();
    effectiveTaxRate = grossCapitalGain.greaterThan(0)
      ? new Decimal(estimatedTax).dividedBy(grossCapitalGain).times(100).toDecimalPlaces(1).toNumber()
      : 0;
  }

  return {
    costBasis,
    saleProceeds: netProceeds.round().toNumber(),
    grossCapitalGain: grossCapitalGain.round().toNumber(),
    holdingPeriodDays,
    holdingPeriodMonths,
    isEligibleForDiscount,
    discountPercent,
    discountAmount: discountAmount.round().toNumber(),
    netCapitalGain: netCapitalGain.round().toNumber(),
    estimatedTax,
    effectiveTaxRate,
    isCapitalLoss,
  };
}

/**
 * Calculate CGT for a sell transaction using average cost basis
 *
 * Uses proportional reduction of cost basis based on units sold.
 *
 * @param params - Sell parameters including holding state
 * @returns CGT result
 */
export function calculateSellTransactionCGT(params: CGTSellParams): InvestmentCGTResult {
  const {
    units,
    pricePerUnit,
    fees = 0,
    saleDate,
    totalUnits,
    totalCostBasis,
    firstPurchaseDate,
  } = params;

  // Calculate proportional cost basis (average cost method)
  const proportionalCostBasis = totalUnits > 0
    ? new Decimal(totalCostBasis).times(units).dividedBy(totalUnits).round().toNumber()
    : 0;

  // Calculate sale proceeds
  const saleProceeds = new Decimal(units).times(pricePerUnit).round().toNumber();

  // Default purchase date to 1 day ago if not provided (for new holdings)
  const purchaseDate = firstPurchaseDate || new Date(saleDate.getTime() - 24 * 60 * 60 * 1000);

  return calculateInvestmentCGT({
    saleProceeds,
    saleDate,
    fees,
    costBasis: proportionalCostBasis,
    purchaseDate,
  });
}

/**
 * Get the earliest purchase date for a holding from transactions
 *
 * @param transactions - Array of investment transactions
 * @returns Earliest buy transaction date, or undefined if no buys
 */
export function getEarliestPurchaseDate(
  transactions: Array<{ type: string; date: Date }>
): Date | undefined {
  const buyTransactions = transactions.filter((t) => t.type === "buy");

  if (buyTransactions.length === 0) {
    return undefined;
  }

  return buyTransactions.reduce(
    (earliest, t) => (t.date < earliest ? t.date : earliest),
    buyTransactions[0].date
  );
}

/**
 * Format holding period for display
 *
 * @param days - Number of days
 * @returns Formatted string like "1 year, 3 months" or "45 days"
 */
export function formatHoldingPeriod(days: number): string {
  if (days < 30) {
    return `${days} day${days !== 1 ? "s" : ""}`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months !== 1 ? "s" : ""}`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  let result = `${years} year${years !== 1 ? "s" : ""}`;
  if (remainingMonths > 0) {
    result += `, ${remainingMonths} month${remainingMonths !== 1 ? "s" : ""}`;
  }

  return result;
}

/**
 * Calculate days until CGT discount eligibility
 * Uses 12 calendar months per ATO rules
 *
 * @param purchaseDate - Date of purchase
 * @returns Days remaining until eligible, or 0 if already eligible
 */
export function daysUntilCGTDiscount(purchaseDate: Date): number {
  // Calculate eligibility date as exactly 12 months from purchase
  const eligibilityDate = new Date(purchaseDate);
  eligibilityDate.setMonth(eligibilityDate.getMonth() + CGT_DISCOUNT_HOLDING_MONTHS);

  const today = new Date();
  const daysRemaining = daysBetween(today, eligibilityDate);

  return Math.max(0, daysRemaining);
}

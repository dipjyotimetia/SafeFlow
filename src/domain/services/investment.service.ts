/**
 * Investment Domain Service
 *
 * Pure functions for investment-related business logic.
 * Includes holdings, cost basis, CGT, franking credits, and portfolio analysis.
 */

import { Money } from "../value-objects/money";
import type {
  Holding,
  HoldingType,
  InvestmentTransaction,
  InvestmentTransactionType,
} from "@/types";

// ============ Portfolio Calculations ============

/**
 * Calculate portfolio summary from holdings
 */
export function calculatePortfolioSummary(
  holdings: Holding[]
): PortfolioSummary {
  let totalCostBasis = 0;
  let totalCurrentValue = 0;
  let holdingsWithValue = 0;

  for (const holding of holdings) {
    totalCostBasis += holding.costBasis;
    if (holding.currentValue !== undefined) {
      totalCurrentValue += holding.currentValue;
      holdingsWithValue++;
    }
  }

  const unrealizedGain = totalCurrentValue - totalCostBasis;
  const unrealizedGainPercent =
    totalCostBasis > 0 ? (unrealizedGain / totalCostBasis) * 100 : 0;

  return {
    totalCostBasis: Money.fromCents(totalCostBasis),
    totalCurrentValue: Money.fromCents(totalCurrentValue),
    unrealizedGain: Money.fromCents(unrealizedGain),
    unrealizedGainPercent: Math.round(unrealizedGainPercent * 100) / 100,
    holdingCount: holdings.length,
    holdingsWithPricing: holdingsWithValue,
  };
}

/**
 * Calculate portfolio allocation by holding type
 */
export function calculateAllocation(holdings: Holding[]): AllocationBreakdown[] {
  const byType = new Map<HoldingType, { value: number; costBasis: number }>();

  // Sum values by type
  for (const holding of holdings) {
    const current = byType.get(holding.type) || { value: 0, costBasis: 0 };
    byType.set(holding.type, {
      value: current.value + (holding.currentValue || holding.costBasis),
      costBasis: current.costBasis + holding.costBasis,
    });
  }

  // Calculate total
  let totalValue = 0;
  for (const data of byType.values()) {
    totalValue += data.value;
  }

  // Build allocation breakdown
  const allocations: AllocationBreakdown[] = [];
  for (const [type, data] of byType) {
    allocations.push({
      type,
      value: Money.fromCents(data.value),
      costBasis: Money.fromCents(data.costBasis),
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    });
  }

  // Sort by value descending
  allocations.sort((a, b) => b.value.cents - a.value.cents);

  return allocations;
}

// ============ Cost Basis Calculations ============

/**
 * Calculate proportional cost basis for a partial sale (average cost method)
 * @param unitsToSell Number of units being sold
 * @param totalUnits Total units before sale
 * @param totalCostBasis Total cost basis before sale (cents)
 * @returns Proportional cost basis for the sale (cents)
 */
export function calculateProportionalCostBasis(
  unitsToSell: number,
  totalUnits: number,
  totalCostBasis: number
): number {
  if (totalUnits <= 0) return 0;
  return Math.round((totalCostBasis * unitsToSell) / totalUnits);
}

/**
 * Calculate average cost per unit
 * @param totalCostBasis Total cost basis (cents)
 * @param totalUnits Total units
 * @returns Average cost per unit (cents)
 */
export function calculateAverageCostPerUnit(
  totalCostBasis: number,
  totalUnits: number
): number {
  if (totalUnits <= 0) return 0;
  return Math.round(totalCostBasis / totalUnits);
}

/**
 * Calculate updated holding state after a transaction
 */
export function calculateHoldingAfterTransaction(
  holding: Pick<Holding, "units" | "costBasis" | "currentPrice">,
  transaction: {
    type: InvestmentTransactionType;
    units: number;
    totalAmount: number;
  }
): { units: number; costBasis: number; currentValue?: number } {
  let newUnits = holding.units;
  let newCostBasis = holding.costBasis;

  if (transaction.type === "buy") {
    newUnits += transaction.units;
    newCostBasis += transaction.totalAmount;
  } else if (transaction.type === "sell") {
    // Calculate proportional cost basis reduction
    const proportionalCostBasis = calculateProportionalCostBasis(
      transaction.units,
      holding.units,
      holding.costBasis
    );
    newUnits -= transaction.units;
    newCostBasis -= proportionalCostBasis;
  }

  // Ensure non-negative values
  newUnits = Math.max(0, newUnits);
  newCostBasis = Math.max(0, newCostBasis);

  return {
    units: newUnits,
    costBasis: newCostBasis,
    currentValue: holding.currentPrice
      ? Math.round(newUnits * holding.currentPrice)
      : undefined,
  };
}

// ============ CGT Calculations ============

/**
 * Calculate days between two dates
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate months between two dates
 */
export function monthsBetween(startDate: Date, endDate: Date): number {
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

/**
 * Check if eligible for CGT discount (12+ months holding)
 */
export function isEligibleForCGTDiscount(
  purchaseDate: Date,
  saleDate: Date
): boolean {
  return monthsBetween(purchaseDate, saleDate) >= 12;
}

/**
 * Calculate capital gain/loss
 */
export function calculateCapitalGain(inputs: CGTInputs): CGTResult {
  const { saleProceeds, fees = 0, costBasis, purchaseDate, saleDate } = inputs;

  // Calculate holding period
  const holdingPeriodDays = daysBetween(purchaseDate, saleDate);
  const holdingPeriodMonths = monthsBetween(purchaseDate, saleDate);
  const isEligibleForDiscount = holdingPeriodMonths >= 12;

  // Calculate gross gain/loss
  const netProceeds = saleProceeds - fees;
  const grossCapitalGain = netProceeds - costBasis;
  const isCapitalLoss = grossCapitalGain < 0;

  // Apply 50% discount if eligible and it's a gain
  let discountAmount = 0;
  let netCapitalGain = grossCapitalGain;

  if (!isCapitalLoss && isEligibleForDiscount) {
    discountAmount = Math.round(grossCapitalGain * 0.5);
    netCapitalGain = grossCapitalGain - discountAmount;
  }

  return {
    costBasis: Money.fromCents(costBasis),
    saleProceeds: Money.fromCents(netProceeds),
    grossCapitalGain: Money.fromCents(grossCapitalGain),
    holdingPeriodDays,
    holdingPeriodMonths,
    isEligibleForDiscount,
    discountPercent: isEligibleForDiscount ? 50 : 0,
    discountAmount: Money.fromCents(discountAmount),
    netCapitalGain: Money.fromCents(netCapitalGain),
    isCapitalLoss,
  };
}

/**
 * Format holding period for display
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

// ============ Franking Credits ============

export type CompanyTaxRate = 30 | 25;

/**
 * Get franking credit multiplier for a company tax rate
 * For 30%: 0.30 / 0.70 = 0.4286
 * For 25%: 0.25 / 0.75 = 0.3333
 */
export function getFrankingMultiplier(companyTaxRate: CompanyTaxRate = 30): number {
  const rate = companyTaxRate / 100;
  return rate / (1 - rate);
}

/**
 * Calculate franking credit from cash dividend
 * Formula: credit = cash × multiplier × franking_percentage
 */
export function calculateFrankingCredit(
  cashDividendCents: number,
  frankingPercentage: number,
  companyTaxRate: CompanyTaxRate = 30
): number {
  if (cashDividendCents <= 0) return 0;
  if (frankingPercentage <= 0 || frankingPercentage > 100) return 0;

  const frankingRate = frankingPercentage / 100;
  const multiplier = getFrankingMultiplier(companyTaxRate);

  return Math.round(cashDividendCents * multiplier * frankingRate);
}

/**
 * Calculate grossed-up dividend (assessable income)
 */
export function calculateGrossedUpDividend(
  cashDividendCents: number,
  frankingCreditCents: number
): number {
  return cashDividendCents + frankingCreditCents;
}

/**
 * Calculate full franking details
 */
export function calculateFrankingDetails(
  cashDividendCents: number,
  frankingPercentage: number,
  companyTaxRate: CompanyTaxRate = 30
): FrankingDetails {
  const frankingCredit = calculateFrankingCredit(
    cashDividendCents,
    frankingPercentage,
    companyTaxRate
  );
  const grossedUp = calculateGrossedUpDividend(cashDividendCents, frankingCredit);

  return {
    cashDividend: Money.fromCents(cashDividendCents),
    frankingCredit: Money.fromCents(frankingCredit),
    grossedUpDividend: Money.fromCents(grossedUp),
    frankingPercentage,
    companyTaxRate,
  };
}

// ============ Dividend Summary ============

/**
 * Calculate dividend summary from transactions
 */
export function calculateDividendSummary(
  transactions: InvestmentTransaction[]
): DividendSummary {
  let totalCashDividends = 0;
  let totalFrankingCredits = 0;
  let dividendCount = 0;

  for (const tx of transactions) {
    if (tx.type === "dividend" || tx.type === "distribution") {
      totalCashDividends += tx.totalAmount;
      totalFrankingCredits += tx.frankingCreditAmount || 0;
      dividendCount++;
    }
  }

  return {
    totalCashDividends: Money.fromCents(totalCashDividends),
    totalFrankingCredits: Money.fromCents(totalFrankingCredits),
    totalGrossedUp: Money.fromCents(totalCashDividends + totalFrankingCredits),
    dividendCount,
  };
}

// ============ Validation ============

/**
 * Validate sell transaction
 */
export function validateSellTransaction(
  unitsToSell: number,
  availableUnits: number
): { isValid: boolean; error?: string } {
  if (unitsToSell <= 0) {
    return { isValid: false, error: "Units to sell must be positive" };
  }
  if (unitsToSell > availableUnits) {
    return {
      isValid: false,
      error: `Cannot sell ${unitsToSell} units. Only ${availableUnits} units available.`,
    };
  }
  return { isValid: true };
}

/**
 * Check if a holding type is tradeable (has market price)
 */
export function isTradeableHoldingType(type: HoldingType): boolean {
  return ["etf", "stock", "crypto"].includes(type);
}

// ============ Types ============

export interface PortfolioSummary {
  totalCostBasis: Money;
  totalCurrentValue: Money;
  unrealizedGain: Money;
  unrealizedGainPercent: number;
  holdingCount: number;
  holdingsWithPricing: number;
}

export interface AllocationBreakdown {
  type: HoldingType;
  value: Money;
  costBasis: Money;
  percentage: number;
}

export interface CGTInputs {
  saleProceeds: number; // cents
  fees?: number; // cents
  costBasis: number; // cents
  purchaseDate: Date;
  saleDate: Date;
}

export interface CGTResult {
  costBasis: Money;
  saleProceeds: Money;
  grossCapitalGain: Money;
  holdingPeriodDays: number;
  holdingPeriodMonths: number;
  isEligibleForDiscount: boolean;
  discountPercent: number;
  discountAmount: Money;
  netCapitalGain: Money;
  isCapitalLoss: boolean;
}

export interface FrankingDetails {
  cashDividend: Money;
  frankingCredit: Money;
  grossedUpDividend: Money;
  frankingPercentage: number;
  companyTaxRate: CompanyTaxRate;
}

export interface DividendSummary {
  totalCashDividends: Money;
  totalFrankingCredits: Money;
  totalGrossedUp: Money;
  dividendCount: number;
}

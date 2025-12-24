/**
 * Franking Credit Calculation Utilities
 *
 * Australian dividend imputation system utilities for calculating
 * franking credits and grossed-up dividend amounts.
 *
 * Key concepts:
 * - Companies pay tax at 30% (or 25% for small business entities)
 * - Franked dividends have imputation credits attached
 * - Franking credit = cash dividend × (company rate / (1 - company rate)) × franking %
 * - Grossed-up dividend = cash dividend + franking credit
 * - Franking credit is a tax offset (reduces tax payable dollar-for-dollar)
 */

/**
 * Company tax rate type
 * - 30: Standard company tax rate
 * - 25: Base rate entity (small business) tax rate
 */
export type CompanyTaxRate = 30 | 25;

/**
 * Calculate the franking credit multiplier for a given company tax rate
 *
 * For 30% rate: 0.30 / 0.70 = 0.4286 (rounded)
 * For 25% rate: 0.25 / 0.75 = 0.3333 (rounded)
 *
 * @param companyTaxRate - Company tax rate (30 or 25)
 * @returns The franking credit multiplier
 */
export function getFrankingMultiplier(companyTaxRate: CompanyTaxRate = 30): number {
  const rate = companyTaxRate / 100;
  return rate / (1 - rate);
}

/**
 * Calculate franking credit from a cash dividend amount
 *
 * Formula: credit = cash × (company_rate / (1 - company_rate)) × franking_percentage
 *
 * Example: $100 fully franked dividend at 30% rate
 * credit = 10000 cents × 0.4286 × 1.0 = 4286 cents ($42.86)
 *
 * @param cashDividendCents - Cash dividend received in cents
 * @param frankingPercentage - Franking percentage (0-100, e.g., 100 = fully franked)
 * @param companyTaxRate - Company tax rate (30 or 25), defaults to 30
 * @returns Franking credit amount in cents
 */
export function calculateFrankingCredit(
  cashDividendCents: number,
  frankingPercentage: number,
  companyTaxRate: CompanyTaxRate = 30
): number {
  // Validate inputs
  if (cashDividendCents <= 0) {
    return 0;
  }

  if (frankingPercentage <= 0 || frankingPercentage > 100) {
    return 0;
  }

  const frankingRate = frankingPercentage / 100;
  const multiplier = getFrankingMultiplier(companyTaxRate);

  // Calculate and round to avoid floating-point issues
  const credit = cashDividendCents * multiplier * frankingRate;

  return Math.round(credit);
}

/**
 * Calculate the grossed-up dividend amount (assessable income)
 *
 * Grossed-up = cash dividend + franking credit
 *
 * @param cashDividendCents - Cash dividend received in cents
 * @param frankingCreditCents - Franking credit in cents
 * @returns Grossed-up dividend amount in cents
 */
export function calculateGrossedUpDividend(
  cashDividendCents: number,
  frankingCreditCents: number
): number {
  return cashDividendCents + frankingCreditCents;
}

/**
 * Calculate both franking credit and grossed-up amount in one call
 *
 * @param cashDividendCents - Cash dividend received in cents
 * @param frankingPercentage - Franking percentage (0-100)
 * @param companyTaxRate - Company tax rate (30 or 25)
 * @returns Object with frankingCredit and grossedUp amounts in cents
 */
export function calculateFrankingDetails(
  cashDividendCents: number,
  frankingPercentage: number,
  companyTaxRate: CompanyTaxRate = 30
): { frankingCredit: number; grossedUp: number } {
  const frankingCredit = calculateFrankingCredit(
    cashDividendCents,
    frankingPercentage,
    companyTaxRate
  );

  const grossedUp = calculateGrossedUpDividend(cashDividendCents, frankingCredit);

  return { frankingCredit, grossedUp };
}

/**
 * Calculate the maximum franking credit for a fully franked dividend
 *
 * @param cashDividendCents - Cash dividend in cents
 * @param companyTaxRate - Company tax rate (30 or 25)
 * @returns Maximum franking credit in cents
 */
export function calculateMaxFrankingCredit(
  cashDividendCents: number,
  companyTaxRate: CompanyTaxRate = 30
): number {
  return calculateFrankingCredit(cashDividendCents, 100, companyTaxRate);
}

/**
 * Validate that a franking percentage is within valid range
 *
 * @param percentage - The franking percentage to validate
 * @returns true if valid (0-100), false otherwise
 */
export function isValidFrankingPercentage(percentage: number): boolean {
  return percentage >= 0 && percentage <= 100;
}

/**
 * Format franking percentage for display
 *
 * @param percentage - Franking percentage (0-100)
 * @returns Formatted string like "100% franked" or "Unfranked"
 */
export function formatFrankingPercentage(percentage: number): string {
  if (percentage <= 0) {
    return 'Unfranked';
  }
  if (percentage >= 100) {
    return 'Fully franked';
  }
  return `${percentage}% franked`;
}

/**
 * Franking credit summary for a financial year
 */
export interface FrankingSummary {
  financialYear: string;
  totalDividends: number; // cents - cash received
  totalFrankingCredits: number; // cents - tax offset
  totalGrossedUpDividends: number; // cents - assessable income
  byHolding: FrankingByHolding[];
}

/**
 * Franking details for a single holding
 */
export interface FrankingByHolding {
  holdingId: string;
  symbol: string;
  dividends: number; // cents
  frankingCredits: number; // cents
  grossedUp: number; // cents
  transactionCount: number;
}

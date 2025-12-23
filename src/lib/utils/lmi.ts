/**
 * Lenders Mortgage Insurance (LMI) Calculator
 *
 * LMI is required when borrowing more than 80% of the property value (LVR > 80%).
 * This calculator provides estimates based on typical Australian LMI rates.
 *
 * All amounts in cents (integers) to avoid floating-point issues.
 */

import type { LMIResult } from "@/types";

/**
 * LMI rate bands based on LVR (Loan-to-Value Ratio)
 * These are approximate rates - actual rates vary by lender
 */
interface LMIRateBand {
  minLVR: number;
  maxLVR: number;
  rate: number; // Percentage of loan amount
}

// Standard LMI rates by LVR band (approximate industry rates)
// Rates vary by lender, loan amount, and borrower profile
const LMI_RATE_BANDS: LMIRateBand[] = [
  { minLVR: 0, maxLVR: 80, rate: 0 }, // No LMI required
  { minLVR: 80, maxLVR: 85, rate: 0.52 },
  { minLVR: 85, maxLVR: 88, rate: 1.1 },
  { minLVR: 88, maxLVR: 90, rate: 1.85 },
  { minLVR: 90, maxLVR: 92, rate: 2.45 },
  { minLVR: 92, maxLVR: 95, rate: 3.1 },
  { minLVR: 95, maxLVR: 97, rate: 3.75 },
];

// Higher rates for larger loan amounts (over $500k, $750k, $1M)
const LOAN_SIZE_MULTIPLIERS: { threshold: number; multiplier: number }[] = [
  { threshold: 100000000, multiplier: 1.35 }, // Over $1M
  { threshold: 75000000, multiplier: 1.2 }, // Over $750k
  { threshold: 50000000, multiplier: 1.1 }, // Over $500k
  { threshold: 0, multiplier: 1.0 }, // Under $500k
];

/**
 * Get the LMI rate based on LVR
 */
function getLMIRate(lvr: number): number {
  for (const band of LMI_RATE_BANDS) {
    if (lvr > band.minLVR && lvr <= band.maxLVR) {
      return band.rate;
    }
  }
  // If LVR is above 97%, use the highest rate
  if (lvr > 97) {
    return LMI_RATE_BANDS[LMI_RATE_BANDS.length - 1].rate;
  }
  return 0;
}

/**
 * Get loan size multiplier for larger loans
 */
function getLoanSizeMultiplier(loanAmount: number): number {
  for (const tier of LOAN_SIZE_MULTIPLIERS) {
    if (loanAmount >= tier.threshold) {
      return tier.multiplier;
    }
  }
  return 1.0;
}

/**
 * Calculate Loan-to-Value Ratio
 *
 * @param loanAmount - Loan amount in cents
 * @param propertyValue - Property value in cents
 * @returns LVR as a percentage (e.g., 80 for 80%)
 */
export function calculateLVR(loanAmount: number, propertyValue: number): number {
  if (propertyValue === 0) return 0;
  return (loanAmount / propertyValue) * 100;
}

/**
 * Calculate Lenders Mortgage Insurance
 *
 * @param propertyValue - Property value in cents
 * @param loanAmount - Loan amount in cents
 * @returns LMIResult with LMI amount and details
 */
export function calculateLMI(
  propertyValue: number,
  loanAmount: number
): LMIResult {
  const lvr = calculateLVR(loanAmount, propertyValue);

  // No LMI required if LVR <= 80%
  if (lvr <= 80) {
    return {
      lmiAmount: 0,
      lvr,
      requiresLMI: false,
      lmiRate: 0,
    };
  }

  // Get base LMI rate
  const baseRate = getLMIRate(lvr);

  // Apply loan size multiplier
  const sizeMultiplier = getLoanSizeMultiplier(loanAmount);
  const adjustedRate = baseRate * sizeMultiplier;

  // Calculate LMI amount (percentage of loan amount)
  // LMI is calculated on the loan amount, not property value
  const lmiAmount = Math.round((loanAmount * adjustedRate) / 100);

  return {
    lmiAmount,
    lvr: Math.round(lvr * 100) / 100, // Round to 2 decimal places
    requiresLMI: true,
    lmiRate: Math.round(adjustedRate * 100) / 100,
  };
}

/**
 * Calculate the maximum loan amount to avoid LMI
 *
 * @param propertyValue - Property value in cents
 * @returns Maximum loan amount in cents (80% LVR)
 */
export function getMaxLoanWithoutLMI(propertyValue: number): number {
  return Math.round(propertyValue * 0.8);
}

/**
 * Calculate minimum deposit to avoid LMI
 *
 * @param purchasePrice - Purchase price in cents
 * @returns Minimum deposit in cents (20% + stamp duty)
 */
export function getMinDepositWithoutLMI(purchasePrice: number): number {
  return Math.round(purchasePrice * 0.2);
}

/**
 * Calculate deposit percentage
 *
 * @param depositAmount - Deposit amount in cents
 * @param purchasePrice - Purchase price in cents
 * @returns Deposit percentage (e.g., 20 for 20%)
 */
export function calculateDepositPercent(
  depositAmount: number,
  purchasePrice: number
): number {
  if (purchasePrice === 0) return 0;
  return (depositAmount / purchasePrice) * 100;
}

/**
 * Get LMI estimate for different deposit scenarios
 */
export function getLMIScenarios(
  purchasePrice: number
): { depositPercent: number; deposit: number; loanAmount: number; lmi: number; totalRequired: number }[] {
  const scenarios = [5, 10, 15, 20, 25, 30];

  return scenarios.map((depositPercent) => {
    const deposit = Math.round((purchasePrice * depositPercent) / 100);
    const loanAmount = purchasePrice - deposit;
    const { lmiAmount } = calculateLMI(purchasePrice, loanAmount);

    return {
      depositPercent,
      deposit,
      loanAmount,
      lmi: lmiAmount,
      totalRequired: deposit + lmiAmount, // Deposit + LMI (if capitalized, loan increases)
    };
  });
}

/**
 * Check if LMI can be waived
 * Some lenders waive LMI for certain professions or programs
 */
export function checkLMIWaiverEligibility(
  lvr: number,
  profession?: string
): {
  eligible: boolean;
  reason?: string;
} {
  // Common LMI waiver professions (varies by lender)
  const lmiWaiverProfessions = [
    "doctor",
    "dentist",
    "medical-specialist",
    "lawyer",
    "accountant-ca",
    "accountant-cpa",
    "actuary",
    "engineer",
    "veterinarian",
  ];

  if (lvr <= 80) {
    return { eligible: true, reason: "LVR is 80% or below - no LMI required" };
  }

  if (profession && lmiWaiverProfessions.includes(profession.toLowerCase())) {
    if (lvr <= 90) {
      return {
        eligible: true,
        reason: `Professional LMI waiver may be available for ${profession}`,
      };
    }
  }

  return { eligible: false };
}

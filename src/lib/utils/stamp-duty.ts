/**
 * Australian State-specific Stamp Duty Calculator
 *
 * Rates as of 2025-26 financial year.
 * All amounts in cents (integers) to avoid floating-point issues.
 */

import type { AustralianState, StampDutyResult } from "@/types";

// Stamp duty brackets for each state
// Each bracket: { threshold: number, rate: number, base: number }
// threshold is the upper limit in dollars, rate is the marginal rate, base is the cumulative duty

interface StampDutyBracket {
  threshold: number; // Upper threshold in dollars
  rate: number; // Marginal rate (e.g., 0.0125 for 1.25%)
  base: number; // Base duty in dollars for amounts up to previous bracket
}

// NSW Stamp Duty Rates (2025-26)
// https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty
const NSW_BRACKETS: StampDutyBracket[] = [
  { threshold: 16000, rate: 0.0125, base: 0 },
  { threshold: 35000, rate: 0.015, base: 200 },
  { threshold: 93000, rate: 0.0175, base: 485 },
  { threshold: 351000, rate: 0.035, base: 1500 },
  { threshold: 1168000, rate: 0.045, base: 10530 },
  { threshold: 3505000, rate: 0.055, base: 47295 },
  { threshold: Infinity, rate: 0.07, base: 175830 },
];

// VIC Stamp Duty Rates (2025-26)
// https://www.sro.vic.gov.au/land-transfer-duty
const VIC_BRACKETS: StampDutyBracket[] = [
  { threshold: 25000, rate: 0.014, base: 0 },
  { threshold: 130000, rate: 0.024, base: 350 },
  { threshold: 960000, rate: 0.06, base: 2870 },
  { threshold: 2000000, rate: 0.055, base: 52670 },
  { threshold: Infinity, rate: 0.065, base: 109870 },
];

// QLD Stamp Duty Rates (2025-26)
// https://www.qld.gov.au/housing/buying-owning-home/transfer-duty-rates
const QLD_BRACKETS: StampDutyBracket[] = [
  { threshold: 5000, rate: 0.0, base: 0 }, // Nil for first $5k
  { threshold: 75000, rate: 0.015, base: 0 },
  { threshold: 540000, rate: 0.035, base: 1050 },
  { threshold: 1000000, rate: 0.045, base: 17325 },
  { threshold: Infinity, rate: 0.0575, base: 38025 },
];

// SA Stamp Duty Rates (2025-26)
// https://www.revenuesa.sa.gov.au/stampduty
const SA_BRACKETS: StampDutyBracket[] = [
  { threshold: 12000, rate: 0.01, base: 0 },
  { threshold: 30000, rate: 0.02, base: 120 },
  { threshold: 50000, rate: 0.03, base: 480 },
  { threshold: 100000, rate: 0.035, base: 1080 },
  { threshold: 200000, rate: 0.04, base: 2830 },
  { threshold: 250000, rate: 0.0425, base: 6830 },
  { threshold: 300000, rate: 0.0475, base: 8955 },
  { threshold: 500000, rate: 0.05, base: 11330 },
  { threshold: Infinity, rate: 0.055, base: 21330 },
];

// WA Stamp Duty Rates (2025-26)
// https://www.wa.gov.au/government/document-collections/transfer-duty-information
const WA_BRACKETS: StampDutyBracket[] = [
  { threshold: 120000, rate: 0.019, base: 0 },
  { threshold: 150000, rate: 0.0285, base: 2280 },
  { threshold: 360000, rate: 0.038, base: 3135 },
  { threshold: 725000, rate: 0.0475, base: 11115 },
  { threshold: Infinity, rate: 0.0515, base: 28453 },
];

// TAS Stamp Duty Rates (2025-26)
// https://www.sro.tas.gov.au/property-transfer-duties
const TAS_BRACKETS: StampDutyBracket[] = [
  { threshold: 3000, rate: 0.0, base: 50 }, // Minimum $50
  { threshold: 25000, rate: 0.0175, base: 50 },
  { threshold: 75000, rate: 0.0225, base: 435 },
  { threshold: 200000, rate: 0.035, base: 1560 },
  { threshold: 375000, rate: 0.04, base: 5935 },
  { threshold: 725000, rate: 0.0425, base: 12935 },
  { threshold: Infinity, rate: 0.045, base: 27810 },
];

// NT Stamp Duty Rates (2025-26)
// https://treasury.nt.gov.au/revenue/stamp-duty
const NT_BRACKETS: StampDutyBracket[] = [
  { threshold: 525000, rate: 0.0, base: 0 }, // Formula-based for values under threshold
  { threshold: 3000000, rate: 0.0495, base: 0 }, // Different calc above threshold
  { threshold: Infinity, rate: 0.0595, base: 0 },
];

// ACT Stamp Duty Rates (2025-26)
// https://www.revenue.act.gov.au/duties/conveyance-duty
const ACT_BRACKETS: StampDutyBracket[] = [
  { threshold: 200000, rate: 0.012, base: 0 },
  { threshold: 300000, rate: 0.022, base: 2400 },
  { threshold: 500000, rate: 0.034, base: 4600 },
  { threshold: 750000, rate: 0.042, base: 11400 },
  { threshold: 1000000, rate: 0.0505, base: 21900 },
  { threshold: 1455000, rate: 0.057, base: 34525 },
  { threshold: Infinity, rate: 0.068, base: 60460 },
];

// State bracket mapping
const STATE_BRACKETS: Record<AustralianState, StampDutyBracket[]> = {
  NSW: NSW_BRACKETS,
  VIC: VIC_BRACKETS,
  QLD: QLD_BRACKETS,
  SA: SA_BRACKETS,
  WA: WA_BRACKETS,
  TAS: TAS_BRACKETS,
  NT: NT_BRACKETS,
  ACT: ACT_BRACKETS,
};

// First Home Buyer thresholds by state (full exemption below, nil above)
const FHB_EXEMPTION_THRESHOLDS: Record<
  AustralianState,
  { fullExemption: number; partialExemption: number }
> = {
  NSW: { fullExemption: 800000, partialExemption: 1000000 }, // New/existing homes
  VIC: { fullExemption: 600000, partialExemption: 750000 },
  QLD: { fullExemption: 700000, partialExemption: 800000 }, // Home concession
  SA: { fullExemption: 650000, partialExemption: 650000 }, // No partial, just full
  WA: { fullExemption: 430000, partialExemption: 530000 },
  TAS: { fullExemption: 750000, partialExemption: 750000 }, // 50% discount
  NT: { fullExemption: 650000, partialExemption: 650000 },
  ACT: { fullExemption: 1000000, partialExemption: 1000000 }, // Phasing out
};

// Transfer fees by state (approximate)
const TRANSFER_FEES: Record<AustralianState, number> = {
  NSW: 14700, // ~$147
  VIC: 15200, // Varies by value
  QLD: 19500, // $195
  SA: 18900, // $189
  WA: 20000, // ~$200
  TAS: 22500, // $225
  NT: 16800, // $168
  ACT: 34200, // $342
};

// Mortgage registration fees by state
const MORTGAGE_REGISTRATION_FEES: Record<AustralianState, number> = {
  NSW: 15460, // $154.60
  VIC: 12370, // $123.70
  QLD: 19500, // $195
  SA: 18900, // $189
  WA: 18100, // $181
  TAS: 14200, // $142
  NT: 16800, // $168
  ACT: 16800, // $168
};

/**
 * Calculate standard stamp duty using bracket system
 */
function calculateBracketDuty(
  purchasePriceDollars: number,
  brackets: StampDutyBracket[]
): number {
  let previousThreshold = 0;

  for (const bracket of brackets) {
    if (purchasePriceDollars <= bracket.threshold) {
      const amountInBracket = purchasePriceDollars - previousThreshold;
      return Math.round(bracket.base + amountInBracket * bracket.rate);
    }
    previousThreshold = bracket.threshold;
  }

  // Should never reach here if brackets are set up correctly
  const lastBracket = brackets[brackets.length - 1];
  return Math.round(
    lastBracket.base +
      (purchasePriceDollars - previousThreshold) * lastBracket.rate
  );
}

/**
 * Calculate NT stamp duty using their specific formula
 * NT uses a different calculation method for properties under $525k
 */
function calculateNTDuty(purchasePriceDollars: number): number {
  if (purchasePriceDollars <= 525000) {
    // NT formula: D = (0.06571441 × V) + 15
    // Where V is value / 1000
    const v = purchasePriceDollars / 1000;
    const duty = 0.06571441 * v * v + 15;
    return Math.round(duty);
  } else if (purchasePriceDollars <= 3000000) {
    return Math.round(purchasePriceDollars * 0.0495);
  } else {
    return Math.round(purchasePriceDollars * 0.0595);
  }
}

/**
 * Calculate first home buyer concession
 */
function calculateFHBConcession(
  purchasePriceDollars: number,
  standardDuty: number,
  state: AustralianState
): number {
  const thresholds = FHB_EXEMPTION_THRESHOLDS[state];

  if (purchasePriceDollars <= thresholds.fullExemption) {
    // Full exemption
    return standardDuty;
  } else if (purchasePriceDollars <= thresholds.partialExemption) {
    // Partial exemption (sliding scale)
    const range = thresholds.partialExemption - thresholds.fullExemption;
    const excess = purchasePriceDollars - thresholds.fullExemption;
    const ratio = excess / range;
    return Math.round(standardDuty * (1 - ratio));
  }

  return 0; // No concession
}

/**
 * Calculate stamp duty for a property purchase
 *
 * @param purchasePrice - Purchase price in cents
 * @param state - Australian state/territory
 * @param isFirstHomeBuyer - Whether buyer qualifies for FHB concessions
 * @param isInvestment - Whether property is for investment (affects some states)
 * @returns StampDutyResult with all government charges in cents
 */
export function calculateStampDuty(
  purchasePrice: number,
  state: AustralianState,
  isFirstHomeBuyer: boolean = false,
  isInvestment: boolean = true
): StampDutyResult {
  // Convert cents to dollars for calculation
  const purchasePriceDollars = purchasePrice / 100;

  // Calculate standard duty
  let stampDutyDollars: number;

  if (state === "NT") {
    stampDutyDollars = calculateNTDuty(purchasePriceDollars);
  } else {
    stampDutyDollars = calculateBracketDuty(
      purchasePriceDollars,
      STATE_BRACKETS[state]
    );
  }

  // Calculate FHB concession if applicable
  let concessionDollars = 0;
  let isFirstHomeBuyerExempt = false;

  if (isFirstHomeBuyer && !isInvestment) {
    concessionDollars = calculateFHBConcession(
      purchasePriceDollars,
      stampDutyDollars,
      state
    );

    if (concessionDollars === stampDutyDollars) {
      isFirstHomeBuyerExempt = true;
    }

    stampDutyDollars -= concessionDollars;
  }

  // Get transfer and mortgage registration fees
  const transferFeeDollars = TRANSFER_FEES[state] / 100;
  const mortgageRegDollars = MORTGAGE_REGISTRATION_FEES[state] / 100;

  // Calculate total government charges
  const totalChargesDollars =
    stampDutyDollars + transferFeeDollars + mortgageRegDollars;

  // Convert back to cents
  return {
    stampDuty: Math.round(stampDutyDollars * 100),
    transferFee: TRANSFER_FEES[state],
    mortgageRegistration: MORTGAGE_REGISTRATION_FEES[state],
    totalGovernmentCharges: Math.round(totalChargesDollars * 100),
    isFirstHomeBuyerExempt,
    concessionApplied: Math.round(concessionDollars * 100),
  };
}

/**
 * Get stamp duty estimate for display (quick calculation)
 * Returns stamp duty amount in cents
 */
export function estimateStampDuty(
  purchasePrice: number,
  state: AustralianState
): number {
  const result = calculateStampDuty(purchasePrice, state, false, true);
  return result.stampDuty;
}

/**
 * Get all government charges as a formatted breakdown
 */
export function getStampDutyBreakdown(
  purchasePrice: number,
  state: AustralianState,
  isFirstHomeBuyer: boolean = false
): {
  label: string;
  amount: number;
}[] {
  const result = calculateStampDuty(
    purchasePrice,
    state,
    isFirstHomeBuyer,
    !isFirstHomeBuyer
  );

  const breakdown = [
    { label: "Stamp Duty", amount: result.stampDuty },
    { label: "Transfer Fee", amount: result.transferFee },
    { label: "Mortgage Registration", amount: result.mortgageRegistration },
  ];

  if (result.concessionApplied > 0) {
    breakdown.push({
      label: "FHB Concession (applied)",
      amount: -result.concessionApplied,
    });
  }

  return breakdown;
}

/**
 * Check if a property qualifies for first home buyer benefits
 */
export function checkFHBEligibility(
  purchasePrice: number,
  state: AustralianState
): {
  eligible: boolean;
  fullExemption: boolean;
  partialConcession: boolean;
  estimatedSavings: number;
} {
  const purchasePriceDollars = purchasePrice / 100;
  const thresholds = FHB_EXEMPTION_THRESHOLDS[state];

  const standardDuty = calculateStampDuty(purchasePrice, state, false, false);
  const fhbDuty = calculateStampDuty(purchasePrice, state, true, false);

  const savings = standardDuty.stampDuty - fhbDuty.stampDuty;

  return {
    eligible: purchasePriceDollars <= thresholds.partialExemption,
    fullExemption: purchasePriceDollars <= thresholds.fullExemption,
    partialConcession:
      purchasePriceDollars > thresholds.fullExemption &&
      purchasePriceDollars <= thresholds.partialExemption,
    estimatedSavings: savings,
  };
}

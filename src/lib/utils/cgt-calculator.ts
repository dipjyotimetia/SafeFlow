/**
 * Australian Capital Gains Tax (CGT) Calculator
 *
 * Calculates CGT on property sale with Australian-specific rules:
 * - 50% CGT discount for assets held 12+ months
 * - Depreciation recapture on Division 40 (plant & equipment) items
 * - Cost base adjustments for improvements and holding costs
 * - Main residence exemption considerations
 *
 * All amounts in cents (integers) to avoid floating-point issues.
 * Uses Decimal.js for precise financial calculations.
 *
 * Reference: ATO CGT guidance https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax
 */

import Decimal from "decimal.js";

// ============ Types ============

export interface CGTInputs {
  // Sale details
  salePrice: number; // cents
  saleDate: Date;

  // Purchase details
  purchasePrice: number; // cents
  purchaseDate: Date;
  stampDuty: number; // cents
  legalFeesOnPurchase: number; // cents
  otherPurchaseCosts: number; // cents (inspections, valuations, etc.)

  // Improvements (capital works that add to cost base)
  capitalImprovements: number; // cents - renovations, additions, etc.

  // Selling costs
  agentCommission: number; // cents - typically 2-2.5% of sale price
  advertisingCosts: number; // cents
  legalFeesOnSale: number; // cents
  otherSellingCosts: number; // cents

  // Depreciation claimed
  division40Depreciation: number; // cents - plant & equipment (MUST be added back)
  division43Depreciation: number; // cents - building capital works (affects cost base)

  // Tax info
  marginalTaxRate: number; // percentage (e.g., 32.5)
  otherCapitalGainsThisYear?: number; // cents - from other assets
  capitalLossesCarriedForward?: number; // cents - from previous years

  // Exemptions
  isMainResidence: boolean;
  mainResidenceExemptionPercent?: number; // 0-100% (for partial exemptions)
  wasUsedForIncome?: boolean; // affects partial exemption
  incomeProducingPercent?: number; // % of time used for income
}

export interface CGTResult {
  // Capital gain calculation
  costBase: number; // cents
  capitalProceeds: number; // cents (sale price less selling costs)
  grossCapitalGain: number; // cents (before any adjustments)

  // Adjustments
  deprecationRecapture: number; // cents - Division 40 added back
  adjustedCapitalGain: number; // cents - after depreciation recapture

  // Discount and exemptions
  holdingPeriodMonths: number;
  isEligibleForDiscount: boolean; // 12+ months
  discountPercent: number; // 0 or 50%
  mainResidenceExemption: number; // cents

  // Net capital gain
  netCapitalGainBeforeOffset: number; // cents
  capitalLossOffset: number; // cents - losses applied
  taxableCapitalGain: number; // cents - final taxable amount

  // Tax payable
  cgtPayable: number; // cents
  effectiveCGTRate: number; // percentage

  // Net proceeds
  netSaleProceeds: number; // cents - after all costs and CGT

  // Breakdown
  breakdown: CGTBreakdown;
}

export interface CGTBreakdown {
  // Cost base components
  purchasePrice: number;
  stampDuty: number;
  legalFeesPurchase: number;
  otherPurchaseCosts: number;
  capitalImprovements: number;
  legalFeesSale: number;
  agentCommission: number;
  advertisingCosts: number;
  otherSellingCosts: number;
  totalCostBase: number;

  // Adjustments
  div40Recapture: number;
  div43NotIncluded: number; // Info only - Div 43 doesn't affect cost base for CGT

  // Gain calculation
  grossGain: number;
  discountAmount: number;
  exemptionAmount: number;
  lossOffset: number;
  taxableGain: number;
  taxPayable: number;
}

// ============ Constants ============

/**
 * CGT discount for assets held 12+ months
 * 50% discount for individuals and trusts (not companies)
 */
export const CGT_DISCOUNT_RATE = 50; // percentage

/**
 * Minimum holding period for CGT discount (in months)
 */
export const CGT_DISCOUNT_HOLDING_MONTHS = 12;

/**
 * Default agent commission rate
 */
export const DEFAULT_AGENT_COMMISSION_RATE = 2.0; // percentage

// ============ Helper Functions ============

/**
 * Calculate months between two dates
 */
function monthsBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const dayDiff = end.getDate() - start.getDate();

  let months = yearDiff * 12 + monthDiff;

  // If the end day is before the start day, subtract a month
  if (dayDiff < 0) {
    months--;
  }

  return Math.max(0, months);
}

/**
 * Calculate agent commission from sale price
 */
export function calculateAgentCommission(
  salePrice: number,
  commissionRate: number = DEFAULT_AGENT_COMMISSION_RATE
): number {
  return new Decimal(salePrice)
    .times(commissionRate)
    .dividedBy(100)
    .round()
    .toNumber();
}

// ============ Main Calculation Function ============

/**
 * Calculate Capital Gains Tax for a property sale
 *
 * Australian CGT rules:
 * 1. Calculate cost base (purchase + improvements + costs)
 * 2. Calculate capital proceeds (sale price - selling costs)
 * 3. Add back Division 40 depreciation (recapture)
 * 4. Apply 50% discount if held 12+ months
 * 5. Apply main residence exemption if applicable
 * 6. Offset any capital losses
 * 7. Apply marginal tax rate
 *
 * @param inputs - CGT calculation inputs
 * @returns CGT result with detailed breakdown
 */
export function calculateCGT(inputs: CGTInputs): CGTResult {
  const {
    salePrice,
    saleDate,
    purchasePrice,
    purchaseDate,
    stampDuty,
    legalFeesOnPurchase,
    otherPurchaseCosts,
    capitalImprovements,
    agentCommission,
    advertisingCosts,
    legalFeesOnSale,
    otherSellingCosts,
    division40Depreciation,
    division43Depreciation,
    marginalTaxRate,
    otherCapitalGainsThisYear = 0,
    capitalLossesCarriedForward = 0,
    isMainResidence,
    mainResidenceExemptionPercent = 100,
    wasUsedForIncome = false,
    incomeProducingPercent = 0,
  } = inputs;

  // Calculate holding period
  const holdingPeriodMonths = monthsBetween(purchaseDate, saleDate);
  const isEligibleForDiscount = holdingPeriodMonths >= CGT_DISCOUNT_HOLDING_MONTHS;
  const discountPercent = isEligibleForDiscount ? CGT_DISCOUNT_RATE : 0;

  // Calculate cost base
  // Cost base includes: purchase price, stamp duty, legal fees, and improvements
  // Note: Division 43 (building) depreciation does NOT reduce cost base for CGT purposes
  // Only Division 40 (plant & equipment) depreciation must be "recaptured"
  const costBase = new Decimal(purchasePrice)
    .plus(stampDuty)
    .plus(legalFeesOnPurchase)
    .plus(otherPurchaseCosts)
    .plus(capitalImprovements);

  // Calculate capital proceeds (sale price less selling costs)
  const sellingCosts = new Decimal(agentCommission)
    .plus(advertisingCosts)
    .plus(legalFeesOnSale)
    .plus(otherSellingCosts);

  const capitalProceeds = new Decimal(salePrice).minus(sellingCosts);

  // Calculate gross capital gain (before depreciation recapture)
  const grossCapitalGain = capitalProceeds.minus(costBase);

  // Add back Division 40 depreciation (recapture)
  // This is because you got tax deductions for the depreciation, so it reduces your cost base
  const adjustedCapitalGain = grossCapitalGain.plus(division40Depreciation);

  // Determine if there's actually a gain
  let netCapitalGainBeforeOffset = new Decimal(0);
  let discountAmount = new Decimal(0);
  let mainResidenceExemption = new Decimal(0);

  if (adjustedCapitalGain.greaterThan(0)) {
    // Apply main residence exemption first
    if (isMainResidence) {
      let exemptionPercent = mainResidenceExemptionPercent;

      // If property was used to produce income, exemption may be partial
      if (wasUsedForIncome && incomeProducingPercent > 0) {
        // Partial exemption based on income-producing percentage
        exemptionPercent = 100 - incomeProducingPercent;
      }

      mainResidenceExemption = adjustedCapitalGain
        .times(exemptionPercent)
        .dividedBy(100)
        .round();
    }

    // Calculate gain after main residence exemption
    const gainAfterExemption = adjustedCapitalGain.minus(mainResidenceExemption);

    // Apply 50% CGT discount if eligible
    if (isEligibleForDiscount && gainAfterExemption.greaterThan(0)) {
      discountAmount = gainAfterExemption.times(discountPercent).dividedBy(100).round();
    }

    netCapitalGainBeforeOffset = gainAfterExemption.minus(discountAmount);
  }

  // Apply capital losses (carried forward and current year)
  const totalLossesAvailable = new Decimal(capitalLossesCarriedForward);
  let capitalLossOffset = new Decimal(0);

  if (netCapitalGainBeforeOffset.greaterThan(0)) {
    capitalLossOffset = Decimal.min(totalLossesAvailable, netCapitalGainBeforeOffset);
  }

  // Calculate taxable capital gain
  const taxableCapitalGain = Decimal.max(
    0,
    netCapitalGainBeforeOffset.minus(capitalLossOffset)
  );

  // Calculate CGT payable
  const cgtPayable = taxableCapitalGain.times(marginalTaxRate).dividedBy(100).round();

  // Calculate effective CGT rate (as % of gross gain)
  const effectiveCGTRate = grossCapitalGain.greaterThan(0)
    ? cgtPayable.dividedBy(grossCapitalGain).times(100).toDecimalPlaces(1).toNumber()
    : 0;

  // Calculate net sale proceeds
  const netSaleProceeds = new Decimal(salePrice)
    .minus(sellingCosts)
    .minus(cgtPayable);

  // Build breakdown
  const breakdown: CGTBreakdown = {
    purchasePrice,
    stampDuty,
    legalFeesPurchase: legalFeesOnPurchase,
    otherPurchaseCosts,
    capitalImprovements,
    legalFeesSale: legalFeesOnSale,
    agentCommission,
    advertisingCosts,
    otherSellingCosts,
    totalCostBase: costBase.round().toNumber(),
    div40Recapture: division40Depreciation,
    div43NotIncluded: division43Depreciation,
    grossGain: grossCapitalGain.round().toNumber(),
    discountAmount: discountAmount.round().toNumber(),
    exemptionAmount: mainResidenceExemption.round().toNumber(),
    lossOffset: capitalLossOffset.round().toNumber(),
    taxableGain: taxableCapitalGain.round().toNumber(),
    taxPayable: cgtPayable.round().toNumber(),
  };

  return {
    costBase: costBase.round().toNumber(),
    capitalProceeds: capitalProceeds.round().toNumber(),
    grossCapitalGain: grossCapitalGain.round().toNumber(),
    deprecationRecapture: division40Depreciation,
    adjustedCapitalGain: adjustedCapitalGain.round().toNumber(),
    holdingPeriodMonths,
    isEligibleForDiscount,
    discountPercent,
    mainResidenceExemption: mainResidenceExemption.round().toNumber(),
    netCapitalGainBeforeOffset: netCapitalGainBeforeOffset.round().toNumber(),
    capitalLossOffset: capitalLossOffset.round().toNumber(),
    taxableCapitalGain: taxableCapitalGain.round().toNumber(),
    cgtPayable: cgtPayable.round().toNumber(),
    effectiveCGTRate,
    netSaleProceeds: netSaleProceeds.round().toNumber(),
    breakdown,
  };
}

// ============ Helper Calculation Functions ============

/**
 * Calculate break-even sale price (where net proceeds = purchase costs)
 *
 * @param inputs - Partial CGT inputs (without sale price)
 * @returns Break-even sale price in cents
 */
export function calculateBreakEvenSalePrice(
  inputs: Omit<CGTInputs, "salePrice" | "agentCommission">
): number {
  const {
    purchasePrice,
    stampDuty,
    legalFeesOnPurchase,
    otherPurchaseCosts,
    legalFeesOnSale,
    advertisingCosts,
    otherSellingCosts,
  } = inputs;

  // Total investment = purchase price + all purchase costs
  const totalInvestment = new Decimal(purchasePrice)
    .plus(stampDuty)
    .plus(legalFeesOnPurchase)
    .plus(otherPurchaseCosts);

  // Selling costs (excluding commission which is % of sale)
  const fixedSellingCosts = new Decimal(legalFeesOnSale)
    .plus(advertisingCosts)
    .plus(otherSellingCosts);

  // Break-even: Sale - Commission - Fixed Costs = Total Investment
  // Sale - (Sale × CommissionRate) - Fixed = Investment
  // Sale × (1 - CommissionRate) = Investment + Fixed
  // Sale = (Investment + Fixed) / (1 - CommissionRate)
  const commissionRate = new Decimal(DEFAULT_AGENT_COMMISSION_RATE).dividedBy(100);
  const breakEvenSale = totalInvestment
    .plus(fixedSellingCosts)
    .dividedBy(new Decimal(1).minus(commissionRate));

  return breakEvenSale.round().toNumber();
}

/**
 * Calculate minimum hold period for CGT efficiency
 *
 * Returns the date when the property becomes eligible for 50% CGT discount
 */
export function getDiscountEligibilityDate(purchaseDate: Date): Date {
  const eligibilityDate = new Date(purchaseDate);
  eligibilityDate.setMonth(eligibilityDate.getMonth() + CGT_DISCOUNT_HOLDING_MONTHS);
  return eligibilityDate;
}

/**
 * Estimate CGT impact of selling at different price points
 */
export function estimateCGTScenarios(
  baseInputs: Omit<CGTInputs, "salePrice" | "agentCommission">,
  salePrices: number[]
): Array<{ salePrice: number; result: CGTResult }> {
  return salePrices.map((salePrice) => {
    const agentCommission = calculateAgentCommission(salePrice);
    const result = calculateCGT({
      ...baseInputs,
      salePrice,
      agentCommission,
    });
    return { salePrice, result };
  });
}

/**
 * Calculate the tax-optimized sale price for a target net proceeds
 *
 * Given a desired net proceeds amount, what sale price is needed?
 */
export function calculateRequiredSalePriceForTarget(
  baseInputs: Omit<CGTInputs, "salePrice" | "agentCommission">,
  targetNetProceeds: number
): number {
  // Start with an initial guess (target + 30% for costs and tax)
  let guess = new Decimal(targetNetProceeds).times(1.3).round().toNumber();
  const tolerance = 10000; // $100 tolerance in cents
  const maxIterations = 50;

  for (let i = 0; i < maxIterations; i++) {
    const agentCommission = calculateAgentCommission(guess);
    const result = calculateCGT({
      ...baseInputs,
      salePrice: guess,
      agentCommission,
    });

    const diff = result.netSaleProceeds - targetNetProceeds;

    if (Math.abs(diff) < tolerance) {
      return guess;
    }

    // Adjust guess based on difference
    // If net proceeds too low, increase sale price
    // If net proceeds too high, decrease sale price
    guess = new Decimal(guess).minus(diff).round().toNumber();
  }

  return guess;
}

/**
 * Summary of CGT impact for display
 */
export interface CGTSummary {
  holdingPeriod: string; // e.g., "2 years, 3 months"
  hasDiscount: boolean;
  effectiveRate: string; // e.g., "16.25%"
  taxPayable: number;
  netProceeds: number;
  returnOnInvestment: number; // percentage
}

export function getCGTSummary(result: CGTResult, totalInvestment: number): CGTSummary {
  const years = Math.floor(result.holdingPeriodMonths / 12);
  const months = result.holdingPeriodMonths % 12;

  let holdingPeriod = "";
  if (years > 0) {
    holdingPeriod += `${years} year${years > 1 ? "s" : ""}`;
  }
  if (months > 0) {
    if (years > 0) holdingPeriod += ", ";
    holdingPeriod += `${months} month${months > 1 ? "s" : ""}`;
  }
  if (!holdingPeriod) holdingPeriod = "Less than 1 month";

  const returnOnInvestment =
    totalInvestment > 0
      ? ((result.netSaleProceeds - totalInvestment) / totalInvestment) * 100
      : 0;

  return {
    holdingPeriod,
    hasDiscount: result.isEligibleForDiscount,
    effectiveRate: `${result.effectiveCGTRate}%`,
    taxPayable: result.cgtPayable,
    netProceeds: result.netSaleProceeds,
    returnOnInvestment: Math.round(returnOnInvestment * 10) / 10,
  };
}

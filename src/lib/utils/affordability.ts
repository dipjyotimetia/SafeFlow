/**
 * Affordability Calculator
 *
 * APRA-style serviceability assessment for property borrowing.
 * Implements bank-style lending criteria with stress testing.
 *
 * Key features:
 * - Debt Service Ratio (DSR) and Loan Service Ratio (LSR) calculations
 * - HECS/HELP automatic repayment calculation
 * - Household Expenditure Measure (HEM) lookup
 * - Stress testing at +1%, +2%, +3% rate rises
 * - Risk metrics for investment properties
 *
 * All amounts in cents (integers) to avoid floating-point issues.
 * Uses Decimal.js for precise financial calculations.
 */

import Decimal from "decimal.js";
import type {
  AffordabilityInputs,
  AffordabilityResults,
  AffordabilityStatus,
  ExistingDebt,
  HEMBracket,
  StressTestScenario,
  RiskMetrics,
} from "@/types";
import {
  calculatePrincipalInterestRepayment,
  calculateInterestOnlyRepayment,
} from "./loan-calculator";

// ============ Constants ============

/**
 * APRA serviceability buffer (confirmed unchanged as of July 2025)
 * https://www.apra.gov.au
 *
 * APRA requires lenders to assess borrowers at a rate 3% above the product rate.
 * This buffer has been in place since November 2021.
 */
export const APRA_BUFFER_DEFAULT = 3.0; // 3% buffer

/** Debt Service Ratio thresholds */
export const DSR_GREEN_MAX = 35; // Below 35% is comfortable
export const DSR_AMBER_MAX = 50; // 35-50% is stretched
// Above 50% is red (high risk)

/** Loan Service Ratio thresholds (housing-specific) */
export const LSR_GREEN_MAX = 28; // Below 28% is ideal
export const LSR_AMBER_MAX = 35; // 28-35% is acceptable
// Above 35% is stretched

/**
 * Debt-to-Income (DTI) Ratio thresholds
 *
 * From 1 February 2026, APRA requires banks to limit loans with DTI > 6x
 * to no more than 20% of new mortgage lending.
 * https://www.apra.gov.au
 */
export const DTI_GREEN_MAX = 5.0; // Below 5x is comfortable
export const DTI_AMBER_MAX = 6.0; // 5-6x is elevated risk
// Above 6x triggers APRA lending restrictions (from Feb 2026)
export const DTI_APRA_LIMIT = 6.0; // APRA's limit for restricted lending

/**
 * Credit card liability assumption for serviceability.
 * Banks assume 3% of credit limit as monthly repayment.
 */
export const CREDIT_CARD_MONTHLY_FACTOR = 0.03;

/**
 * HECS/HELP repayment thresholds (2025-26)
 * https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds
 *
 * IMPORTANT: From 2025-26, HECS uses a MARGINAL rate system (like tax brackets).
 * Repayments are calculated on income ABOVE the threshold, not on total income.
 *
 * Thresholds:
 * - $0 – $67,000: Nil
 * - $67,001 – $125,000: 15c for each $1 over $67,000
 * - $125,001 – $179,285: $8,700 plus 17c for each $1 over $125,000
 * - $179,286+: 10% of total repayment income
 */
export const HECS_MINIMUM_THRESHOLD = 67000;
export const HECS_TIER2_THRESHOLD = 125000;
export const HECS_TIER3_THRESHOLD = 179285;
export const HECS_TIER1_RATE = 0.15; // 15c per $1
export const HECS_TIER2_RATE = 0.17; // 17c per $1
export const HECS_TOP_RATE = 0.10; // 10% of total income

/**
 * Household Expenditure Measure (HEM) - 2025 estimates
 * Based on Melbourne Institute HEM data (proprietary, updated periodically)
 * Values are monthly expenses in dollars
 *
 * Note: Actual HEM values are proprietary and vary by lender.
 * These are conservative estimates scaled by income bracket.
 * Lenders use the higher of declared expenses or HEM.
 */
export const HEM_BRACKETS: HEMBracket[] = [
  {
    incomeMin: 0,
    incomeMax: 40000,
    single: 1650,
    couple: 2400,
    perDependent: 450,
  },
  {
    incomeMin: 40000,
    incomeMax: 60000,
    single: 1850,
    couple: 2700,
    perDependent: 500,
  },
  {
    incomeMin: 60000,
    incomeMax: 80000,
    single: 2100,
    couple: 3000,
    perDependent: 550,
  },
  {
    incomeMin: 80000,
    incomeMax: 100000,
    single: 2400,
    couple: 3400,
    perDependent: 600,
  },
  {
    incomeMin: 100000,
    incomeMax: 130000,
    single: 2750,
    couple: 3900,
    perDependent: 650,
  },
  {
    incomeMin: 130000,
    incomeMax: 170000,
    single: 3200,
    couple: 4500,
    perDependent: 700,
  },
  {
    incomeMin: 170000,
    incomeMax: 220000,
    single: 3700,
    couple: 5200,
    perDependent: 750,
  },
  {
    incomeMin: 220000,
    incomeMax: Infinity,
    single: 4300,
    couple: 6000,
    perDependent: 800,
  },
];

// ============ Helper Functions ============

/**
 * Calculate HECS/HELP monthly repayment based on income (2025-26 marginal system)
 *
 * From 2025-26, HECS uses a MARGINAL rate system:
 * - $0 – $67,000: Nil
 * - $67,001 – $125,000: 15c for each $1 over $67,000
 * - $125,001 – $179,285: $8,700 plus 17c for each $1 over $125,000
 * - $179,286+: 10% of total repayment income
 *
 * @param grossAnnualIncome - Gross annual income in cents
 * @returns Monthly HECS repayment in cents
 */
export function calculateHecsRepayment(grossAnnualIncome: number): number {
  const incomeDollars = new Decimal(grossAnnualIncome).dividedBy(100);

  let annualRepayment: Decimal;

  if (incomeDollars.lte(HECS_MINIMUM_THRESHOLD)) {
    // Below threshold - no repayment
    annualRepayment = new Decimal(0);
  } else if (incomeDollars.lte(HECS_TIER2_THRESHOLD)) {
    // $67,001 – $125,000: 15c for each $1 over $67,000
    annualRepayment = incomeDollars
      .minus(HECS_MINIMUM_THRESHOLD)
      .times(HECS_TIER1_RATE);
  } else if (incomeDollars.lte(HECS_TIER3_THRESHOLD)) {
    // $125,001 – $179,285: $8,700 plus 17c for each $1 over $125,000
    const tier1Amount = new Decimal(HECS_TIER2_THRESHOLD - HECS_MINIMUM_THRESHOLD)
      .times(HECS_TIER1_RATE); // $8,700
    annualRepayment = tier1Amount.plus(
      incomeDollars.minus(HECS_TIER2_THRESHOLD).times(HECS_TIER2_RATE)
    );
  } else {
    // $179,286+: 10% of total repayment income
    annualRepayment = incomeDollars.times(HECS_TOP_RATE);
  }

  // Return monthly in cents (rounded to nearest cent)
  return annualRepayment.dividedBy(12).times(100).round().toNumber();
}

/**
 * Get HEM (Household Expenditure Measure) based on household profile
 *
 * @param grossAnnualIncome - Combined household gross annual income in cents
 * @param hasPartner - Whether there is a partner/second applicant
 * @param dependents - Number of dependent children
 * @returns Monthly HEM in cents
 */
export function getHEM(
  grossAnnualIncome: number,
  hasPartner: boolean,
  dependents: number
): number {
  const incomeDollars = grossAnnualIncome / 100;

  // Find applicable bracket
  const bracket =
    HEM_BRACKETS.find(
      (b) => incomeDollars >= b.incomeMin && incomeDollars < b.incomeMax
    ) || HEM_BRACKETS[HEM_BRACKETS.length - 1];

  // Calculate base HEM
  const baseHem = hasPartner ? bracket.couple : bracket.single;
  const dependentCost = dependents * bracket.perDependent;

  // Return monthly HEM in cents
  return Math.round((baseHem + dependentCost) * 100);
}

/**
 * Calculate total existing debt balances for DTI calculation
 *
 * @param debts - Array of existing debts
 * @returns Total debt balance in cents
 */
export function calculateExistingDebtBalance(debts: ExistingDebt[]): number {
  return debts.reduce((total, debt) => {
    // For credit cards, use the credit limit (conservative) or current balance
    // For other debts, use current balance
    if (debt.type === "credit-card") {
      return total + (debt.creditLimit || debt.currentBalance);
    }
    return total + debt.currentBalance;
  }, 0);
}

/**
 * Calculate DTI status based on ratio
 */
export function getDTIStatus(dti: number): AffordabilityStatus {
  if (dti <= DTI_GREEN_MAX) return "green";
  if (dti <= DTI_AMBER_MAX) return "amber";
  return "red";
}

/**
 * Get DTI warning message if applicable
 */
export function getDTIWarning(dti: number): string | undefined {
  if (dti > DTI_APRA_LIMIT) {
    return `DTI ratio of ${dti.toFixed(1)}x exceeds APRA's 6x threshold. From February 2026, banks must limit high-DTI lending. Loan approval may be more difficult.`;
  }
  if (dti > DTI_GREEN_MAX) {
    return `DTI ratio of ${dti.toFixed(1)}x is elevated. Consider increasing deposit or reducing debt to improve approval chances.`;
  }
  return undefined;
}

/**
 * Calculate monthly debt commitments from existing debts
 *
 * @param debts - Array of existing debts
 * @param grossAnnualIncome - Gross annual income in cents (for HECS calculation)
 * @returns Total monthly debt payments in cents
 */
export function calculateMonthlyDebtPayments(
  debts: ExistingDebt[],
  grossAnnualIncome: number
): number {
  let totalMonthly = 0;

  for (const debt of debts) {
    switch (debt.type) {
      case "credit-card":
        // Banks use 3% of credit limit as assumed monthly repayment
        const limit = debt.creditLimit || debt.currentBalance;
        totalMonthly += Math.round(limit * CREDIT_CARD_MONTHLY_FACTOR);
        break;

      case "hecs-help":
        // Calculate HECS repayment based on income
        totalMonthly += calculateHecsRepayment(grossAnnualIncome);
        break;

      case "personal-loan":
      case "car-loan":
      case "other-mortgage":
      case "other":
        // Use declared monthly repayment
        totalMonthly += debt.monthlyRepayment || 0;
        break;
    }
  }

  return totalMonthly;
}

/**
 * Medicare levy low-income threshold (2024-25)
 * Below this threshold, reduced or no Medicare levy applies.
 * https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy
 *
 * Note: There's a gradual phase-in between $26,000-$32,279 (singles) where
 * a reduced rate applies. This implementation uses a simplified binary approach
 * for estimation purposes. Full levy applies above the threshold.
 */
export const MEDICARE_LEVY_THRESHOLD = 27222;
export const MEDICARE_LEVY_RATE = 0.02; // 2%

/**
 * 2025-26 Australian Tax Brackets (Stage 3 cuts)
 * Cumulative tax at each threshold boundary for precise calculation
 *
 * @internal Used by estimateNetIncome for reference, with inline calculations for clarity
 */
const _TAX_BRACKETS = [
  { threshold: 18200, rate: 0, cumulative: 0 },
  { threshold: 45000, rate: 0.16, cumulative: 0 }, // (45000-18200)*0.16 = 4288
  { threshold: 135000, rate: 0.30, cumulative: 4288 }, // 4288 + (135000-45000)*0.30 = 31288
  { threshold: 190000, rate: 0.37, cumulative: 31288 }, // 31288 + (190000-135000)*0.37 = 51638
  { threshold: Infinity, rate: 0.45, cumulative: 51638 },
];
void _TAX_BRACKETS; // Silence unused warning - kept for documentation

/**
 * Estimate net income after tax (2025-26 tax rates)
 *
 * Tax brackets (Australian residents):
 * - $0 – $18,200: 0%
 * - $18,201 – $45,000: 16%
 * - $45,001 – $135,000: 30%
 * - $135,001 – $190,000: 37%
 * - $190,001+: 45%
 *
 * Plus Medicare levy of 2% above threshold.
 *
 * @param grossAnnual - Gross annual income in cents
 * @returns Estimated annual net income in cents
 */
export function estimateNetIncome(grossAnnual: number): number {
  const dollars = new Decimal(grossAnnual).dividedBy(100);
  let tax = new Decimal(0);

  // Calculate income tax using brackets
  if (dollars.lte(18200)) {
    tax = new Decimal(0);
  } else if (dollars.lte(45000)) {
    tax = dollars.minus(18200).times(0.16);
  } else if (dollars.lte(135000)) {
    tax = new Decimal(4288).plus(dollars.minus(45000).times(0.30));
  } else if (dollars.lte(190000)) {
    tax = new Decimal(31288).plus(dollars.minus(135000).times(0.37));
  } else {
    tax = new Decimal(51638).plus(dollars.minus(190000).times(0.45));
  }

  // Add Medicare levy (2%) above low-income threshold
  if (dollars.gt(MEDICARE_LEVY_THRESHOLD)) {
    tax = tax.plus(dollars.times(MEDICARE_LEVY_RATE));
  }

  // Return net income in cents (rounded to nearest cent)
  return dollars.minus(tax).times(100).round().toNumber();
}

/**
 * Determine traffic light status for ratios
 */
export function getRatioStatus(
  ratio: number,
  greenMax: number,
  amberMax: number
): AffordabilityStatus {
  if (ratio <= greenMax) return "green";
  if (ratio <= amberMax) return "amber";
  return "red";
}

// ============ Main Calculation Functions ============

/**
 * Calculate maximum borrowing capacity
 *
 * Works backwards from available income to determine max loan.
 * Uses binary search for efficiency.
 *
 * @param inputs - Affordability calculator inputs
 * @returns Maximum borrowing amount in cents
 */
export function calculateMaxBorrowing(inputs: AffordabilityInputs): number {
  const {
    borrower,
    existingDebts,
    interestRate,
    apraBuffer,
    loanTermYears,
    isInterestOnly,
  } = inputs;

  // Calculate total household income
  const totalGrossAnnual =
    borrower.grossAnnualIncome + (borrower.partnerGrossIncome || 0);

  // Estimate net income
  const netAnnual = estimateNetIncome(totalGrossAnnual);
  const monthlyNet = Math.round(netAnnual / 12);

  // Calculate living expenses
  let monthlyLiving: number;
  if (
    borrower.livingExpensesType === "declared" &&
    borrower.declaredLivingExpenses
  ) {
    monthlyLiving = Math.round(borrower.declaredLivingExpenses / 12);
  } else {
    monthlyLiving = getHEM(
      totalGrossAnnual,
      !!borrower.partnerGrossIncome,
      borrower.numberOfDependents
    );
  }

  // Calculate existing debt payments
  const monthlyDebts = calculateMonthlyDebtPayments(
    existingDebts,
    totalGrossAnnual
  );

  // Available for housing
  const available = monthlyNet - monthlyLiving - monthlyDebts;

  if (available <= 0) {
    return 0; // Cannot service any loan
  }

  // Calculate max loan using assessment rate
  const assessmentRate = interestRate + apraBuffer;
  const termMonths = loanTermYears * 12;

  // Binary search for max loan amount
  let low = 0;
  let high = available * 12 * loanTermYears * 100; // Rough upper bound in cents

  while (high - low > 10000) {
    // Within $100 precision
    const mid = Math.round((low + high) / 2);

    let monthlyRepayment: number;
    if (isInterestOnly) {
      monthlyRepayment = calculateInterestOnlyRepayment(
        mid,
        assessmentRate,
        "monthly"
      );
    } else {
      monthlyRepayment = calculatePrincipalInterestRepayment(
        mid,
        assessmentRate,
        termMonths,
        "monthly"
      );
    }

    if (monthlyRepayment <= available) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}

/**
 * Calculate full affordability assessment
 *
 * @param inputs - Affordability calculator inputs
 * @returns Comprehensive affordability results
 */
export function calculateAffordability(
  inputs: AffordabilityInputs
): AffordabilityResults {
  const {
    borrower,
    existingDebts,
    purchasePrice,
    depositAmount,
    depositPercent,
    interestRate,
    apraBuffer,
    loanTermYears,
    isInterestOnly,
    expectedWeeklyRent,
  } = inputs;

  // Calculate household income
  const totalGrossAnnual =
    borrower.grossAnnualIncome + (borrower.partnerGrossIncome || 0);
  const monthlyGross = Math.round(totalGrossAnnual / 12);

  // Estimate net income
  const netAnnual = estimateNetIncome(totalGrossAnnual);
  const monthlyNet = Math.round(netAnnual / 12);

  // Calculate living expenses
  let monthlyLiving: number;
  if (
    borrower.livingExpensesType === "declared" &&
    borrower.declaredLivingExpenses
  ) {
    monthlyLiving = Math.round(borrower.declaredLivingExpenses / 12);
  } else {
    monthlyLiving = getHEM(
      totalGrossAnnual,
      !!borrower.partnerGrossIncome,
      borrower.numberOfDependents
    );
  }

  // Calculate existing debt payments
  const monthlyDebts = calculateMonthlyDebtPayments(
    existingDebts,
    totalGrossAnnual
  );

  // Calculate max borrowing
  const maxBorrowing = calculateMaxBorrowing(inputs);
  const assessmentRate = interestRate + apraBuffer;

  // Calculate proposed loan amount
  let proposedLoan = maxBorrowing;
  if (purchasePrice) {
    const deposit =
      depositAmount || Math.round((purchasePrice * (depositPercent || 20)) / 100);
    proposedLoan = Math.min(purchasePrice - deposit, maxBorrowing);
  }

  // Calculate proposed repayment at assessment rate
  const termMonths = loanTermYears * 12;
  let proposedRepayment: number;
  if (isInterestOnly) {
    proposedRepayment = calculateInterestOnlyRepayment(
      proposedLoan,
      assessmentRate,
      "monthly"
    );
  } else {
    proposedRepayment = calculatePrincipalInterestRepayment(
      proposedLoan,
      assessmentRate,
      termMonths,
      "monthly"
    );
  }

  // Available for housing
  const available = monthlyNet - monthlyLiving - monthlyDebts;
  const surplus = available - proposedRepayment;

  // Calculate serviceability ratios
  const totalDebtPayments = monthlyDebts + proposedRepayment;
  const debtServiceRatio = (totalDebtPayments / monthlyGross) * 100;
  const loanServiceRatio = (proposedRepayment / monthlyGross) * 100;

  // Determine DSR/LSR status
  const dsrStatus = getRatioStatus(
    debtServiceRatio,
    DSR_GREEN_MAX,
    DSR_AMBER_MAX
  );
  const lsrStatus = getRatioStatus(
    loanServiceRatio,
    LSR_GREEN_MAX,
    LSR_AMBER_MAX
  );

  // Calculate Debt-to-Income (DTI) ratio
  // DTI = (Proposed Loan + Existing Debt Balances) / Gross Annual Income
  const existingDebtBalance = calculateExistingDebtBalance(existingDebts);
  const totalProposedDebt = proposedLoan + existingDebtBalance;
  const debtToIncomeRatio = totalGrossAnnual > 0
    ? new Decimal(totalProposedDebt).dividedBy(totalGrossAnnual).toDecimalPlaces(1).toNumber()
    : 0;
  const dtiStatus = getDTIStatus(debtToIncomeRatio);
  const dtiWarning = getDTIWarning(debtToIncomeRatio);

  // Calculate rental coverage ratio for investment properties
  let rentalCoverageRatio: number | undefined;
  if (expectedWeeklyRent) {
    const annualRent = new Decimal(expectedWeeklyRent).times(52);
    const annualInterest = new Decimal(proposedLoan)
      .times(assessmentRate)
      .dividedBy(100)
      .round();
    if (annualInterest.gt(0)) {
      rentalCoverageRatio = annualRent
        .dividedBy(annualInterest)
        .toDecimalPlaces(2)
        .toNumber();
    }
  }

  // Overall status (worst of all ratios, or red if negative surplus)
  let overallStatus: AffordabilityStatus = "green";
  if (dsrStatus === "red" || lsrStatus === "red" || dtiStatus === "red" || surplus < 0) {
    overallStatus = "red";
  } else if (dsrStatus === "amber" || lsrStatus === "amber" || dtiStatus === "amber") {
    overallStatus = "amber";
  }

  // Status description - include DTI concerns
  let statusDescription: string;
  if (overallStatus === "green") {
    statusDescription =
      "Strong affordability position. Loan is well within serviceability limits.";
  } else if (overallStatus === "amber") {
    if (dtiStatus === "amber") {
      statusDescription =
        "Moderate affordability. DTI ratio is elevated - consider a larger deposit or paying down existing debt.";
    } else {
      statusDescription =
        "Moderate affordability. Consider reducing loan amount or clearing existing debts.";
    }
  } else {
    if (dtiStatus === "red") {
      statusDescription =
        "DTI exceeds APRA's 6x threshold. From Feb 2026, high-DTI loans face lending restrictions. Reduce loan or increase income.";
    } else {
      statusDescription =
        "Loan may not be serviceable. Reduce loan amount, clear debts, or increase income.";
    }
  }

  return {
    maxBorrowingAmount: maxBorrowing,
    assessmentRate,
    debtServiceRatio: Math.round(debtServiceRatio * 10) / 10,
    loanServiceRatio: Math.round(loanServiceRatio * 10) / 10,
    dsrStatus,
    lsrStatus,
    debtToIncomeRatio,
    dtiStatus,
    dtiWarning,
    monthlyGrossIncome: monthlyGross,
    monthlyNetIncome: monthlyNet,
    monthlyLivingExpenses: monthlyLiving,
    monthlyExistingDebtPayments: monthlyDebts,
    availableForHousing: available,
    proposedRepayment,
    surplus,
    totalProposedDebt,
    rentalCoverageRatio,
    overallStatus,
    statusDescription,
  };
}

/**
 * Generate stress test scenarios
 *
 * Tests impact of +1%, +2%, +3% interest rate rises.
 *
 * @param loanAmount - Loan amount in cents
 * @param baseRate - Base interest rate (percentage)
 * @param loanTermYears - Loan term in years
 * @param availableForHousing - Available monthly amount for housing in cents
 * @param isInterestOnly - Whether loan is interest-only
 * @returns Array of stress test scenarios
 */
export function generateStressTests(
  loanAmount: number,
  baseRate: number,
  loanTermYears: number,
  availableForHousing: number,
  isInterestOnly: boolean
): StressTestScenario[] {
  const scenarios: StressTestScenario[] = [];
  const termMonths = loanTermYears * 12;

  // Test +1%, +2%, +3% rate rises
  for (const increase of [1, 2, 3]) {
    const newRate = baseRate + increase;

    let newRepayment: number;
    if (isInterestOnly) {
      newRepayment = calculateInterestOnlyRepayment(
        loanAmount,
        newRate,
        "monthly"
      );
    } else {
      newRepayment = calculatePrincipalInterestRepayment(
        loanAmount,
        newRate,
        termMonths,
        "monthly"
      );
    }

    const cashflow = availableForHousing - newRepayment;

    let status: AffordabilityStatus;
    if (cashflow >= 0) {
      status = "green";
    } else if (cashflow >= -50000) {
      // Within $500/month negative
      status = "amber";
    } else {
      status = "red";
    }

    scenarios.push({
      rateIncrease: increase,
      newRate,
      newRepayment,
      monthlyCashflow: cashflow,
      status,
    });
  }

  return scenarios;
}

/**
 * Calculate risk metrics for investment property
 *
 * @param loanAmount - Loan amount in cents
 * @param interestRate - Interest rate (percentage)
 * @param weeklyRent - Expected weekly rent in cents
 * @param monthlyExpenses - Monthly property expenses in cents
 * @param availableForHousing - Available monthly amount for housing in cents
 * @param isInterestOnly - Whether loan is interest-only
 * @param loanTermYears - Loan term in years
 * @returns Risk metrics
 */
export function calculateRiskMetrics(
  loanAmount: number,
  interestRate: number,
  weeklyRent: number,
  monthlyExpenses: number,
  availableForHousing: number,
  _isInterestOnly: boolean,
  _loanTermYears: number
): RiskMetrics {
  const loan = new Decimal(loanAmount);
  const rate = new Decimal(interestRate);
  const annualRent = new Decimal(weeklyRent).times(52);
  const annualExpenses = new Decimal(monthlyExpenses).times(12);
  const annualInterest = loan.times(rate).dividedBy(100).round();

  // Max vacancy before negative cashflow
  // Find vacancy % where rent * (1 - v%) = expenses + interest
  let maxVacancy = new Decimal(0);
  if (annualRent.gt(0)) {
    const breakEvenRent = annualExpenses.plus(annualInterest);
    if (breakEvenRent.lt(annualRent)) {
      maxVacancy = annualRent
        .minus(breakEvenRent)
        .dividedBy(annualRent)
        .times(100);
    }
  }

  // Sensitivity: cashflow change per 1% rate increase
  // 1% of loan amount annually, divided by 12 for monthly impact
  const onePercentInterestAnnual = loan.dividedBy(100).round();
  const sensitivityPerPercent = onePercentInterestAnnual.dividedBy(12).round().toNumber();

  // Buffer months: how many months can surplus cover?
  const monthlyInterest = annualInterest.dividedBy(12).round();
  const totalMonthlyExpenses = new Decimal(monthlyExpenses).plus(monthlyInterest);
  const bufferMonths =
    availableForHousing > 0 && totalMonthlyExpenses.gt(0)
      ? Math.floor(new Decimal(availableForHousing).dividedBy(totalMonthlyExpenses).toNumber())
      : 0;

  // Break-even rate: at what rate does property cashflow = 0?
  // For interest-only: rate where interest = rent - expenses
  // Interest = loanAmount * rate / 100, so rate = (interest / loanAmount) * 100
  const netRental = annualRent.minus(annualExpenses);
  const breakEvenRate = loan.gt(0)
    ? netRental.dividedBy(loan).times(100).toDecimalPlaces(2).toNumber()
    : 0;

  return {
    maxVacancyBeforeNegative: maxVacancy.toDecimalPlaces(1).toNumber(),
    sensitivityPerPercent,
    bufferMonths,
    breakEvenRate,
  };
}

/**
 * Create default affordability inputs
 */
export function createDefaultAffordabilityInputs(): AffordabilityInputs {
  return {
    borrower: {
      grossAnnualIncome: 10000000, // $100,000
      numberOfDependents: 0,
      livingExpensesType: "hem",
    },
    existingDebts: [],
    interestRate: 6.5,
    apraBuffer: APRA_BUFFER_DEFAULT,
    loanTermYears: 30,
    isInterestOnly: false,
  };
}

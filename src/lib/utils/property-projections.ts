/**
 * Property Investment Projection Engine
 *
 * Multi-year projections for property investments including:
 * - Capital growth projections (5/10/20 year)
 * - Rent growth with inflation adjustment
 * - Equity accumulation curves
 * - What-if scenarios (high/medium/low growth)
 * - Loan paydown tracking
 *
 * All amounts in cents (integers) to avoid floating-point issues.
 * Uses Decimal.js for precise financial calculations.
 */

import Decimal from "decimal.js";

// ============ Types ============

export interface ProjectionInputs {
  // Property value
  currentValue: number; // cents
  purchasePrice: number; // cents
  purchaseDate: Date;

  // Loan details
  loanBalance: number; // cents - current loan balance
  interestRate: number; // percentage (e.g., 6.5)
  loanTermYearsRemaining: number; // remaining years on loan
  isInterestOnly: boolean;
  interestOnlyYearsRemaining?: number; // if IO, how many years left

  // Rental income
  weeklyRent: number; // cents
  vacancyPercent?: number; // default 2%

  // Annual expenses
  annualExpenses: number; // cents - operating costs (excl. interest)

  // Offset account
  offsetBalance?: number; // cents

  // Growth assumptions
  capitalGrowthScenario?: GrowthScenario;
  rentGrowthScenario?: GrowthScenario;
  customCapitalGrowthRate?: number; // percentage override
  customRentGrowthRate?: number; // percentage override

  // Tax
  marginalTaxRate?: number; // percentage
  annualDepreciation?: number; // cents - Year 1 estimate (reduces over time)
}

export type GrowthScenario = "conservative" | "moderate" | "optimistic" | "custom";

export interface YearlyProjection {
  year: number; // 1, 2, 3, etc.
  date: Date; // Projected date

  // Property value
  propertyValue: number; // cents
  valueGrowthPercent: number; // YoY growth as percentage
  cumulativeGrowthPercent: number; // Total growth since purchase

  // Loan
  loanBalance: number; // cents
  principalPaid: number; // cents - paid this year
  interestPaid: number; // cents - paid this year
  effectiveBalance: number; // cents - loan minus offset

  // Equity
  equity: number; // cents - value minus loan
  equityRatio: number; // percentage
  lvr: number; // percentage - loan to value ratio

  // Income
  weeklyRent: number; // cents
  annualGrossRent: number; // cents
  annualNetRent: number; // cents - after vacancy

  // Cashflow
  annualExpenses: number; // cents
  annualInterestCost: number; // cents
  annualCashflowBeforeTax: number; // cents
  annualCashflowAfterTax: number; // cents - including tax benefit/liability

  // Tax impact
  taxableIncome: number; // cents - can be negative (loss)
  taxBenefitOrLiability: number; // cents - positive = benefit, negative = liability
  depreciation: number; // cents - claimed this year
}

export interface ProjectionSummary {
  inputs: ProjectionInputs;
  projections: YearlyProjection[];
  scenario: GrowthScenario;

  // Summary metrics at key milestones
  year5: ProjectionMilestone;
  year10: ProjectionMilestone;
  year20: ProjectionMilestone;

  // Overall stats
  totalEquityBuilt: number; // cents
  totalPrincipalPaid: number; // cents
  totalInterestPaid: number; // cents
  totalCashflowBeforeTax: number; // cents
  totalCashflowAfterTax: number; // cents
  totalTaxBenefit: number; // cents
  averageAnnualReturn: number; // percentage (including equity and cashflow)
}

export interface ProjectionMilestone {
  year: number;
  propertyValue: number; // cents
  equity: number; // cents
  loanBalance: number; // cents
  equityRatio: number; // percentage
  cumulativeGrowth: number; // percentage
  totalCashflow: number; // cents - cumulative
}

// ============ Growth Rate Constants ============

/**
 * Historical Australian property growth rates (residential)
 * Source: CoreLogic, ABS, RBA data
 *
 * Conservative: Below long-term average (pessimistic scenario)
 * Moderate: Close to long-term average (~6-7% nationally)
 * Optimistic: Above average (strong market conditions)
 */
export const CAPITAL_GROWTH_RATES: Record<GrowthScenario, number> = {
  conservative: 3.5,
  moderate: 5.5,
  optimistic: 8.0,
  custom: 0, // Use customCapitalGrowthRate
};

/**
 * Rental growth rates
 * Generally tracks inflation with some variance
 */
export const RENT_GROWTH_RATES: Record<GrowthScenario, number> = {
  conservative: 2.0,
  moderate: 3.5,
  optimistic: 5.0,
  custom: 0, // Use customRentGrowthRate
};

/**
 * Expense growth rate (typically tracks inflation)
 */
export const EXPENSE_GROWTH_RATE = 2.5; // percentage

/**
 * Depreciation reduction rate per year
 * Building depreciation declines over time
 */
export const DEPRECIATION_DECLINE_RATE = 5.0; // percentage reduction per year

// ============ Calculation Functions ============

/**
 * Calculate annual principal + interest repayment
 */
function calculateAnnualPIRepayment(
  loanBalance: number,
  interestRate: number,
  yearsRemaining: number
): { principal: number; interest: number; total: number } {
  if (yearsRemaining <= 0 || loanBalance <= 0) {
    return { principal: 0, interest: 0, total: 0 };
  }

  const balance = new Decimal(loanBalance);
  const monthlyRate = new Decimal(interestRate).dividedBy(100).dividedBy(12);
  const totalPayments = yearsRemaining * 12;

  // P+I formula: M = P × [r(1+r)^n] / [(1+r)^n - 1]
  const onePlusR = monthlyRate.plus(1);
  const onePlusRPowerN = onePlusR.pow(totalPayments);
  const numerator = monthlyRate.times(onePlusRPowerN);
  const denominator = onePlusRPowerN.minus(1);

  if (denominator.isZero()) {
    return { principal: 0, interest: 0, total: 0 };
  }

  const monthlyPayment = balance.times(numerator.dividedBy(denominator));
  const annualPayment = monthlyPayment.times(12);

  // First year interest (simplified - uses average balance approach)
  const annualInterest = balance.times(interestRate).dividedBy(100);
  const annualPrincipal = annualPayment.minus(annualInterest);

  return {
    principal: Math.max(0, annualPrincipal.round().toNumber()),
    interest: annualInterest.round().toNumber(),
    total: annualPayment.round().toNumber(),
  };
}

/**
 * Calculate annual interest-only payment
 */
function calculateAnnualIOPayment(
  loanBalance: number,
  interestRate: number
): { principal: number; interest: number; total: number } {
  const interest = new Decimal(loanBalance)
    .times(interestRate)
    .dividedBy(100)
    .round()
    .toNumber();

  return {
    principal: 0,
    interest,
    total: interest,
  };
}

/**
 * Apply growth rate to a value
 */
function applyGrowth(value: number, growthRate: number): number {
  return new Decimal(value)
    .times(1 + growthRate / 100)
    .round()
    .toNumber();
}

/**
 * Calculate tax benefit/liability from rental property
 */
function calculateTaxImpact(
  taxableIncome: number,
  marginalTaxRate: number
): number {
  // Negative taxable income = tax benefit (refund)
  // Positive taxable income = tax liability
  return new Decimal(taxableIncome)
    .times(marginalTaxRate)
    .dividedBy(100)
    .round()
    .toNumber();
}

// ============ Main Projection Function ============

/**
 * Generate multi-year property investment projections
 *
 * @param inputs - Projection inputs
 * @param years - Number of years to project (default 20)
 * @returns Projection summary with yearly breakdowns
 */
export function generatePropertyProjections(
  inputs: ProjectionInputs,
  years: number = 20
): ProjectionSummary {
  const {
    currentValue,
    purchasePrice,
    purchaseDate,
    loanBalance,
    interestRate,
    loanTermYearsRemaining,
    isInterestOnly: _isInterestOnly,
    interestOnlyYearsRemaining = 0,
    weeklyRent,
    vacancyPercent = 2,
    annualExpenses,
    offsetBalance = 0,
    capitalGrowthScenario = "moderate",
    rentGrowthScenario = "moderate",
    customCapitalGrowthRate,
    customRentGrowthRate,
    marginalTaxRate = 32,
    annualDepreciation = 0,
  } = inputs;

  // Determine growth rates
  const capitalGrowthRate =
    capitalGrowthScenario === "custom" && customCapitalGrowthRate !== undefined
      ? customCapitalGrowthRate
      : CAPITAL_GROWTH_RATES[capitalGrowthScenario];

  const rentGrowthRate =
    rentGrowthScenario === "custom" && customRentGrowthRate !== undefined
      ? customRentGrowthRate
      : RENT_GROWTH_RATES[rentGrowthScenario];

  // Initialize tracking variables
  let currentPropertyValue = currentValue;
  let currentLoanBalance = loanBalance;
  let currentWeeklyRent = weeklyRent;
  let currentAnnualExpenses = annualExpenses;
  let currentDepreciation = annualDepreciation;
  let ioYearsRemaining = interestOnlyYearsRemaining;
  let remainingLoanYears = loanTermYearsRemaining;

  const projections: YearlyProjection[] = [];
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let totalCashflowBeforeTax = 0;
  let totalCashflowAfterTax = 0;
  let totalTaxBenefit = 0;

  // Generate year-by-year projections
  for (let year = 1; year <= years; year++) {
    const projectionDate = new Date(purchaseDate);
    projectionDate.setFullYear(projectionDate.getFullYear() + year);

    // Apply capital growth
    currentPropertyValue = applyGrowth(currentPropertyValue, capitalGrowthRate);
    const valueGrowthPercent = capitalGrowthRate;
    const cumulativeGrowthPercent =
      purchasePrice > 0
        ? ((currentPropertyValue - purchasePrice) / purchasePrice) * 100
        : 0;

    // Apply rent growth
    currentWeeklyRent = applyGrowth(currentWeeklyRent, rentGrowthRate);
    const annualGrossRent = currentWeeklyRent * 52;
    const vacancyDeduction = new Decimal(annualGrossRent)
      .times(vacancyPercent)
      .dividedBy(100)
      .round()
      .toNumber();
    const annualNetRent = annualGrossRent - vacancyDeduction;

    // Apply expense growth
    currentAnnualExpenses = applyGrowth(currentAnnualExpenses, EXPENSE_GROWTH_RATE);

    // Calculate loan repayment
    const effectiveBalance = Math.max(0, currentLoanBalance - offsetBalance);
    let loanPayment: { principal: number; interest: number; total: number };

    if (ioYearsRemaining > 0) {
      // Interest-only period
      loanPayment = calculateAnnualIOPayment(effectiveBalance, interestRate);
      ioYearsRemaining--;
    } else if (remainingLoanYears > 0) {
      // P+I period
      loanPayment = calculateAnnualPIRepayment(
        effectiveBalance,
        interestRate,
        remainingLoanYears
      );
      remainingLoanYears--;
    } else {
      // Loan paid off
      loanPayment = { principal: 0, interest: 0, total: 0 };
    }

    // Update loan balance
    currentLoanBalance = Math.max(0, currentLoanBalance - loanPayment.principal);

    // Calculate depreciation (declines each year)
    currentDepreciation = applyGrowth(currentDepreciation, -DEPRECIATION_DECLINE_RATE);
    currentDepreciation = Math.max(0, currentDepreciation);

    // Calculate cashflow before tax
    const annualCashflowBeforeTax =
      annualNetRent - currentAnnualExpenses - loanPayment.interest;

    // Calculate taxable income (includes depreciation as deduction)
    const taxableIncome =
      annualNetRent - currentAnnualExpenses - loanPayment.interest - currentDepreciation;

    // Calculate tax impact
    const taxImpact = calculateTaxImpact(taxableIncome, marginalTaxRate);
    // Negative taxable income = tax benefit (we get a refund)
    // Positive taxable income = tax liability (we pay more tax)
    const taxBenefitOrLiability = -taxImpact; // Flip sign: negative taxable = positive benefit

    // Calculate cashflow after tax
    const annualCashflowAfterTax = annualCashflowBeforeTax + taxBenefitOrLiability;

    // Calculate equity
    const equity = currentPropertyValue - currentLoanBalance;
    const equityRatio =
      currentPropertyValue > 0 ? (equity / currentPropertyValue) * 100 : 0;
    const lvr =
      currentPropertyValue > 0
        ? (currentLoanBalance / currentPropertyValue) * 100
        : 0;

    // Track totals
    totalPrincipalPaid += loanPayment.principal;
    totalInterestPaid += loanPayment.interest;
    totalCashflowBeforeTax += annualCashflowBeforeTax;
    totalCashflowAfterTax += annualCashflowAfterTax;
    if (taxBenefitOrLiability > 0) {
      totalTaxBenefit += taxBenefitOrLiability;
    }

    // Create projection entry
    projections.push({
      year,
      date: projectionDate,
      propertyValue: currentPropertyValue,
      valueGrowthPercent,
      cumulativeGrowthPercent: Math.round(cumulativeGrowthPercent * 10) / 10,
      loanBalance: currentLoanBalance,
      principalPaid: loanPayment.principal,
      interestPaid: loanPayment.interest,
      effectiveBalance,
      equity,
      equityRatio: Math.round(equityRatio * 10) / 10,
      lvr: Math.round(lvr * 10) / 10,
      weeklyRent: currentWeeklyRent,
      annualGrossRent,
      annualNetRent,
      annualExpenses: currentAnnualExpenses,
      annualInterestCost: loanPayment.interest,
      annualCashflowBeforeTax,
      annualCashflowAfterTax,
      taxableIncome,
      taxBenefitOrLiability,
      depreciation: currentDepreciation,
    });
  }

  // Calculate milestone summaries
  const getMilestone = (yearNum: number): ProjectionMilestone => {
    const projection = projections.find((p) => p.year === yearNum);
    if (!projection) {
      const last = projections[projections.length - 1];
      return {
        year: yearNum,
        propertyValue: last?.propertyValue || currentValue,
        equity: last?.equity || 0,
        loanBalance: last?.loanBalance || loanBalance,
        equityRatio: last?.equityRatio || 0,
        cumulativeGrowth: last?.cumulativeGrowthPercent || 0,
        totalCashflow: totalCashflowAfterTax,
      };
    }

    // Sum cashflow up to this year
    const cumulativeCashflow = projections
      .filter((p) => p.year <= yearNum)
      .reduce((sum, p) => sum + p.annualCashflowAfterTax, 0);

    return {
      year: yearNum,
      propertyValue: projection.propertyValue,
      equity: projection.equity,
      loanBalance: projection.loanBalance,
      equityRatio: projection.equityRatio,
      cumulativeGrowth: projection.cumulativeGrowthPercent,
      totalCashflow: cumulativeCashflow,
    };
  };

  // Calculate total equity built during projection period
  // Capital growth (final - starting value) + principal paid during period
  const totalEquityBuilt =
    currentPropertyValue - currentValue + totalPrincipalPaid;

  // Calculate average annual return
  // This is a simplified calculation: (Total Return / Years) / Initial Investment
  const totalReturn = totalEquityBuilt + totalCashflowAfterTax;
  const averageAnnualReturn =
    years > 0 && purchasePrice > 0
      ? (totalReturn / years / purchasePrice) * 100
      : 0;

  return {
    inputs,
    projections,
    scenario: capitalGrowthScenario,
    year5: getMilestone(5),
    year10: getMilestone(10),
    year20: getMilestone(20),
    totalEquityBuilt,
    totalPrincipalPaid,
    totalInterestPaid,
    totalCashflowBeforeTax,
    totalCashflowAfterTax,
    totalTaxBenefit,
    averageAnnualReturn: Math.round(averageAnnualReturn * 100) / 100,
  };
}

/**
 * Generate projections for all three scenarios
 */
export function generateAllScenarios(
  inputs: ProjectionInputs,
  years: number = 20
): {
  conservative: ProjectionSummary;
  moderate: ProjectionSummary;
  optimistic: ProjectionSummary;
} {
  return {
    conservative: generatePropertyProjections(
      { ...inputs, capitalGrowthScenario: "conservative", rentGrowthScenario: "conservative" },
      years
    ),
    moderate: generatePropertyProjections(
      { ...inputs, capitalGrowthScenario: "moderate", rentGrowthScenario: "moderate" },
      years
    ),
    optimistic: generatePropertyProjections(
      { ...inputs, capitalGrowthScenario: "optimistic", rentGrowthScenario: "optimistic" },
      years
    ),
  };
}

/**
 * Calculate equity at a specific year
 */
export function calculateEquityAtYear(
  inputs: ProjectionInputs,
  targetYear: number
): {
  propertyValue: number;
  loanBalance: number;
  equity: number;
  equityRatio: number;
} {
  const projection = generatePropertyProjections(inputs, targetYear);
  const yearData = projection.projections[targetYear - 1];

  if (!yearData) {
    return {
      propertyValue: inputs.currentValue,
      loanBalance: inputs.loanBalance,
      equity: inputs.currentValue - inputs.loanBalance,
      equityRatio: ((inputs.currentValue - inputs.loanBalance) / inputs.currentValue) * 100,
    };
  }

  return {
    propertyValue: yearData.propertyValue,
    loanBalance: yearData.loanBalance,
    equity: yearData.equity,
    equityRatio: yearData.equityRatio,
  };
}

/**
 * Find the year when property becomes positively geared
 * (cashflow turns positive)
 */
export function findPositiveGearingYear(inputs: ProjectionInputs): number | null {
  const projection = generatePropertyProjections(inputs, 30);

  for (const yearData of projection.projections) {
    if (yearData.annualCashflowBeforeTax > 0) {
      return yearData.year;
    }
  }

  return null; // Never becomes positive in 30 years
}

/**
 * Calculate break-even point (when total returns exceed initial investment)
 */
export function findBreakEvenYear(inputs: ProjectionInputs): number | null {
  const projection = generatePropertyProjections(inputs, 30);

  let cumulativeCashflow = 0;
  // Initial investment is the deposit (purchase price minus loan)
  const initialInvestment = inputs.purchasePrice - inputs.loanBalance;

  for (const yearData of projection.projections) {
    cumulativeCashflow += yearData.annualCashflowAfterTax;
    const totalReturn = yearData.equity - initialInvestment + cumulativeCashflow;

    if (totalReturn > 0) {
      return yearData.year;
    }
  }

  return null;
}

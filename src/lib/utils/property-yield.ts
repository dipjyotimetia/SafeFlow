/**
 * Property Yield Calculator
 *
 * Calculates various yield metrics for investment properties:
 * - Gross yield
 * - Net yield
 * - Cash-on-cash return
 * - Capitalization rate (Cap Rate)
 *
 * All amounts in cents (integers) to avoid floating-point issues.
 * Uses Decimal.js for precise financial calculations.
 */

import Decimal from "decimal.js";

export interface YieldResult {
  grossYield: number; // percentage (e.g., 5.2 for 5.2%)
  netYield: number; // percentage
  cashOnCashReturn: number; // percentage
  capRate: number; // percentage
}

export interface DetailedYieldResult extends YieldResult {
  annualRentalIncome: number; // cents
  annualExpenses: number; // cents
  netOperatingIncome: number; // cents
  cashflowBeforeFinancing: number; // cents
  cashflowAfterFinancing: number; // cents
}

/**
 * Calculate gross rental yield
 *
 * Gross Yield = (Annual Rental Income / Property Value) × 100
 *
 * @param annualRentalIncome - Annual rental income in cents
 * @param propertyValue - Property value/purchase price in cents
 * @returns Gross yield as percentage (rounded to 2 decimal places)
 */
export function calculateGrossYield(
  annualRentalIncome: number,
  propertyValue: number
): number {
  if (propertyValue === 0) return 0;
  const income = new Decimal(annualRentalIncome);
  const value = new Decimal(propertyValue);
  return income.dividedBy(value).times(100).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate net rental yield
 *
 * Net Yield = ((Annual Rental Income - Annual Expenses) / Property Value) × 100
 *
 * @param annualRentalIncome - Annual rental income in cents
 * @param annualExpenses - Annual operating expenses in cents (excluding financing)
 * @param propertyValue - Property value in cents
 * @returns Net yield as percentage (rounded to 2 decimal places)
 */
export function calculateNetYield(
  annualRentalIncome: number,
  annualExpenses: number,
  propertyValue: number
): number {
  if (propertyValue === 0) return 0;
  const income = new Decimal(annualRentalIncome);
  const expenses = new Decimal(annualExpenses);
  const value = new Decimal(propertyValue);
  return income.minus(expenses).dividedBy(value).times(100).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate cash-on-cash return
 *
 * Cash-on-Cash = (Annual Cash Flow / Total Cash Invested) × 100
 *
 * This measures the return on the actual cash invested (deposit + purchase costs).
 *
 * @param annualCashflow - Annual net cashflow after all expenses and financing in cents
 * @param totalCashInvested - Total cash invested (deposit + stamp duty + costs) in cents
 * @returns Cash-on-cash return as percentage (rounded to 2 decimal places)
 */
export function calculateCashOnCashReturn(
  annualCashflow: number,
  totalCashInvested: number
): number {
  if (totalCashInvested === 0) return 0;
  const cashflow = new Decimal(annualCashflow);
  const invested = new Decimal(totalCashInvested);
  return cashflow.dividedBy(invested).times(100).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate capitalization rate (Cap Rate)
 *
 * Cap Rate = (Net Operating Income / Property Value) × 100
 *
 * NOI = Rental Income - Operating Expenses (excluding debt service)
 *
 * @param netOperatingIncome - NOI in cents
 * @param propertyValue - Property value in cents
 * @returns Cap rate as percentage (rounded to 2 decimal places)
 */
export function calculateCapRate(
  netOperatingIncome: number,
  propertyValue: number
): number {
  if (propertyValue === 0) return 0;
  const noi = new Decimal(netOperatingIncome);
  const value = new Decimal(propertyValue);
  return noi.dividedBy(value).times(100).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate all yield metrics
 */
export function calculatePropertyYields(
  purchasePrice: number,
  annualRentalIncome: number,
  annualOperatingExpenses: number,
  totalCashInvested: number,
  annualDebtService: number = 0
): YieldResult {
  const netOperatingIncome = annualRentalIncome - annualOperatingExpenses;
  const annualCashflow = netOperatingIncome - annualDebtService;

  return {
    grossYield: calculateGrossYield(annualRentalIncome, purchasePrice),
    netYield: calculateNetYield(
      annualRentalIncome,
      annualOperatingExpenses,
      purchasePrice
    ),
    cashOnCashReturn: calculateCashOnCashReturn(
      annualCashflow,
      totalCashInvested
    ),
    capRate: calculateCapRate(netOperatingIncome, purchasePrice),
  };
}

/**
 * Calculate detailed yield breakdown
 */
export function calculateDetailedYields(
  purchasePrice: number,
  annualRentalIncome: number,
  annualOperatingExpenses: number,
  totalCashInvested: number,
  annualDebtService: number = 0
): DetailedYieldResult {
  const netOperatingIncome = annualRentalIncome - annualOperatingExpenses;
  const cashflowBeforeFinancing = netOperatingIncome;
  const cashflowAfterFinancing = netOperatingIncome - annualDebtService;

  const yields = calculatePropertyYields(
    purchasePrice,
    annualRentalIncome,
    annualOperatingExpenses,
    totalCashInvested,
    annualDebtService
  );

  return {
    ...yields,
    annualRentalIncome,
    annualExpenses: annualOperatingExpenses,
    netOperatingIncome,
    cashflowBeforeFinancing,
    cashflowAfterFinancing,
  };
}

/**
 * Calculate yield from weekly rent
 *
 * Convenience function to calculate gross yield from weekly rent.
 *
 * @param weeklyRent - Weekly rent in cents
 * @param propertyValue - Property value in cents
 * @returns Gross yield as percentage
 */
export function calculateYieldFromWeeklyRent(
  weeklyRent: number,
  propertyValue: number
): number {
  const annualRent = weeklyRent * 52;
  return calculateGrossYield(annualRent, propertyValue);
}

/**
 * Calculate required rent for target yield
 *
 * @param propertyValue - Property value in cents
 * @param targetYield - Target gross yield percentage (e.g., 5.5)
 * @returns Required weekly rent in cents
 */
export function calculateRequiredRentForYield(
  propertyValue: number,
  targetYield: number
): number {
  const value = new Decimal(propertyValue);
  const yield_ = new Decimal(targetYield);
  const annualRent = value.times(yield_).dividedBy(100);
  return annualRent.dividedBy(52).round().toNumber();
}

/**
 * Calculate property value from yield and rent
 *
 * @param weeklyRent - Weekly rent in cents
 * @param grossYield - Gross yield percentage
 * @returns Implied property value in cents
 */
export function calculateValueFromYield(
  weeklyRent: number,
  grossYield: number
): number {
  if (grossYield === 0) return 0;
  const rent = new Decimal(weeklyRent).times(52);
  const yield_ = new Decimal(grossYield);
  return rent.dividedBy(yield_).times(100).round().toNumber();
}

/**
 * Compare yields across different scenarios
 */
export function compareYieldScenarios(
  propertyValue: number,
  scenarios: {
    name: string;
    weeklyRent: number;
    annualExpenses: number;
  }[]
): {
  name: string;
  weeklyRent: number;
  annualRent: number;
  grossYield: number;
  netYield: number;
}[] {
  return scenarios.map((scenario) => {
    const annualRent = scenario.weeklyRent * 52;
    return {
      name: scenario.name,
      weeklyRent: scenario.weeklyRent,
      annualRent,
      grossYield: calculateGrossYield(annualRent, propertyValue),
      netYield: calculateNetYield(
        annualRent,
        scenario.annualExpenses,
        propertyValue
      ),
    };
  });
}

/**
 * Get yield assessment category
 */
export function assessYield(grossYield: number): {
  category: "excellent" | "good" | "fair" | "poor";
  description: string;
} {
  if (grossYield >= 7) {
    return {
      category: "excellent",
      description: "High yield - excellent income potential",
    };
  } else if (grossYield >= 5.5) {
    return {
      category: "good",
      description: "Good yield - solid income potential",
    };
  } else if (grossYield >= 4) {
    return {
      category: "fair",
      description: "Fair yield - moderate income, may rely on capital growth",
    };
  } else {
    return {
      category: "poor",
      description: "Low yield - likely relying heavily on capital growth",
    };
  }
}

/**
 * Calculate rental income after vacancy allowance
 */
export function calculateIncomeAfterVacancy(
  annualRentalIncome: number,
  vacancyPercent: number
): number {
  const income = new Decimal(annualRentalIncome);
  const vacancy = new Decimal(vacancyPercent);
  const vacancyAllowance = income.times(vacancy).dividedBy(100).round();
  return income.minus(vacancyAllowance).toNumber();
}

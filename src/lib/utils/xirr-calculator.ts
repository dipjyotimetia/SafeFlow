/**
 * XIRR (Extended Internal Rate of Return) Calculator
 *
 * XIRR calculates the annualized return for investments with irregular cashflows.
 * Unlike regular IRR which uses equal time periods, XIRR uses actual dates to
 * calculate returns accurately.
 *
 * Common use cases:
 * - Portfolio performance with irregular buy/sell transactions
 * - Investment returns with dividend payments at various dates
 * - Real estate investments with irregular rental income
 *
 * All amounts in cents (integers) to avoid floating-point issues.
 * Uses Decimal.js for precise financial calculations.
 */

import Decimal from "decimal.js";

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============ Types ============

export interface DateCashflow {
  date: Date;
  amount: number; // cents - negative for outflows (investments), positive for inflows (returns)
  description?: string;
}

export interface XIRRResult {
  xirr: number; // annualized percentage (e.g., 12.5 for 12.5%)
  converged: boolean; // whether calculation converged
  iterations: number; // iterations needed
  error?: string; // error message if calculation failed
}

export interface XIRRValidation {
  isValid: boolean;
  errors: string[];
}

// ============ Constants ============

/**
 * Maximum iterations for XIRR calculation
 */
const MAX_ITERATIONS = 100;

/**
 * Convergence tolerance for XIRR
 */
const CONVERGENCE_TOLERANCE = 0.0000001;

/**
 * Days in a year for XIRR calculation
 */
const DAYS_IN_YEAR = 365;

// ============ Validation ============

/**
 * Validate cashflows for XIRR calculation
 */
export function validateXIRRCashflows(cashflows: DateCashflow[]): XIRRValidation {
  const errors: string[] = [];

  if (cashflows.length < 2) {
    errors.push("At least 2 cashflows are required");
  }

  const hasNegative = cashflows.some((cf) => cf.amount < 0);
  const hasPositive = cashflows.some((cf) => cf.amount > 0);

  if (!hasNegative) {
    errors.push("At least one negative cashflow (investment) is required");
  }

  if (!hasPositive) {
    errors.push("At least one positive cashflow (return) is required");
  }

  // Check for invalid dates
  for (const cf of cashflows) {
    if (!(cf.date instanceof Date) || isNaN(cf.date.getTime())) {
      errors.push(`Invalid date found in cashflow: ${cf.description || "unknown"}`);
    }
  }

  // Check for zero amounts
  const hasZero = cashflows.some((cf) => cf.amount === 0);
  if (hasZero) {
    errors.push("Cashflows with zero amount are not allowed");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============ Helper Functions ============

/**
 * Calculate the difference in years between two dates
 */
function yearFraction(date1: Date, date2: Date): Decimal {
  const diffTime = date1.getTime() - date2.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return new Decimal(diffDays).dividedBy(DAYS_IN_YEAR);
}

/**
 * Sort cashflows by date (ascending)
 */
function sortCashflowsByDate(cashflows: DateCashflow[]): DateCashflow[] {
  return [...cashflows].sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ============ Core Calculation Functions ============

/**
 * Calculate XNPV (Net Present Value with dates)
 *
 * XNPV = Σ(CFi / (1 + rate)^((di - d0) / 365))
 *
 * @param cashflows - Array of dated cashflows
 * @param rate - Discount rate as decimal (e.g., 0.1 for 10%)
 * @returns XNPV value
 */
function calculateXNPV(cashflows: DateCashflow[], rate: Decimal): Decimal {
  const sorted = sortCashflowsByDate(cashflows);
  const startDate = sorted[0].date;
  let npv = new Decimal(0);

  for (const cf of sorted) {
    const years = yearFraction(cf.date, startDate);
    const discountFactor = rate.plus(1).pow(years);
    npv = npv.plus(new Decimal(cf.amount).dividedBy(discountFactor));
  }

  return npv;
}

/**
 * Calculate XNPV derivative (for Newton-Raphson)
 *
 * dXNPV/dr = Σ(-ti × CFi / (1 + r)^(ti + 1))
 */
function calculateXNPVDerivative(cashflows: DateCashflow[], rate: Decimal): Decimal {
  const sorted = sortCashflowsByDate(cashflows);
  const startDate = sorted[0].date;
  let derivative = new Decimal(0);

  for (const cf of sorted) {
    const years = yearFraction(cf.date, startDate);
    if (years.isZero()) continue; // First cashflow has no rate dependency

    const discountFactor = rate.plus(1).pow(years.plus(1));
    const term = years.negated().times(cf.amount).dividedBy(discountFactor);
    derivative = derivative.plus(term);
  }

  return derivative;
}

/**
 * Calculate XIRR using Newton-Raphson method with bisection fallback
 *
 * XIRR is the rate that makes XNPV = 0
 *
 * @param cashflows - Array of dated cashflows
 * @param guess - Initial guess for the rate (optional, default 0.1 = 10%)
 * @returns XIRR result
 */
export function calculateXIRR(
  cashflows: DateCashflow[],
  guess: number = 0.1
): XIRRResult {
  // Validate inputs
  const validation = validateXIRRCashflows(cashflows);
  if (!validation.isValid) {
    return {
      xirr: 0,
      converged: false,
      iterations: 0,
      error: validation.errors.join("; "),
    };
  }

  const sorted = sortCashflowsByDate(cashflows);

  // Initial guess
  let rate = new Decimal(guess);
  let iterations = 0;

  // Newton-Raphson iteration
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations = i + 1;

    // Calculate XNPV at current rate
    const npv = calculateXNPV(sorted, rate);

    // Check convergence
    if (npv.abs().lessThan(CONVERGENCE_TOLERANCE)) {
      return {
        xirr: rate.times(100).toDecimalPlaces(2).toNumber(),
        converged: true,
        iterations,
      };
    }

    // Calculate derivative
    const derivative = calculateXNPVDerivative(sorted, rate);

    // Avoid division by zero
    if (derivative.abs().lessThan(1e-10)) {
      break; // Fall back to bisection
    }

    // Newton-Raphson update: r_new = r - NPV(r) / NPV'(r)
    const adjustment = npv.dividedBy(derivative);
    rate = rate.minus(adjustment);

    // Bound the rate to reasonable values (-99% to 10000%)
    if (rate.lessThan(-0.99)) rate = new Decimal(-0.99);
    if (rate.greaterThan(100)) rate = new Decimal(100);
  }

  // If Newton-Raphson didn't converge, try bisection method
  return calculateXIRRBisection(sorted);
}

/**
 * Calculate XIRR using bisection method (fallback)
 */
function calculateXIRRBisection(cashflows: DateCashflow[]): XIRRResult {
  let low = new Decimal(-0.99);
  let high = new Decimal(10); // 1000%
  let iterations = 0;

  // Check if solution exists in range
  const npvLow = calculateXNPV(cashflows, low);
  const npvHigh = calculateXNPV(cashflows, high);

  if (npvLow.times(npvHigh).greaterThan(0)) {
    // Try to find bounds
    if (npvLow.greaterThan(0) && npvHigh.greaterThan(0)) {
      return {
        xirr: 0,
        converged: false,
        iterations: 0,
        error: "No solution found: returns too high",
      };
    }
    if (npvLow.lessThan(0) && npvHigh.lessThan(0)) {
      return {
        xirr: 0,
        converged: false,
        iterations: 0,
        error: "No solution found: returns too low",
      };
    }
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations = i + 1;
    const mid = low.plus(high).dividedBy(2);
    const npvMid = calculateXNPV(cashflows, mid);

    if (npvMid.abs().lessThan(CONVERGENCE_TOLERANCE)) {
      return {
        xirr: mid.times(100).toDecimalPlaces(2).toNumber(),
        converged: true,
        iterations,
      };
    }

    const npvLowCurrent = calculateXNPV(cashflows, low);
    if (npvMid.times(npvLowCurrent).lessThan(0)) {
      high = mid;
    } else {
      low = mid;
    }
  }

  // Return best guess even if not fully converged
  const finalRate = low.plus(high).dividedBy(2);
  return {
    xirr: finalRate.times(100).toDecimalPlaces(2).toNumber(),
    converged: false,
    iterations,
  };
}

// ============ Investment-Specific Functions ============

/**
 * Build XIRR cashflows from investment transactions
 *
 * @param transactions - Array of investment transactions
 * @param currentValue - Current portfolio value (will be added as final positive cashflow)
 * @param valuationDate - Date for the current value (default: today)
 * @returns Array of dated cashflows
 */
export function buildXIRRCashflows(
  transactions: Array<{
    date: Date;
    type: "buy" | "sell" | "dividend" | "distribution" | "fee";
    amount: number; // cents
  }>,
  currentValue: number,
  valuationDate: Date = new Date()
): DateCashflow[] {
  const cashflows: DateCashflow[] = [];

  for (const tx of transactions) {
    let amount: number;

    switch (tx.type) {
      case "buy":
        amount = -tx.amount; // Outflow (negative)
        break;
      case "sell":
      case "dividend":
      case "distribution":
        amount = tx.amount; // Inflow (positive)
        break;
      case "fee":
        amount = -tx.amount; // Outflow (negative)
        break;
      default:
        continue;
    }

    cashflows.push({
      date: tx.date,
      amount,
      description: tx.type,
    });
  }

  // Add current value as final inflow
  if (currentValue > 0) {
    cashflows.push({
      date: valuationDate,
      amount: currentValue,
      description: "Current Value",
    });
  }

  return cashflows;
}

/**
 * Calculate portfolio XIRR from transactions and current value
 *
 * @param transactions - Array of investment transactions
 * @param currentValue - Current portfolio value in cents
 * @param valuationDate - Date for the current value (default: today)
 * @returns XIRR result
 */
export function calculatePortfolioXIRR(
  transactions: Array<{
    date: Date;
    type: "buy" | "sell" | "dividend" | "distribution" | "fee";
    amount: number;
  }>,
  currentValue: number,
  valuationDate: Date = new Date()
): XIRRResult {
  const cashflows = buildXIRRCashflows(transactions, currentValue, valuationDate);
  return calculateXIRR(cashflows);
}

/**
 * Calculate holding XIRR from investment transactions
 *
 * @param transactions - Transactions for a specific holding
 * @param currentValue - Current holding value in cents
 * @returns XIRR result
 */
export function calculateHoldingXIRR(
  transactions: Array<{
    date: Date;
    type: "buy" | "sell" | "dividend" | "distribution" | "fee";
    totalAmount: number;
  }>,
  currentValue: number
): XIRRResult {
  const cashflows = buildXIRRCashflows(
    transactions.map((t) => ({
      date: t.date,
      type: t.type,
      amount: t.totalAmount,
    })),
    currentValue
  );
  return calculateXIRR(cashflows);
}

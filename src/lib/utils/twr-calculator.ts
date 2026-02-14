/**
 * TWR (Time-Weighted Return) Calculator
 *
 * TWR measures investment performance independent of external cash flows
 * (deposits/withdrawals). It's the standard measure for comparing
 * portfolio managers because it eliminates the impact of cash flow timing.
 *
 * Unlike XIRR (which is dollar-weighted and affected by timing of cash flows),
 * TWR shows the pure investment performance of the portfolio.
 *
 * Common use cases:
 * - Comparing investment manager performance
 * - Benchmarking against indices
 * - Understanding true portfolio performance regardless of deposit timing
 *
 * All amounts in cents (integers) to avoid floating-point issues.
 * Uses Decimal.js for precise financial calculations.
 */

import Decimal from "decimal.js";

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============ Types ============

/**
 * A period represents a time segment between external cash flows
 */
export interface TWRPeriod {
  startDate: Date;
  endDate: Date;
  startValue: number; // cents - portfolio value at start of period
  endValue: number; // cents - portfolio value at end of period (before any cashflow)
  externalCashflow?: number; // cents - deposit (+) or withdrawal (-) at end of period
}

/**
 * A snapshot of portfolio value at a point in time
 */
export interface PortfolioSnapshot {
  date: Date;
  value: number; // cents - total portfolio value
  cashflow?: number; // cents - external cashflow on this date (deposit +, withdrawal -)
}

export interface TWRResult {
  twr: number; // total return as percentage (e.g., 25.5 for 25.5%)
  annualizedTWR: number; // annualized return as percentage
  periodReturns: PeriodReturn[]; // return for each period
  totalDays: number; // total days in calculation period
}

export interface PeriodReturn {
  startDate: Date;
  endDate: Date;
  return: number; // period return as decimal (e.g., 0.05 for 5%)
}

export interface TWRValidation {
  isValid: boolean;
  errors: string[];
}

// ============ Constants ============

/**
 * Days in a year for annualization
 */
const DAYS_IN_YEAR = 365;

// ============ Validation ============

/**
 * Validate periods for TWR calculation
 */
export function validateTWRPeriods(periods: TWRPeriod[]): TWRValidation {
  const errors: string[] = [];

  if (periods.length === 0) {
    errors.push("At least one period is required");
  }

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];

    if (period.startValue <= 0) {
      errors.push(`Period ${i + 1}: Start value must be positive`);
    }

    if (period.endValue < 0) {
      errors.push(`Period ${i + 1}: End value cannot be negative`);
    }

    if (period.endDate <= period.startDate) {
      errors.push(`Period ${i + 1}: End date must be after start date`);
    }

    // Check period continuity
    if (i > 0) {
      const prevPeriod = periods[i - 1];
      if (period.startDate.getTime() !== prevPeriod.endDate.getTime()) {
        errors.push(`Period ${i + 1}: Start date doesn't match previous end date`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate snapshots for TWR calculation
 */
export function validateSnapshots(snapshots: PortfolioSnapshot[]): TWRValidation {
  const errors: string[] = [];

  if (snapshots.length < 2) {
    errors.push("At least 2 snapshots are required");
  }

  // Check chronological order
  for (let i = 1; i < snapshots.length; i++) {
    if (snapshots[i].date <= snapshots[i - 1].date) {
      errors.push("Snapshots must be in chronological order");
      break;
    }
  }

  // Check for non-negative values
  for (const snapshot of snapshots) {
    if (snapshot.value < 0) {
      errors.push("Portfolio value cannot be negative");
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============ Core Calculation Functions ============

/**
 * Calculate TWR from periods
 *
 * TWR = (1 + R1) × (1 + R2) × ... × (1 + Rn) - 1
 *
 * Where each period return Ri = (EndValue - StartValue) / StartValue
 *
 * @param periods - Array of periods with start/end values
 * @returns TWR result
 */
export function calculateTWRFromPeriods(periods: TWRPeriod[]): TWRResult {
  const validation = validateTWRPeriods(periods);
  if (!validation.isValid) {
    return {
      twr: 0,
      annualizedTWR: 0,
      periodReturns: [],
      totalDays: 0,
    };
  }

  const periodReturns: PeriodReturn[] = [];
  let cumulativeReturn = new Decimal(1);

  for (const period of periods) {
    // Calculate period return
    // If there's a cashflow, we use endValue BEFORE the cashflow
    const startValue = new Decimal(period.startValue);
    const endValue = new Decimal(period.endValue);

    // Period return = (End - Start) / Start
    const periodReturn = endValue.minus(startValue).dividedBy(startValue);

    periodReturns.push({
      startDate: period.startDate,
      endDate: period.endDate,
      return: periodReturn.toNumber(),
    });

    // Chain the returns: TWR = (1+R1)(1+R2)...(1+Rn) - 1
    cumulativeReturn = cumulativeReturn.times(periodReturn.plus(1));
  }

  // Calculate total days
  const firstDate = periods[0].startDate;
  const lastDate = periods[periods.length - 1].endDate;
  const totalDays = Math.round(
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate total TWR
  const twr = cumulativeReturn.minus(1);

  // Annualize the return
  // Annualized = (1 + TWR)^(365/days) - 1
  let annualizedTWR = new Decimal(0);
  if (totalDays > 0) {
    const yearsHeld = new Decimal(totalDays).dividedBy(DAYS_IN_YEAR);
    if (yearsHeld.greaterThan(0)) {
      annualizedTWR = cumulativeReturn.pow(new Decimal(1).dividedBy(yearsHeld)).minus(1);
    }
  }

  return {
    twr: twr.times(100).toDecimalPlaces(2).toNumber(),
    annualizedTWR: annualizedTWR.times(100).toDecimalPlaces(2).toNumber(),
    periodReturns,
    totalDays,
  };
}

/**
 * Calculate TWR from portfolio snapshots
 *
 * This is a convenience function that converts snapshots to periods
 * and calculates TWR.
 *
 * @param snapshots - Array of portfolio snapshots with values and optional cashflows
 * @returns TWR result
 */
export function calculateTWRFromSnapshots(snapshots: PortfolioSnapshot[]): TWRResult {
  const validation = validateSnapshots(snapshots);
  if (!validation.isValid) {
    return {
      twr: 0,
      annualizedTWR: 0,
      periodReturns: [],
      totalDays: 0,
    };
  }

  // Sort snapshots by date
  const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Build periods from snapshots
  const periods: TWRPeriod[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // Adjust start value for any cashflow on the current date
    // The cashflow happens at the START of the new period
    const startValue = current.value + (current.cashflow || 0);

    periods.push({
      startDate: current.date,
      endDate: next.date,
      startValue: startValue,
      endValue: next.value,
      externalCashflow: next.cashflow,
    });
  }

  return calculateTWRFromPeriods(periods);
}

/**
 * Calculate Modified Dietz return (a TWR approximation)
 *
 * Modified Dietz is simpler than true TWR and doesn't require
 * daily valuations. It approximates TWR by weighting cashflows
 * by the fraction of the period they were invested.
 *
 * @param startValue - Starting portfolio value (cents)
 * @param endValue - Ending portfolio value (cents)
 * @param cashflows - Array of dated cashflows during the period
 * @returns Modified Dietz return as percentage
 */
export function calculateModifiedDietz(
  startValue: number,
  endValue: number,
  cashflows: Array<{ date: Date; amount: number }>,
  startDate: Date,
  endDate: Date
): number {
  const start = new Decimal(startValue);
  const end = new Decimal(endValue);
  const totalDays = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (totalDays <= 0) {
    return 0;
  }

  // Calculate total cashflows and weighted cashflows
  let totalCashflow = new Decimal(0);
  let weightedCashflow = new Decimal(0);

  for (const cf of cashflows) {
    const daysRemaining = Math.round(
      (endDate.getTime() - cf.date.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weight = new Decimal(daysRemaining).dividedBy(totalDays);

    totalCashflow = totalCashflow.plus(cf.amount);
    weightedCashflow = weightedCashflow.plus(new Decimal(cf.amount).times(weight));
  }

  // Modified Dietz = (End - Start - Cashflows) / (Start + Weighted Cashflows)
  const gain = end.minus(start).minus(totalCashflow);
  const averageCapital = start.plus(weightedCashflow);

  if (averageCapital.isZero()) {
    return 0;
  }

  return gain.dividedBy(averageCapital).times(100).toDecimalPlaces(2).toNumber();
}

// ============ Portfolio-Specific Functions ============

/**
 * Build TWR periods from portfolio snapshots
 *
 * This function converts an array of portfolio snapshots (from the portfolioSnapshots table)
 * into periods suitable for TWR calculation.
 *
 * @param snapshots - Array of portfolio snapshots from database
 * @param transactions - Array of investment transactions (for cashflow detection)
 * @returns Array of TWR periods
 */
export function buildTWRPeriodsFromSnapshots(
  snapshots: Array<{
    date: Date;
    totalValue: number;
  }>,
  transactions?: Array<{
    date: Date;
    type: "buy" | "sell" | "dividend" | "distribution" | "fee";
    totalAmount: number;
  }>
): TWRPeriod[] {
  if (snapshots.length < 2) {
    return [];
  }

  // Sort snapshots by date
  const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Build cashflow map from transactions
  const cashflowMap = new Map<string, number>();
  if (transactions) {
    for (const tx of transactions) {
      const dateKey = tx.date.toISOString().split("T")[0];
      const existingCashflow = cashflowMap.get(dateKey) || 0;

      const cashflow = 0;
      switch (tx.type) {
        // Investment transactions are internal and should not be treated as external cashflows.
        // External cashflows (deposits/withdrawals) are not represented by InvestmentTransaction.
      }

      if (cashflow !== 0) {
        cashflowMap.set(dateKey, existingCashflow + cashflow);
      }
    }
  }

  // Build periods
  const periods: TWRPeriod[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // Get cashflow for current date
    const dateKey = current.date.toISOString().split("T")[0];
    const externalCashflow = cashflowMap.get(dateKey) || 0;

    periods.push({
      startDate: current.date,
      endDate: next.date,
      startValue: current.totalValue + externalCashflow,
      endValue: next.totalValue,
      externalCashflow: externalCashflow || undefined,
    });
  }

  return periods;
}

/**
 * Calculate portfolio TWR with annualized return
 *
 * @param snapshots - Array of portfolio snapshots
 * @param transactions - Optional array of transactions for cashflow adjustment
 * @returns TWR result
 */
export function calculatePortfolioTWR(
  snapshots: Array<{
    date: Date;
    totalValue: number;
  }>,
  transactions?: Array<{
    date: Date;
    type: "buy" | "sell" | "dividend" | "distribution" | "fee";
    totalAmount: number;
  }>
): TWRResult {
  const periods = buildTWRPeriodsFromSnapshots(snapshots, transactions);
  return calculateTWRFromPeriods(periods);
}

/**
 * Compare portfolio performance to a benchmark
 *
 * @param portfolioSnapshots - Portfolio value snapshots
 * @param benchmarkSnapshots - Benchmark value snapshots (same dates)
 * @returns Comparison with alpha (excess return)
 */
export function compareWithBenchmark(
  portfolioSnapshots: Array<{ date: Date; value: number }>,
  benchmarkSnapshots: Array<{ date: Date; value: number }>
): {
  portfolioTWR: number;
  benchmarkTWR: number;
  alpha: number; // Excess return over benchmark
  trackingError?: number;
} {
  // Calculate portfolio TWR
  const portfolioPeriods: TWRPeriod[] = [];
  for (let i = 0; i < portfolioSnapshots.length - 1; i++) {
    portfolioPeriods.push({
      startDate: portfolioSnapshots[i].date,
      endDate: portfolioSnapshots[i + 1].date,
      startValue: portfolioSnapshots[i].value,
      endValue: portfolioSnapshots[i + 1].value,
    });
  }
  const portfolioResult = calculateTWRFromPeriods(portfolioPeriods);

  // Calculate benchmark TWR
  const benchmarkPeriods: TWRPeriod[] = [];
  for (let i = 0; i < benchmarkSnapshots.length - 1; i++) {
    benchmarkPeriods.push({
      startDate: benchmarkSnapshots[i].date,
      endDate: benchmarkSnapshots[i + 1].date,
      startValue: benchmarkSnapshots[i].value,
      endValue: benchmarkSnapshots[i + 1].value,
    });
  }
  const benchmarkResult = calculateTWRFromPeriods(benchmarkPeriods);

  return {
    portfolioTWR: portfolioResult.twr,
    benchmarkTWR: benchmarkResult.twr,
    alpha: portfolioResult.twr - benchmarkResult.twr,
  };
}

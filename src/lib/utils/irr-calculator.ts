/**
 * IRR (Internal Rate of Return) and NPV (Net Present Value) Calculator
 *
 * Provides professional-grade investment analysis metrics:
 * - Internal Rate of Return (IRR) - the discount rate that makes NPV = 0
 * - Net Present Value (NPV) - present value of all future cashflows
 * - Modified IRR (MIRR) - more realistic with separate reinvestment rate
 *
 * All amounts in cents (integers) to avoid floating-point issues.
 * Uses Decimal.js for precise financial calculations.
 */

import Decimal from "decimal.js";

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============ Types ============

export interface CashflowEntry {
  year: number; // 0 = initial investment (usually negative)
  amount: number; // cents - positive = inflow, negative = outflow
  description?: string;
}

export interface IRRResult {
  irr: number; // percentage (e.g., 12.5 for 12.5%)
  converged: boolean; // whether calculation converged
  iterations: number; // iterations needed
}

export interface NPVResult {
  npv: number; // cents
  discountRate: number; // percentage used
  presentValueOfInflows: number; // cents
  presentValueOfOutflows: number; // cents
}

export interface MIRRResult {
  mirr: number; // percentage
  financeRate: number; // percentage - rate for outflows
  reinvestmentRate: number; // percentage - rate for inflows
}

export interface InvestmentAnalysis {
  irr: IRRResult;
  npv: NPVResult;
  mirr?: MIRRResult;
  paybackPeriod: number | null; // years, null if never pays back
  profitabilityIndex: number; // NPV / Initial Investment + 1
  totalReturn: number; // cents
  totalReturnPercent: number; // percentage
}

export interface PropertyIRRInputs {
  initialInvestment: number; // cents - deposit + purchase costs
  annualCashflows: number[]; // cents - net cashflow each year
  saleYear: number; // year of sale (for terminal value)
  saleProceeds: number; // cents - net sale proceeds after CGT
  discountRate?: number; // percentage - for NPV calculation
  reinvestmentRate?: number; // percentage - for MIRR calculation
}

// ============ Constants ============

/**
 * Default discount rate for NPV calculations
 * Based on typical investor required return
 */
export const DEFAULT_DISCOUNT_RATE = 8.0; // percentage

/**
 * Default reinvestment rate for MIRR
 * Typically more conservative than IRR
 */
export const DEFAULT_REINVESTMENT_RATE = 4.0; // percentage

/**
 * Maximum iterations for IRR calculation
 */
const MAX_ITERATIONS = 100;

/**
 * Convergence tolerance for IRR
 */
const CONVERGENCE_TOLERANCE = 0.0001;

// ============ Core Calculation Functions ============

/**
 * Calculate Net Present Value (NPV)
 *
 * NPV = Σ(CFt / (1 + r)^t) for t = 0 to n
 *
 * @param cashflows - Array of cashflow entries (year 0 = initial investment)
 * @param discountRate - Discount rate as percentage (e.g., 8 for 8%)
 * @returns NPV result in cents
 */
export function calculateNPV(
  cashflows: CashflowEntry[],
  discountRate: number
): NPVResult {
  const rate = new Decimal(discountRate).dividedBy(100);
  let pvInflows = new Decimal(0);
  let pvOutflows = new Decimal(0);

  for (const cf of cashflows) {
    const discountFactor = rate.plus(1).pow(cf.year);
    const pv = new Decimal(cf.amount).dividedBy(discountFactor);

    if (cf.amount >= 0) {
      pvInflows = pvInflows.plus(pv);
    } else {
      pvOutflows = pvOutflows.plus(pv);
    }
  }

  const npv = pvInflows.plus(pvOutflows); // outflows are negative

  return {
    npv: npv.round().toNumber(),
    discountRate,
    presentValueOfInflows: pvInflows.round().toNumber(),
    presentValueOfOutflows: pvOutflows.abs().round().toNumber(),
  };
}

/**
 * Calculate NPV derivative (for Newton-Raphson IRR calculation)
 *
 * dNPV/dr = Σ(-t × CFt / (1 + r)^(t+1)) for t = 0 to n
 */
function calculateNPVDerivative(
  cashflows: CashflowEntry[],
  rate: Decimal
): Decimal {
  let derivative = new Decimal(0);

  for (const cf of cashflows) {
    if (cf.year === 0) continue; // Year 0 has no rate dependency
    const discountFactor = rate.plus(1).pow(cf.year + 1);
    const term = new Decimal(-cf.year)
      .times(cf.amount)
      .dividedBy(discountFactor);
    derivative = derivative.plus(term);
  }

  return derivative;
}

/**
 * Calculate Internal Rate of Return (IRR) using Newton-Raphson method
 *
 * IRR is the discount rate that makes NPV = 0
 *
 * @param cashflows - Array of cashflow entries (year 0 = initial investment, should be negative)
 * @returns IRR result with convergence info
 */
export function calculateIRR(cashflows: CashflowEntry[]): IRRResult {
  // Validate inputs
  if (cashflows.length < 2) {
    return { irr: 0, converged: false, iterations: 0 };
  }

  // Check if there's at least one positive and one negative cashflow
  const hasNegative = cashflows.some((cf) => cf.amount < 0);
  const hasPositive = cashflows.some((cf) => cf.amount > 0);
  if (!hasNegative || !hasPositive) {
    return { irr: 0, converged: false, iterations: 0 };
  }

  // Initial guess: 10%
  let rate = new Decimal(0.1);
  let iterations = 0;

  // Newton-Raphson iteration
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations = i + 1;

    // Calculate NPV at current rate
    let npv = new Decimal(0);
    for (const cf of cashflows) {
      const discountFactor = rate.plus(1).pow(cf.year);
      npv = npv.plus(new Decimal(cf.amount).dividedBy(discountFactor));
    }

    // Check convergence
    if (npv.abs().lessThan(CONVERGENCE_TOLERANCE)) {
      return {
        irr: rate.times(100).toDecimalPlaces(2).toNumber(),
        converged: true,
        iterations,
      };
    }

    // Calculate derivative
    const derivative = calculateNPVDerivative(cashflows, rate);

    // Avoid division by zero
    if (derivative.isZero()) {
      // Try bisection fallback
      break;
    }

    // Newton-Raphson update: r_new = r - NPV(r) / NPV'(r)
    const adjustment = npv.dividedBy(derivative);
    rate = rate.minus(adjustment);

    // Bound the rate to reasonable values (-99% to 1000%)
    if (rate.lessThan(-0.99)) rate = new Decimal(-0.99);
    if (rate.greaterThan(10)) rate = new Decimal(10);
  }

  // If Newton-Raphson didn't converge, try bisection method
  return calculateIRRBisection(cashflows);
}

/**
 * Calculate IRR using bisection method (fallback)
 */
function calculateIRRBisection(cashflows: CashflowEntry[]): IRRResult {
  let low = new Decimal(-0.99);
  let high = new Decimal(5); // 500%
  let iterations = 0;

  const calculateNPVAtRate = (r: Decimal): Decimal => {
    let npv = new Decimal(0);
    for (const cf of cashflows) {
      const discountFactor = r.plus(1).pow(cf.year);
      npv = npv.plus(new Decimal(cf.amount).dividedBy(discountFactor));
    }
    return npv;
  };

  // Check if solution exists in range
  const npvLow = calculateNPVAtRate(low);
  const npvHigh = calculateNPVAtRate(high);
  if (npvLow.times(npvHigh).greaterThan(0)) {
    // No solution in range
    return { irr: 0, converged: false, iterations: 0 };
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations = i + 1;
    const mid = low.plus(high).dividedBy(2);
    const npvMid = calculateNPVAtRate(mid);

    if (npvMid.abs().lessThan(CONVERGENCE_TOLERANCE)) {
      return {
        irr: mid.times(100).toDecimalPlaces(2).toNumber(),
        converged: true,
        iterations,
      };
    }

    if (npvMid.times(npvLow).lessThan(0)) {
      high = mid;
    } else {
      low = mid;
    }
  }

  // Return best guess even if not fully converged
  const finalRate = low.plus(high).dividedBy(2);
  return {
    irr: finalRate.times(100).toDecimalPlaces(2).toNumber(),
    converged: false,
    iterations,
  };
}

/**
 * Calculate Modified Internal Rate of Return (MIRR)
 *
 * MIRR addresses IRR's reinvestment rate assumption by using:
 * - Finance rate for outflows (cost of capital)
 * - Reinvestment rate for inflows (realistic reinvestment return)
 *
 * MIRR = (FV of positive cashflows / PV of negative cashflows)^(1/n) - 1
 *
 * @param cashflows - Array of cashflow entries
 * @param financeRate - Rate for discounting negative cashflows (percentage)
 * @param reinvestmentRate - Rate for compounding positive cashflows (percentage)
 * @returns MIRR result
 */
export function calculateMIRR(
  cashflows: CashflowEntry[],
  financeRate: number = DEFAULT_DISCOUNT_RATE,
  reinvestmentRate: number = DEFAULT_REINVESTMENT_RATE
): MIRRResult {
  if (cashflows.length < 2) {
    return { mirr: 0, financeRate, reinvestmentRate };
  }

  const n = Math.max(...cashflows.map((cf) => cf.year));
  const finRate = new Decimal(financeRate).dividedBy(100);
  const reinRate = new Decimal(reinvestmentRate).dividedBy(100);

  // Calculate PV of negative cashflows (discounted at finance rate)
  let pvNegative = new Decimal(0);
  for (const cf of cashflows) {
    if (cf.amount < 0) {
      const discountFactor = finRate.plus(1).pow(cf.year);
      pvNegative = pvNegative.plus(new Decimal(cf.amount).abs().dividedBy(discountFactor));
    }
  }

  // Calculate FV of positive cashflows (compounded at reinvestment rate)
  let fvPositive = new Decimal(0);
  for (const cf of cashflows) {
    if (cf.amount > 0) {
      const compoundFactor = reinRate.plus(1).pow(n - cf.year);
      fvPositive = fvPositive.plus(new Decimal(cf.amount).times(compoundFactor));
    }
  }

  if (pvNegative.isZero()) {
    return { mirr: 0, financeRate, reinvestmentRate };
  }

  // MIRR = (FV / PV)^(1/n) - 1
  const mirr = fvPositive
    .dividedBy(pvNegative)
    .pow(new Decimal(1).dividedBy(n))
    .minus(1)
    .times(100)
    .toDecimalPlaces(2)
    .toNumber();

  return { mirr, financeRate, reinvestmentRate };
}

/**
 * Calculate payback period
 *
 * @param cashflows - Array of cashflow entries
 * @returns Years to payback, or null if never pays back
 */
export function calculatePaybackPeriod(cashflows: CashflowEntry[]): number | null {
  let cumulative = 0;

  // Sort by year
  const sorted = [...cashflows].sort((a, b) => a.year - b.year);

  for (const cf of sorted) {
    cumulative += cf.amount;
    if (cumulative >= 0) {
      // Interpolate to get fractional year
      const prevCumulative = cumulative - cf.amount;
      const fraction = prevCumulative < 0
        ? Math.abs(prevCumulative) / cf.amount
        : 0;
      return Math.round((cf.year - 1 + fraction) * 10) / 10;
    }
  }

  return null; // Never pays back
}

// ============ Property-Specific Functions ============

/**
 * Analyze a property investment with comprehensive metrics
 *
 * @param inputs - Property investment inputs
 * @returns Complete investment analysis
 */
export function analyzePropertyInvestment(
  inputs: PropertyIRRInputs
): InvestmentAnalysis {
  const {
    initialInvestment,
    annualCashflows,
    saleYear,
    saleProceeds,
    discountRate = DEFAULT_DISCOUNT_RATE,
    reinvestmentRate = DEFAULT_REINVESTMENT_RATE,
  } = inputs;

  // Build cashflow entries
  const cashflows: CashflowEntry[] = [
    { year: 0, amount: -initialInvestment, description: "Initial Investment" },
  ];

  // Add annual cashflows
  for (let i = 0; i < annualCashflows.length; i++) {
    cashflows.push({
      year: i + 1,
      amount: annualCashflows[i],
      description: `Year ${i + 1} Net Cashflow`,
    });
  }

  // Add sale proceeds in final year
  if (saleProceeds > 0) {
    // Find or add sale year entry
    const existingSaleYear = cashflows.find((cf) => cf.year === saleYear);
    if (existingSaleYear) {
      existingSaleYear.amount += saleProceeds;
    } else {
      cashflows.push({
        year: saleYear,
        amount: saleProceeds,
        description: "Sale Proceeds",
      });
    }
  }

  // Calculate all metrics
  const irr = calculateIRR(cashflows);
  const npv = calculateNPV(cashflows, discountRate);
  const mirr = calculateMIRR(cashflows, discountRate, reinvestmentRate);
  const paybackPeriod = calculatePaybackPeriod(cashflows);

  // Calculate total return
  const totalInflows = cashflows
    .filter((cf) => cf.amount > 0)
    .reduce((sum, cf) => sum + cf.amount, 0);
  const totalOutflows = cashflows
    .filter((cf) => cf.amount < 0)
    .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);
  const totalReturn = totalInflows - totalOutflows;
  const totalReturnPercent =
    totalOutflows > 0 ? (totalReturn / totalOutflows) * 100 : 0;

  // Calculate profitability index
  const profitabilityIndex =
    initialInvestment > 0 ? (npv.npv / initialInvestment) + 1 : 0;

  return {
    irr,
    npv,
    mirr,
    paybackPeriod,
    profitabilityIndex: Math.round(profitabilityIndex * 100) / 100,
    totalReturn,
    totalReturnPercent: Math.round(totalReturnPercent * 10) / 10,
  };
}

/**
 * Compare multiple investment scenarios
 *
 * @param scenarios - Array of named scenario inputs
 * @returns Comparison results sorted by IRR
 */
export function compareInvestments(
  scenarios: Array<{ name: string; inputs: PropertyIRRInputs }>
): Array<{ name: string; analysis: InvestmentAnalysis }> {
  const results = scenarios.map((scenario) => ({
    name: scenario.name,
    analysis: analyzePropertyInvestment(scenario.inputs),
  }));

  // Sort by IRR (highest first)
  return results.sort((a, b) => b.analysis.irr.irr - a.analysis.irr.irr);
}

/**
 * Find the required sale price to achieve target IRR
 *
 * @param inputs - Base property inputs (without sale proceeds)
 * @param targetIRR - Target IRR percentage
 * @param saleYear - Year of sale
 * @returns Required sale proceeds in cents
 */
export function findRequiredSalePrice(
  initialInvestment: number,
  annualCashflows: number[],
  targetIRR: number,
  saleYear: number
): number {
  const targetRate = new Decimal(targetIRR).dividedBy(100);

  // Build cashflows without sale
  const cashflows: CashflowEntry[] = [
    { year: 0, amount: -initialInvestment },
  ];
  for (let i = 0; i < annualCashflows.length; i++) {
    cashflows.push({ year: i + 1, amount: annualCashflows[i] });
  }

  // Calculate NPV of existing cashflows at target rate
  let npvExisting = new Decimal(0);
  for (const cf of cashflows) {
    const discountFactor = targetRate.plus(1).pow(cf.year);
    npvExisting = npvExisting.plus(new Decimal(cf.amount).dividedBy(discountFactor));
  }

  // Required sale proceeds to make NPV = 0
  // NPV = npvExisting + saleProceeds / (1 + r)^saleYear = 0
  // saleProceeds = -npvExisting * (1 + r)^saleYear
  const discountFactor = targetRate.plus(1).pow(saleYear);
  const requiredSale = npvExisting.negated().times(discountFactor);

  return Math.max(0, requiredSale.round().toNumber());
}

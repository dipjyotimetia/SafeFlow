/**
 * Financial Projection Utilities
 *
 * Mathematical functions for financial projections, compound interest,
 * retirement planning, and goal tracking calculations.
 *
 * All monetary values are in cents (integers) to avoid floating-point issues.
 */

import { addMonths, differenceInMonths, format } from 'date-fns';

/**
 * A point in a financial projection
 */
export interface ProjectionPoint {
  date: Date;
  value: number; // cents
  label: string;
}

/**
 * Result of a projection calculation
 */
export interface ProjectionResult {
  projections: ProjectionPoint[];
  targetDate?: Date;
  targetAmount: number; // cents
  estimatedCompletionDate?: Date;
  shortfall?: number; // cents - if won't reach target by date
}

/**
 * Retirement projection result
 */
export interface RetirementProjection {
  currentAge: number;
  retirementAge: number;
  preservationAge: number;
  currentBalance: number; // cents
  projectedBalance: number; // cents at retirement
  monthlyIncomeAtRetirement: number; // cents
  yearsOfIncome: number;
  isOnTrack: boolean;
  requiredMonthlyContribution?: number; // cents - to be on track
  superBalance: number; // cents - projected super balance
  investmentBalance: number; // cents - projected investment balance
}

/**
 * Calculate future value with compound interest and regular contributions
 *
 * Formula: FV = PV × (1 + r)^n + PMT × (((1 + r)^n - 1) / r)
 *
 * Where:
 * - FV = Future Value
 * - PV = Present Value
 * - PMT = Monthly Payment
 * - r = Monthly interest rate (annual rate / 12)
 * - n = Number of months
 *
 * Note: If PV is negative (net debt), compound growth is not applied to the
 * negative portion. Contributions first reduce debt, then grow when positive.
 *
 * @param presentValueCents - Current value in cents
 * @param monthlyContributionCents - Monthly contribution in cents
 * @param annualReturnRate - Annual return rate (e.g., 0.07 for 7%)
 * @param months - Number of months to project
 * @returns Future value in cents
 */
export function calculateFutureValue(
  presentValueCents: number,
  monthlyContributionCents: number,
  annualReturnRate: number,
  months: number
): number {
  if (months <= 0) {
    return presentValueCents;
  }

  const monthlyRate = annualReturnRate / 12;

  // Handle negative starting value (net debt)
  // Don't apply compound growth to debt - contributions pay it down first
  if (presentValueCents < 0) {
    const totalContributions = monthlyContributionCents * months;
    const valueAfterContributions = presentValueCents + totalContributions;

    if (valueAfterContributions <= 0) {
      // Still in debt after all contributions
      return valueAfterContributions;
    }

    if (monthlyContributionCents <= 0) {
      // Avoid divide-by-zero or negative payoff scenarios
      return valueAfterContributions;
    }

    // Find when we cross zero, then apply compound growth from there
    const monthsToZero = Math.ceil(Math.abs(presentValueCents) / monthlyContributionCents);
    const remainingMonths = months - monthsToZero;

    if (remainingMonths <= 0 || monthlyRate === 0) {
      return valueAfterContributions;
    }

    // Compound growth only on positive portion
    const fvContributions =
      monthlyContributionCents * ((Math.pow(1 + monthlyRate, remainingMonths) - 1) / monthlyRate);

    return Math.round(fvContributions);
  }

  if (monthlyRate === 0) {
    // Simple calculation without interest
    return presentValueCents + monthlyContributionCents * months;
  }

  // Future value of present value
  const fvPresentValue = presentValueCents * Math.pow(1 + monthlyRate, months);

  // Future value of monthly contributions (annuity)
  const fvContributions =
    monthlyContributionCents * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  return Math.round(fvPresentValue + fvContributions);
}

/**
 * Calculate required monthly contribution to reach a target value
 *
 * @param presentValueCents - Current value in cents
 * @param targetValueCents - Target value in cents
 * @param annualReturnRate - Annual return rate (e.g., 0.07 for 7%)
 * @param months - Number of months to reach target
 * @returns Required monthly contribution in cents
 */
export function calculateRequiredContribution(
  presentValueCents: number,
  targetValueCents: number,
  annualReturnRate: number,
  months: number
): number {
  if (months <= 0) {
    return 0;
  }

  if (presentValueCents >= targetValueCents) {
    return 0;
  }

  const monthlyRate = annualReturnRate / 12;

  if (monthlyRate === 0) {
    return Math.round((targetValueCents - presentValueCents) / months);
  }

  // FV of current value
  const fvPresentValue = presentValueCents * Math.pow(1 + monthlyRate, months);

  // Amount needed from contributions
  const amountNeeded = targetValueCents - fvPresentValue;

  if (amountNeeded <= 0) {
    // Current value will grow to exceed target without contributions
    return 0;
  }

  // PMT = amountNeeded / ((((1 + r)^n) - 1) / r)
  const annuityFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;

  return Math.round(amountNeeded / annuityFactor);
}

/**
 * Calculate number of months to reach a target value
 *
 * @param presentValueCents - Current value in cents
 * @param targetValueCents - Target value in cents
 * @param monthlyContributionCents - Monthly contribution in cents
 * @param annualReturnRate - Annual return rate
 * @returns Number of months, or null if unreachable
 */
export function calculateMonthsToTarget(
  presentValueCents: number,
  targetValueCents: number,
  monthlyContributionCents: number,
  annualReturnRate: number
): number | null {
  if (presentValueCents >= targetValueCents) {
    return 0;
  }

  const monthlyRate = annualReturnRate / 12;

  if (monthlyRate === 0) {
    if (monthlyContributionCents <= 0) {
      return null; // Will never reach target
    }
    return Math.ceil((targetValueCents - presentValueCents) / monthlyContributionCents);
  }

  // Using logarithmic formula for time calculation
  // n = ln((FV × r + PMT) / (PV × r + PMT)) / ln(1 + r)
  const numerator = Math.log(
    (targetValueCents * monthlyRate + monthlyContributionCents) /
      (presentValueCents * monthlyRate + monthlyContributionCents)
  );
  const denominator = Math.log(1 + monthlyRate);

  const months = numerator / denominator;

  if (!isFinite(months) || months < 0) {
    return null;
  }

  return Math.ceil(months);
}

/**
 * Generate projection points for charting
 *
 * @param presentValueCents - Current value in cents
 * @param monthlyContributionCents - Monthly contribution in cents
 * @param annualReturnRate - Annual return rate
 * @param months - Total months to project
 * @param startDate - Start date (defaults to now)
 * @returns Array of projection points
 */
export function generateProjectionPoints(
  presentValueCents: number,
  monthlyContributionCents: number,
  annualReturnRate: number,
  months: number,
  startDate: Date = new Date()
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];

  // Add starting point
  points.push({
    date: startDate,
    value: presentValueCents,
    label: format(startDate, 'MMM yyyy'),
  });

  // Determine interval based on projection length
  let interval: number;
  if (months > 60) {
    interval = 12; // Yearly points for long projections
  } else if (months > 24) {
    interval = 6; // Half-yearly for medium projections
  } else if (months > 12) {
    interval = 3; // Quarterly
  } else {
    interval = 1; // Monthly for short projections
  }

  for (let m = interval; m <= months; m += interval) {
    const date = addMonths(startDate, m);
    const value = calculateFutureValue(
      presentValueCents,
      monthlyContributionCents,
      annualReturnRate,
      m
    );

    points.push({
      date,
      value,
      label: format(date, months > 24 ? 'yyyy' : 'MMM yyyy'),
    });
  }

  // Ensure we have the final point if not already included
  const lastPoint = points[points.length - 1];
  const finalDate = addMonths(startDate, months);

  if (lastPoint && lastPoint.date.getTime() < finalDate.getTime()) {
    points.push({
      date: finalDate,
      value: calculateFutureValue(
        presentValueCents,
        monthlyContributionCents,
        annualReturnRate,
        months
      ),
      label: format(finalDate, 'MMM yyyy'),
    });
  }

  return points;
}

/**
 * Calculate retirement projection with Australian superannuation rules
 *
 * Australian super specifics:
 * - Earnings taxed at 15% within fund
 * - Preservation age is typically 60 (for those born after 1 July 1964)
 * - 4% withdrawal rate is a common sustainable income rule
 *
 * @param currentAge - Current age in years
 * @param retirementAge - Target retirement age
 * @param currentSuperBalanceCents - Current super balance in cents
 * @param currentInvestmentsCents - Current non-super investments in cents
 * @param monthlySuperContributionCents - Expected monthly super contributions
 * @param monthlyInvestmentContributionCents - Expected monthly investment contributions
 * @param superReturnRate - Expected annual super return (default 7%)
 * @param investmentReturnRate - Expected annual investment return (default 7%)
 * @param preservationAge - Super preservation age (default 60)
 * @param targetMonthlyIncomeCents - Desired monthly retirement income (default $5,000)
 * @returns Retirement projection details
 */
export function calculateRetirementProjection(
  currentAge: number,
  retirementAge: number,
  currentSuperBalanceCents: number,
  currentInvestmentsCents: number,
  monthlySuperContributionCents: number,
  monthlyInvestmentContributionCents: number,
  superReturnRate: number = 0.07,
  investmentReturnRate: number = 0.07,
  preservationAge: number = 60,
  targetMonthlyIncomeCents: number = 500000 // $5,000
): RetirementProjection {
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const monthsToRetirement = yearsToRetirement * 12;

  // Super earnings are taxed at 15% within the fund
  const netSuperReturnRate = superReturnRate * 0.85;

  // Project super balance
  const projectedSuperBalance = calculateFutureValue(
    currentSuperBalanceCents,
    monthlySuperContributionCents,
    netSuperReturnRate,
    monthsToRetirement
  );

  // Project investment balance (outside super)
  const projectedInvestmentBalance = calculateFutureValue(
    currentInvestmentsCents,
    monthlyInvestmentContributionCents,
    investmentReturnRate,
    monthsToRetirement
  );

  const totalProjectedBalance = projectedSuperBalance + projectedInvestmentBalance;

  // Calculate sustainable monthly income using 4% withdrawal rule
  const annualWithdrawalRate = 0.04;
  const monthlyIncomeAtRetirement = Math.round((totalProjectedBalance * annualWithdrawalRate) / 12);

  // Estimate years of income
  // Using a simplified model: assuming 5% return in retirement, how long will funds last?
  const retirementReturnRate = 0.05;
  const annualIncome = monthlyIncomeAtRetirement * 12;

  let yearsOfIncome: number = 30; // Default to sustainable

  if (totalProjectedBalance > 0 && annualIncome > 0) {
    if (annualIncome >= totalProjectedBalance * retirementReturnRate) {
      // Drawing more than returns - calculate years until exhaustion
      const monthlyRetirementRate = retirementReturnRate / 12;
      if (monthlyIncomeAtRetirement > 0 && monthlyRetirementRate > 0) {
        // n = -ln(1 - (PV × r) / PMT) / ln(1 + r)
        const ratio = (totalProjectedBalance * monthlyRetirementRate) / monthlyIncomeAtRetirement;
        // Guard against edge cases that produce NaN/Infinity
        if (ratio > 0 && ratio < 1) {
          const logValue = -Math.log(1 - ratio) / Math.log(1 + monthlyRetirementRate) / 12;
          if (isFinite(logValue) && logValue > 0) {
            yearsOfIncome = Math.round(logValue);
          }
        }
        // ratio >= 1 means sustainable indefinitely (yearsOfIncome stays 30)
      }
    }
    // else: income < returns means sustainable indefinitely (yearsOfIncome stays 30)
  } else if (totalProjectedBalance <= 0) {
    yearsOfIncome = 0; // No funds means no income years
  }

  // Ensure reasonable bounds
  yearsOfIncome = Math.max(0, Math.min(50, yearsOfIncome));

  // Check if on track for target income
  const requiredBalance = Math.round((targetMonthlyIncomeCents * 12) / annualWithdrawalRate);
  const isOnTrack = totalProjectedBalance >= requiredBalance;

  // Calculate required contribution if not on track
  let requiredMonthlyContribution: number | undefined;
  if (!isOnTrack && monthsToRetirement > 0) {
    const currentTotal = currentSuperBalanceCents + currentInvestmentsCents;
    const avgReturnRate = (netSuperReturnRate + investmentReturnRate) / 2;
    requiredMonthlyContribution = calculateRequiredContribution(
      currentTotal,
      requiredBalance,
      avgReturnRate,
      monthsToRetirement
    );
  }

  return {
    currentAge,
    retirementAge,
    preservationAge,
    currentBalance: currentSuperBalanceCents + currentInvestmentsCents,
    projectedBalance: totalProjectedBalance,
    monthlyIncomeAtRetirement,
    yearsOfIncome,
    isOnTrack,
    requiredMonthlyContribution,
    superBalance: projectedSuperBalance,
    investmentBalance: projectedInvestmentBalance,
  };
}

/**
 * Calculate growth rate from historical values
 *
 * Uses CAGR (Compound Annual Growth Rate) formula
 *
 * @param historicalValues - Array of date/value pairs
 * @returns Annualized growth rate
 */
export function calculateGrowthRate(
  historicalValues: Array<{ date: Date; value: number }>
): number {
  if (historicalValues.length < 2) {
    return 0;
  }

  const sorted = [...historicalValues].sort((a, b) => a.date.getTime() - b.date.getTime());
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  if (oldest.value <= 0) {
    return 0;
  }

  const monthsDiff = differenceInMonths(newest.date, oldest.date);
  if (monthsDiff === 0) {
    return 0;
  }

  // Calculate CAGR
  const totalReturn = (newest.value - oldest.value) / oldest.value;
  const annualizedReturn = Math.pow(1 + totalReturn, 12 / monthsDiff) - 1;

  // Clamp to reasonable bounds (-50% to +100%)
  return Math.max(-0.5, Math.min(1.0, annualizedReturn));
}

/**
 * Calculate goal progress percentage
 *
 * @param currentAmount - Current amount in cents
 * @param targetAmount - Target amount in cents
 * @returns Progress percentage (0-100+, can exceed 100 if target reached)
 */
export function calculateProgressPercentage(
  currentAmount: number,
  targetAmount: number
): number {
  if (targetAmount <= 0) {
    return currentAmount > 0 ? 100 : 0;
  }

  return Math.round((currentAmount / targetAmount) * 100 * 100) / 100; // 2 decimal places
}

/**
 * Format a projection timeframe for display
 *
 * @param months - Number of months
 * @returns Human-readable timeframe (e.g., "2 years, 3 months")
 */
export function formatTimeframe(months: number | null): string {
  if (months === null) {
    return 'Unable to calculate';
  }

  if (months <= 0) {
    return 'Already reached';
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return remainingMonths === 1 ? '1 month' : `${remainingMonths} months`;
  }

  if (remainingMonths === 0) {
    return years === 1 ? '1 year' : `${years} years`;
  }

  const yearStr = years === 1 ? '1 year' : `${years} years`;
  const monthStr = remainingMonths === 1 ? '1 month' : `${remainingMonths} months`;

  return `${yearStr}, ${monthStr}`;
}

/**
 * Expense Frequency Normalizer
 *
 * Converts property expenses between different frequencies
 * (weekly, monthly, quarterly, annually).
 *
 * All amounts in cents (integers) to avoid floating-point issues.
 */

import type { ExpenseFrequency } from "@/types";

// Conversion factors to annual
const TO_ANNUAL_FACTORS: Record<ExpenseFrequency, number> = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

// Days per period (for daily rate calculations)
const DAYS_PER_PERIOD: Record<ExpenseFrequency, number> = {
  weekly: 7,
  monthly: 30.4375, // Average
  quarterly: 91.3125, // Average
  annually: 365.25,
};

/**
 * Convert an amount to annual frequency
 *
 * @param amount - Amount in cents
 * @param frequency - Current frequency
 * @returns Annual amount in cents
 */
export function normalizeToAnnual(
  amount: number,
  frequency: ExpenseFrequency
): number {
  return Math.round(amount * TO_ANNUAL_FACTORS[frequency]);
}

/**
 * Convert an amount to monthly frequency
 *
 * @param amount - Amount in cents
 * @param frequency - Current frequency
 * @returns Monthly amount in cents
 */
export function normalizeToMonthly(
  amount: number,
  frequency: ExpenseFrequency
): number {
  const annual = normalizeToAnnual(amount, frequency);
  return Math.round(annual / 12);
}

/**
 * Convert an amount to weekly frequency
 *
 * @param amount - Amount in cents
 * @param frequency - Current frequency
 * @returns Weekly amount in cents
 */
export function normalizeToWeekly(
  amount: number,
  frequency: ExpenseFrequency
): number {
  const annual = normalizeToAnnual(amount, frequency);
  return Math.round(annual / 52);
}

/**
 * Convert an amount to quarterly frequency
 *
 * @param amount - Amount in cents
 * @param frequency - Current frequency
 * @returns Quarterly amount in cents
 */
export function normalizeToQuarterly(
  amount: number,
  frequency: ExpenseFrequency
): number {
  const annual = normalizeToAnnual(amount, frequency);
  return Math.round(annual / 4);
}

/**
 * Convert an amount to a target frequency
 *
 * @param amount - Amount in cents
 * @param fromFrequency - Source frequency
 * @param toFrequency - Target frequency
 * @returns Amount in target frequency (cents)
 */
export function convertFrequency(
  amount: number,
  fromFrequency: ExpenseFrequency,
  toFrequency: ExpenseFrequency
): number {
  if (fromFrequency === toFrequency) {
    return amount;
  }

  // Convert to annual first, then to target
  const annual = normalizeToAnnual(amount, fromFrequency);

  switch (toFrequency) {
    case "weekly":
      return Math.round(annual / 52);
    case "monthly":
      return Math.round(annual / 12);
    case "quarterly":
      return Math.round(annual / 4);
    case "annually":
      return annual;
  }
}

/**
 * Get all frequency representations of an amount
 *
 * @param amount - Amount in cents
 * @param frequency - Current frequency
 * @returns Object with all frequency amounts
 */
export function getAllFrequencies(
  amount: number,
  frequency: ExpenseFrequency
): {
  weekly: number;
  monthly: number;
  quarterly: number;
  annually: number;
} {
  const annual = normalizeToAnnual(amount, frequency);

  return {
    weekly: Math.round(annual / 52),
    monthly: Math.round(annual / 12),
    quarterly: Math.round(annual / 4),
    annually: annual,
  };
}

/**
 * Calculate daily rate from any frequency
 *
 * @param amount - Amount in cents
 * @param frequency - Current frequency
 * @returns Daily amount in cents
 */
export function calculateDailyRate(
  amount: number,
  frequency: ExpenseFrequency
): number {
  return Math.round(amount / DAYS_PER_PERIOD[frequency]);
}

/**
 * Prorate an annual amount for a partial year
 *
 * @param annualAmount - Annual amount in cents
 * @param days - Number of days to prorate for
 * @returns Prorated amount in cents
 */
export function prorateForDays(annualAmount: number, days: number): number {
  return Math.round((annualAmount / 365.25) * days);
}

/**
 * Prorate an annual amount for specific months
 *
 * @param annualAmount - Annual amount in cents
 * @param months - Number of months
 * @returns Prorated amount in cents
 */
export function prorateForMonths(annualAmount: number, months: number): number {
  return Math.round((annualAmount / 12) * months);
}

/**
 * Sum multiple expenses normalized to annual
 */
export function sumExpensesAnnually(
  expenses: { amount: number; frequency: ExpenseFrequency }[]
): number {
  return expenses.reduce((total, expense) => {
    return total + normalizeToAnnual(expense.amount, expense.frequency);
  }, 0);
}

/**
 * Get expense breakdown by frequency
 */
export function getExpenseBreakdown(
  expenses: { amount: number; frequency: ExpenseFrequency; category: string }[]
): {
  byCategory: Record<string, number>;
  total: { weekly: number; monthly: number; annually: number };
} {
  const byCategory: Record<string, number> = {};
  let totalAnnual = 0;

  for (const expense of expenses) {
    const annual = normalizeToAnnual(expense.amount, expense.frequency);
    totalAnnual += annual;

    if (byCategory[expense.category]) {
      byCategory[expense.category] += annual;
    } else {
      byCategory[expense.category] = annual;
    }
  }

  return {
    byCategory,
    total: {
      weekly: Math.round(totalAnnual / 52),
      monthly: Math.round(totalAnnual / 12),
      annually: totalAnnual,
    },
  };
}

/**
 * Format frequency label for display
 */
export function getFrequencyLabel(frequency: ExpenseFrequency): string {
  const labels: Record<ExpenseFrequency, string> = {
    weekly: "per week",
    monthly: "per month",
    quarterly: "per quarter",
    annually: "per year",
  };
  return labels[frequency];
}

/**
 * Get short frequency label
 */
export function getFrequencyShortLabel(frequency: ExpenseFrequency): string {
  const labels: Record<ExpenseFrequency, string> = {
    weekly: "wk",
    monthly: "mo",
    quarterly: "qtr",
    annually: "yr",
  };
  return labels[frequency];
}

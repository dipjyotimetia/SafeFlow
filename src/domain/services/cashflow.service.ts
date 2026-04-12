/**
 * Cashflow Domain Service
 *
 * Pure functions for comprehensive cashflow analysis — aggregates income and
 * expenses across bank transactions, property rental income, and investment
 * dividends into a unified view.
 *
 * All monetary values are in cents (integers) to avoid floating-point issues.
 */

import { Money } from "../value-objects/money";
import type { Transaction, InvestmentTransaction, PropertyRental } from "@/types";

// ============ Types ============

export interface MonthlyCashflowEntry {
  /** Month key in "YYYY-MM" format */
  month: string;
  /** Label for display e.g. "Jan 2026" */
  label: string;
  /** Total income from all sources (cents) */
  income: number;
  /** Total expenses (cents) */
  expenses: number;
  /** Net cashflow = income - expenses (cents) */
  net: number;
  /** Breakdown of income sources */
  incomeSources: {
    salary: number;
    rental: number;
    dividends: number;
    other: number;
  };
  /** Savings rate as percentage */
  savingsRate: number;
}

export interface CashflowTrend {
  /** Direction of trend */
  direction: "improving" | "declining" | "stable";
  /** Average monthly net cashflow (cents) */
  averageNetCashflow: number;
  /** Average monthly income (cents) */
  averageIncome: number;
  /** Average monthly expenses (cents) */
  averageExpenses: number;
  /** Overall savings rate (percentage, 1 decimal) */
  overallSavingsRate: number;
  /** Best month */
  bestMonth: { month: string; net: number } | null;
  /** Worst month */
  worstMonth: { month: string; net: number } | null;
  /** Number of positive (surplus) months */
  surplusMonths: number;
  /** Number of negative (deficit) months */
  deficitMonths: number;
}

export interface CashflowForecast {
  /** Projected monthly entries */
  projections: Array<{
    month: string;
    label: string;
    projectedIncome: number;
    projectedExpenses: number;
    projectedNet: number;
  }>;
  /** Confidence level: based on data consistency */
  confidence: "high" | "medium" | "low";
}

export interface RecurringPattern {
  /** Description or merchant */
  description: string;
  /** Average amount (cents) */
  averageAmount: number;
  /** Detected frequency */
  frequency: "weekly" | "fortnightly" | "monthly" | "quarterly" | "annual";
  /** Transaction type */
  type: "income" | "expense";
  /** How many occurrences detected */
  occurrences: number;
}

export interface CashflowCategorySummary {
  /** Category ID */
  categoryId: string;
  /** Category name */
  categoryName: string;
  /** Total amount (cents) */
  totalAmount: number;
  /** Percentage of total expenses */
  percentage: number;
  /** Transaction count */
  count: number;
  /** Month-over-month change in cents */
  monthOverMonthChange: number;
}

// ============ Core Calculations ============

/**
 * Calculate monthly cashflow entries from transactions.
 *
 * @param transactions - Bank transactions (income/expense/transfer)
 * @param investmentTransactions - Investment transactions (dividends/distributions)
 * @param rentalIncome - Property rental income entries
 * @param categories - Category lookup map (id -> name)
 * @returns Array of monthly cashflow entries sorted chronologically
 */
export function calculateMonthlyCashflow(
  transactions: Transaction[],
  investmentTransactions: InvestmentTransaction[] = [],
  rentalIncome: Array<{ month: string; amount: number }> = [],
  _categories?: Map<string, string>
): MonthlyCashflowEntry[] {
  const monthMap = new Map<
    string,
    {
      income: number;
      expenses: number;
      salary: number;
      rental: number;
      dividends: number;
      otherIncome: number;
    }
  >();

  const ensureMonth = (month: string) => {
    if (!monthMap.has(month)) {
      monthMap.set(month, {
        income: 0,
        expenses: 0,
        salary: 0,
        rental: 0,
        dividends: 0,
        otherIncome: 0,
      });
    }
    return monthMap.get(month)!;
  };

  // Process bank transactions
  for (const tx of transactions) {
    if (tx.type === "transfer") continue; // Transfers are zero-sum

    const date = tx.date instanceof Date ? tx.date : new Date(tx.date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const entry = ensureMonth(month);

    if (tx.type === "income") {
      entry.income += tx.amount;
      // Attempt to classify income type by category or description
      const desc = (tx.description || "").toLowerCase();
      if (
        desc.includes("salary") ||
        desc.includes("wage") ||
        desc.includes("payroll") ||
        desc.includes("pay")
      ) {
        entry.salary += tx.amount;
      } else {
        entry.otherIncome += tx.amount;
      }
    } else if (tx.type === "expense") {
      entry.expenses += tx.amount;
    }
  }

  // Process investment dividends
  for (const tx of investmentTransactions) {
    if (tx.type !== "dividend" && tx.type !== "distribution") continue;

    const date = tx.date instanceof Date ? tx.date : new Date(tx.date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const entry = ensureMonth(month);

    entry.income += tx.totalAmount;
    entry.dividends += tx.totalAmount;
  }

  // Process rental income
  for (const rental of rentalIncome) {
    const entry = ensureMonth(rental.month);
    entry.income += rental.amount;
    entry.rental += rental.amount;
  }

  // Convert to sorted array
  const months = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      const net = data.income - data.expenses;
      const savingsRate =
        data.income > 0
          ? Math.round(((data.income - data.expenses) / data.income) * 1000) / 10
          : 0;

      // Format label
      const [year, m] = month.split("-");
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const label = `${monthNames[parseInt(m, 10) - 1]} ${year}`;

      return {
        month,
        label,
        income: data.income,
        expenses: data.expenses,
        net,
        incomeSources: {
          salary: data.salary,
          rental: data.rental,
          dividends: data.dividends,
          other: data.otherIncome,
        },
        savingsRate,
      };
    });

  return months;
}

/**
 * Analyze the cashflow trend from monthly entries.
 */
export function analyzeCashflowTrend(
  entries: MonthlyCashflowEntry[]
): CashflowTrend {
  if (entries.length === 0) {
    return {
      direction: "stable",
      averageNetCashflow: 0,
      averageIncome: 0,
      averageExpenses: 0,
      overallSavingsRate: 0,
      bestMonth: null,
      worstMonth: null,
      surplusMonths: 0,
      deficitMonths: 0,
    };
  }

  const totalIncome = entries.reduce((sum, e) => sum + e.income, 0);
  const totalExpenses = entries.reduce((sum, e) => sum + e.expenses, 0);
  const totalNet = totalIncome - totalExpenses;
  const count = entries.length;

  const averageIncome = Math.round(totalIncome / count);
  const averageExpenses = Math.round(totalExpenses / count);
  const averageNetCashflow = Math.round(totalNet / count);
  const overallSavingsRate =
    totalIncome > 0
      ? Math.round((totalNet / totalIncome) * 1000) / 10
      : 0;

  // Find best and worst months
  let bestMonth: { month: string; net: number } | null = null;
  let worstMonth: { month: string; net: number } | null = null;
  let surplusMonths = 0;
  let deficitMonths = 0;

  for (const entry of entries) {
    if (entry.net >= 0) surplusMonths++;
    else deficitMonths++;

    if (!bestMonth || entry.net > bestMonth.net) {
      bestMonth = { month: entry.label, net: entry.net };
    }
    if (!worstMonth || entry.net < worstMonth.net) {
      worstMonth = { month: entry.label, net: entry.net };
    }
  }

  // Determine trend direction from the last 3 months vs previous 3
  let direction: "improving" | "declining" | "stable" = "stable";
  if (entries.length >= 6) {
    const recent3 = entries.slice(-3);
    const previous3 = entries.slice(-6, -3);

    const recentAvg =
      recent3.reduce((s, e) => s + e.net, 0) / 3;
    const previousAvg =
      previous3.reduce((s, e) => s + e.net, 0) / 3;

    const changePercent =
      previousAvg !== 0
        ? ((recentAvg - previousAvg) / Math.abs(previousAvg)) * 100
        : 0;

    if (changePercent > 5) direction = "improving";
    else if (changePercent < -5) direction = "declining";
  } else if (entries.length >= 2) {
    const first = entries[0].net;
    const last = entries[entries.length - 1].net;
    if (last > first) direction = "improving";
    else if (last < first) direction = "declining";
  }

  return {
    direction,
    averageNetCashflow,
    averageIncome,
    averageExpenses,
    overallSavingsRate,
    bestMonth,
    worstMonth,
    surplusMonths,
    deficitMonths,
  };
}

/**
 * Generate a simple cashflow forecast based on historical averages.
 *
 * Uses a weighted average (recent months weighted heavier) for more
 * responsive projections.
 *
 * @param entries - Historical monthly cashflow entries (at least 3 recommended)
 * @param monthsToForecast - Number of months to project forward (default 6)
 */
export function forecastCashflow(
  entries: MonthlyCashflowEntry[],
  monthsToForecast: number = 6
): CashflowForecast {
  if (entries.length === 0) {
    return { projections: [], confidence: "low" };
  }

  // Use up to last 6 months with exponential weighting
  const recentEntries = entries.slice(-6);
  let totalWeight = 0;
  let weightedIncome = 0;
  let weightedExpenses = 0;

  recentEntries.forEach((entry, index) => {
    const weight = index + 1; // More recent = higher weight
    weightedIncome += entry.income * weight;
    weightedExpenses += entry.expenses * weight;
    totalWeight += weight;
  });

  const avgIncome = Math.round(weightedIncome / totalWeight);
  const avgExpenses = Math.round(weightedExpenses / totalWeight);

  // Determine confidence
  let confidence: "high" | "medium" | "low" = "low";
  if (entries.length >= 6) {
    // Check variance — if income/expenses are consistent, confidence is higher
    const incomeStdDev = calculateStdDev(recentEntries.map((e) => e.income));
    const incomeCoeffVar = avgIncome > 0 ? incomeStdDev / avgIncome : 1;
    confidence = incomeCoeffVar < 0.15 ? "high" : incomeCoeffVar < 0.3 ? "medium" : "low";
  } else if (entries.length >= 3) {
    confidence = "medium";
  }

  // Generate projections
  const lastEntry = entries[entries.length - 1];
  const [lastYear, lastMonth] = lastEntry.month.split("-").map(Number);
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const projections: CashflowForecast["projections"] = [];

  for (let i = 1; i <= monthsToForecast; i++) {
    const totalMonths = lastMonth - 1 + i; // 0-indexed
    const year = lastYear + Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const label = `${monthNames[month - 1]} ${year}`;

    projections.push({
      month: monthKey,
      label,
      projectedIncome: avgIncome,
      projectedExpenses: avgExpenses,
      projectedNet: avgIncome - avgExpenses,
    });
  }

  return { projections, confidence };
}

/**
 * Detect recurring transaction patterns.
 *
 * Groups transactions by normalized description and detects frequency
 * based on average interval between occurrences.
 */
export function detectRecurringPatterns(
  transactions: Transaction[],
  minOccurrences: number = 3
): RecurringPattern[] {
  // Group by normalized description
  const groups = new Map<
    string,
    Array<{ date: Date; amount: number; type: "income" | "expense" }>
  >();

  for (const tx of transactions) {
    if (tx.type === "transfer") continue;

    const key = (tx.merchantName || tx.description)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push({
      date: tx.date instanceof Date ? tx.date : new Date(tx.date),
      amount: tx.amount,
      type: tx.type as "income" | "expense",
    });
  }

  const patterns: RecurringPattern[] = [];

  for (const [description, occurrences] of groups) {
    if (occurrences.length < minOccurrences) continue;

    // Sort by date
    occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate average interval between occurrences (in days)
    let totalIntervalDays = 0;
    for (let i = 1; i < occurrences.length; i++) {
      const daysDiff =
        (occurrences[i].date.getTime() - occurrences[i - 1].date.getTime()) /
        (1000 * 60 * 60 * 24);
      totalIntervalDays += daysDiff;
    }
    const avgInterval = totalIntervalDays / (occurrences.length - 1);

    // Classify frequency based on average interval
    let frequency: RecurringPattern["frequency"];
    if (avgInterval <= 10) frequency = "weekly";
    else if (avgInterval <= 20) frequency = "fortnightly";
    else if (avgInterval <= 40) frequency = "monthly";
    else if (avgInterval <= 100) frequency = "quarterly";
    else frequency = "annual";

    const avgAmount = Math.round(
      occurrences.reduce((s, o) => s + o.amount, 0) / occurrences.length
    );

    patterns.push({
      description,
      averageAmount: avgAmount,
      frequency,
      type: occurrences[0].type,
      occurrences: occurrences.length,
    });
  }

  // Sort by amount descending
  patterns.sort((a, b) => b.averageAmount - a.averageAmount);

  return patterns;
}

/**
 * Calculate expense breakdown by category with month-over-month change.
 */
export function calculateExpenseBreakdown(
  transactions: Transaction[],
  categories: Map<string, string>,
  currentMonthKey: string,
  previousMonthKey: string
): CashflowCategorySummary[] {
  const currentMonth = new Map<string, { amount: number; count: number }>();
  const previousMonth = new Map<string, { amount: number; count: number }>();

  let totalCurrentExpenses = 0;

  for (const tx of transactions) {
    if (tx.type !== "expense") continue;

    const date = tx.date instanceof Date ? tx.date : new Date(tx.date);
    const txMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const categoryId = tx.categoryId || "uncategorized";

    if (txMonth === currentMonthKey) {
      const existing = currentMonth.get(categoryId) || { amount: 0, count: 0 };
      existing.amount += tx.amount;
      existing.count++;
      currentMonth.set(categoryId, existing);
      totalCurrentExpenses += tx.amount;
    } else if (txMonth === previousMonthKey) {
      const existing = previousMonth.get(categoryId) || { amount: 0, count: 0 };
      existing.amount += tx.amount;
      existing.count++;
      previousMonth.set(categoryId, existing);
    }
  }

  const results: CashflowCategorySummary[] = [];

  for (const [categoryId, data] of currentMonth) {
    const previousData = previousMonth.get(categoryId);
    const monthOverMonthChange = previousData
      ? data.amount - previousData.amount
      : data.amount;

    results.push({
      categoryId,
      categoryName: categories.get(categoryId) || "Uncategorized",
      totalAmount: data.amount,
      percentage:
        totalCurrentExpenses > 0
          ? Math.round((data.amount / totalCurrentExpenses) * 1000) / 10
          : 0,
      count: data.count,
      monthOverMonthChange,
    });
  }

  // Sort by amount descending
  results.sort((a, b) => b.totalAmount - a.totalAmount);

  return results;
}

/**
 * Convert active property rentals into monthly income entries.
 *
 * @param rentals - Active property rentals
 * @param monthKeys - Array of month keys to generate income for
 */
export function convertRentalsToMonthlyIncome(
  rentals: PropertyRental[],
  monthKeys: string[]
): Array<{ month: string; amount: number }> {
  const result: Array<{ month: string; amount: number }> = [];

  // Only consider currently occupied rentals
  const activeRentals = rentals.filter((r) => r.isCurrentlyOccupied);

  for (const month of monthKeys) {
    let monthlyRental = 0;
    for (const rental of activeRentals) {
      // Weekly rent × 52 / 12 = monthly
      monthlyRental += Math.round((rental.weeklyRent * 52) / 12);
    }
    if (monthlyRental > 0) {
      result.push({ month, amount: monthlyRental });
    }
  }

  return result;
}

// ============ Helpers ============

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(variance);
}

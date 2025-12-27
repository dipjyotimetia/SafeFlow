/**
 * Transaction Domain Service
 *
 * Pure functions for transaction-related business logic.
 * Stateless and framework-agnostic - no database access, no side effects.
 */

import { Money } from "../value-objects/money";
import { FinancialYear } from "../value-objects/financial-year";
import type { Transaction, TransactionType, Category } from "@/types";

// ============ Duplicate Detection ============

/**
 * Generate a unique key for duplicate detection
 * Uses account, date, amount, and partial description
 */
export function generateTransactionKey(transaction: {
  accountId: string;
  date: Date | string;
  amount: number;
  description: string;
}): string {
  const date =
    transaction.date instanceof Date
      ? transaction.date
      : new Date(transaction.date);
  const dateStr = date.toISOString().split("T")[0];
  const descTruncated = transaction.description.substring(0, 50);

  return `${transaction.accountId}_${dateStr}_${transaction.amount}_${descTruncated}`;
}

/**
 * Find duplicate transactions from a list
 * @returns Set of keys for existing transactions
 */
export function createDuplicateKeySet(transactions: Transaction[]): Set<string> {
  const keys = new Set<string>();

  for (const tx of transactions) {
    keys.add(generateTransactionKey(tx));
  }

  return keys;
}

/**
 * Filter out duplicate transactions from import batch
 */
export function filterDuplicates<
  T extends {
    accountId: string;
    date: Date | string;
    amount: number;
    description: string;
  },
>(
  incoming: T[],
  existingKeys: Set<string>
): { unique: T[]; duplicates: T[] } {
  const unique: T[] = [];
  const duplicates: T[] = [];

  for (const tx of incoming) {
    const key = generateTransactionKey(tx);
    if (existingKeys.has(key)) {
      duplicates.push(tx);
    } else {
      unique.push(tx);
      existingKeys.add(key); // Prevent duplicates within the batch
    }
  }

  return { unique, duplicates };
}

// ============ Categorization ============

/**
 * Group transactions by category
 */
export function groupByCategory(
  transactions: Transaction[]
): Map<string | undefined, Transaction[]> {
  const groups = new Map<string | undefined, Transaction[]>();

  for (const tx of transactions) {
    const key = tx.categoryId;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tx);
  }

  return groups;
}

/**
 * Calculate spending breakdown by category
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[]
): CategoryBreakdown[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  let grandTotal = 0;

  // Sum expenses by category
  for (const tx of transactions) {
    if (tx.type === "expense" && tx.categoryId) {
      const current = totals.get(tx.categoryId) || 0;
      totals.set(tx.categoryId, current + tx.amount);
      grandTotal += tx.amount;
    }
  }

  // Build breakdown with percentages
  const breakdown: CategoryBreakdown[] = [];

  for (const [categoryId, amount] of totals) {
    const category = categoryMap.get(categoryId);
    breakdown.push({
      categoryId,
      categoryName: category?.name || "Uncategorized",
      color: category?.color,
      amount: Money.fromCents(amount),
      percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
      transactionCount: transactions.filter(
        (tx) => tx.categoryId === categoryId && tx.type === "expense"
      ).length,
    });
  }

  // Sort by amount descending
  breakdown.sort((a, b) => b.amount.cents - a.amount.cents);

  return breakdown;
}

// ============ Time-based Analysis ============

/**
 * Group transactions by month
 */
export function groupByMonth(
  transactions: Transaction[]
): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const date = tx.date instanceof Date ? tx.date : new Date(tx.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tx);
  }

  return groups;
}

/**
 * Calculate monthly totals for income and expenses
 */
export function calculateMonthlyTotals(
  transactions: Transaction[]
): MonthlyTotal[] {
  const monthlyGroups = groupByMonth(transactions);
  const totals: MonthlyTotal[] = [];

  for (const [month, txs] of monthlyGroups) {
    let income = 0;
    let expenses = 0;

    for (const tx of txs) {
      if (tx.type === "income") {
        income += tx.amount;
      } else if (tx.type === "expense") {
        expenses += tx.amount;
      }
    }

    totals.push({
      month,
      income: Money.fromCents(income),
      expenses: Money.fromCents(expenses),
      net: Money.fromCents(income - expenses),
    });
  }

  // Sort by month chronologically
  totals.sort((a, b) => a.month.localeCompare(b.month));

  return totals;
}

/**
 * Get transactions for a specific financial year
 */
export function filterByFinancialYear(
  transactions: Transaction[],
  fy: FinancialYear
): Transaction[] {
  return transactions.filter((tx) => {
    const date = tx.date instanceof Date ? tx.date : new Date(tx.date);
    return fy.contains(date);
  });
}

// ============ Cashflow Analysis ============

/**
 * Calculate cashflow summary
 */
export function calculateCashflow(transactions: Transaction[]): CashflowSummary {
  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const tx of transactions) {
    if (tx.type === "income") {
      totalIncome += tx.amount;
      incomeCount++;
    } else if (tx.type === "expense") {
      totalExpenses += tx.amount;
      expenseCount++;
    }
  }

  const netCashflow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netCashflow / totalIncome) * 100 : 0;

  return {
    totalIncome: Money.fromCents(totalIncome),
    totalExpenses: Money.fromCents(totalExpenses),
    netCashflow: Money.fromCents(netCashflow),
    savingsRate: Math.round(savingsRate * 10) / 10, // 1 decimal place
    incomeTransactionCount: incomeCount,
    expenseTransactionCount: expenseCount,
  };
}

// ============ Validation ============

export interface TransactionValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate transaction data
 */
export function validateTransactionData(data: {
  accountId?: string;
  type?: TransactionType;
  amount?: number;
  description?: string;
  date?: Date;
  transferToAccountId?: string;
}): TransactionValidationResult {
  const errors: string[] = [];

  if (data.accountId !== undefined && !data.accountId.trim()) {
    errors.push("Account ID is required");
  }

  if (data.type !== undefined && !isValidTransactionType(data.type)) {
    errors.push(`Invalid transaction type: ${data.type}`);
  }

  if (data.amount !== undefined) {
    if (!Number.isInteger(data.amount)) {
      errors.push("Amount must be an integer (cents)");
    }
    if (data.amount < 0) {
      errors.push("Amount cannot be negative");
    }
  }

  if (data.description !== undefined) {
    if (!data.description.trim()) {
      errors.push("Description is required");
    } else if (data.description.length > 500) {
      errors.push("Description must be 500 characters or less");
    }
  }

  if (data.date !== undefined && !(data.date instanceof Date)) {
    errors.push("Date must be a valid Date object");
  }

  // Transfer-specific validations
  if (data.type === "transfer") {
    if (!data.transferToAccountId) {
      errors.push("Transfer transactions require a destination account");
    }
    if (
      data.transferToAccountId &&
      data.accountId &&
      data.transferToAccountId === data.accountId
    ) {
      errors.push("Cannot transfer to the same account");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a string is a valid transaction type
 */
export function isValidTransactionType(type: string): type is TransactionType {
  return ["income", "expense", "transfer"].includes(type);
}

// ============ Merchant Analysis ============

/**
 * Get top merchants by spend
 */
export function getTopMerchants(
  transactions: Transaction[],
  limit: number = 10
): MerchantSummary[] {
  const merchantTotals = new Map<string, { amount: number; count: number }>();

  for (const tx of transactions) {
    if (tx.type === "expense" && tx.merchantName) {
      const current = merchantTotals.get(tx.merchantName) || {
        amount: 0,
        count: 0,
      };
      merchantTotals.set(tx.merchantName, {
        amount: current.amount + tx.amount,
        count: current.count + 1,
      });
    }
  }

  const summaries: MerchantSummary[] = [];

  for (const [merchantName, data] of merchantTotals) {
    summaries.push({
      merchantName,
      totalSpend: Money.fromCents(data.amount),
      transactionCount: data.count,
      averageTransaction: Money.fromCents(Math.round(data.amount / data.count)),
    });
  }

  // Sort by total spend descending
  summaries.sort((a, b) => b.totalSpend.cents - a.totalSpend.cents);

  return summaries.slice(0, limit);
}

// ============ Types ============

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  color?: string;
  amount: Money;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyTotal {
  month: string; // "YYYY-MM"
  income: Money;
  expenses: Money;
  net: Money;
}

export interface CashflowSummary {
  totalIncome: Money;
  totalExpenses: Money;
  netCashflow: Money;
  savingsRate: number; // Percentage
  incomeTransactionCount: number;
  expenseTransactionCount: number;
}

export interface MerchantSummary {
  merchantName: string;
  totalSpend: Money;
  transactionCount: number;
  averageTransaction: Money;
}

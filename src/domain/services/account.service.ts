/**
 * Account Domain Service
 *
 * Pure functions for account-related business logic.
 * Stateless and framework-agnostic - no database access, no side effects.
 */

import { Money } from "../value-objects/money";
import type { Account, AccountType, Transaction } from "@/types";

// ============ Balance Calculations ============

/**
 * Calculate account balance from a list of transactions
 * @param transactions List of transactions for the account
 * @returns Total balance as Money
 */
export function calculateBalance(transactions: Transaction[]): Money {
  let totalCents = 0;

  for (const tx of transactions) {
    if (tx.type === "income") {
      totalCents += tx.amount;
    } else if (tx.type === "expense") {
      totalCents -= tx.amount;
    }
    // Transfers are handled separately at account level
  }

  return Money.fromCents(totalCents);
}

/**
 * Calculate the balance change from a transaction
 * @param type Transaction type
 * @param amount Amount in cents
 * @returns Balance change (positive = increase, negative = decrease)
 */
export function calculateBalanceChange(
  type: Transaction["type"],
  amount: number
): number {
  switch (type) {
    case "income":
      return amount;
    case "expense":
      return -amount;
    case "transfer":
      return -amount; // From source account perspective
    default:
      return 0;
  }
}

/**
 * Calculate the reverse balance change (for deletions/reversals)
 * @param type Transaction type
 * @param amount Amount in cents
 * @returns Reverse balance change
 */
export function calculateReverseBalanceChange(
  type: Transaction["type"],
  amount: number
): number {
  return -calculateBalanceChange(type, amount);
}

// ============ Validation ============

export interface AccountValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate account data for creation/update
 */
export function validateAccountData(
  data: Partial<Account>
): AccountValidationResult {
  const errors: string[] = [];

  if (data.name !== undefined) {
    if (!data.name.trim()) {
      errors.push("Account name is required");
    } else if (data.name.length > 100) {
      errors.push("Account name must be 100 characters or less");
    }
  }

  if (data.type !== undefined && !isValidAccountType(data.type)) {
    errors.push(`Invalid account type: ${data.type}`);
  }

  if (data.balance !== undefined) {
    if (!Number.isInteger(data.balance)) {
      errors.push("Balance must be an integer (cents)");
    }
  }

  if (data.institution !== undefined && data.institution.length > 100) {
    errors.push("Institution name must be 100 characters or less");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a string is a valid account type
 */
export function isValidAccountType(type: string): type is AccountType {
  const validTypes: AccountType[] = [
    "bank",
    "credit",
    "investment",
    "crypto",
    "cash",
    "asset",
    "liability",
  ];
  return validTypes.includes(type as AccountType);
}

// ============ Business Rules ============

/**
 * Check if account can be deleted based on business rules
 * @param transactions Transactions for this account
 * @param options Deletion options
 */
export function canDeleteAccount(
  transactions: Transaction[],
  options: { requireAllReconciled?: boolean } = {}
): { canDelete: boolean; reason?: string } {
  const { requireAllReconciled = false } = options;

  if (requireAllReconciled) {
    const hasUnreconciled = transactions.some((tx) => !tx.isReconciled);
    if (hasUnreconciled) {
      return {
        canDelete: false,
        reason: "Account has unreconciled transactions",
      };
    }
  }

  return { canDelete: true };
}

/**
 * Get a summary of account activity
 */
export function getAccountSummary(transactions: Transaction[]): AccountSummary {
  let totalIncome = 0;
  let totalExpenses = 0;
  let transactionCount = 0;

  for (const tx of transactions) {
    transactionCount++;
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else if (tx.type === "expense") {
      totalExpenses += tx.amount;
    }
  }

  return {
    totalIncome: Money.fromCents(totalIncome),
    totalExpenses: Money.fromCents(totalExpenses),
    netCashflow: Money.fromCents(totalIncome - totalExpenses),
    transactionCount,
  };
}

/**
 * Calculate savings rate (income - expenses) / income
 * @returns Savings rate as percentage (0-100) or null if no income
 */
export function calculateSavingsRate(
  totalIncome: number,
  totalExpenses: number
): number | null {
  if (totalIncome <= 0) return null;
  const savings = totalIncome - totalExpenses;
  return Math.round((savings / totalIncome) * 100);
}

// ============ Account Type Helpers ============

/**
 * Check if account type contributes positively to net worth
 */
export function isAssetAccount(type: AccountType): boolean {
  return ["bank", "investment", "crypto", "cash", "asset"].includes(type);
}

/**
 * Check if account type is a liability (reduces net worth)
 */
export function isLiabilityAccount(type: AccountType): boolean {
  return ["credit", "liability"].includes(type);
}

/**
 * Get display category for account type
 */
export function getAccountTypeCategory(type: AccountType): AccountCategory {
  switch (type) {
    case "bank":
    case "cash":
      return "cash";
    case "investment":
    case "crypto":
      return "investments";
    case "credit":
    case "liability":
      return "liabilities";
    case "asset":
      return "assets";
    default:
      return "other";
  }
}

/**
 * Get icon name for account type (for UI)
 */
export function getAccountTypeIcon(type: AccountType): string {
  switch (type) {
    case "bank":
      return "building-columns";
    case "credit":
      return "credit-card";
    case "investment":
      return "chart-line";
    case "crypto":
      return "bitcoin";
    case "cash":
      return "wallet";
    case "asset":
      return "home";
    case "liability":
      return "receipt";
    default:
      return "circle-dollar-sign";
  }
}

// ============ Types ============

export interface AccountSummary {
  totalIncome: Money;
  totalExpenses: Money;
  netCashflow: Money;
  transactionCount: number;
}

export type AccountCategory =
  | "cash"
  | "investments"
  | "liabilities"
  | "assets"
  | "other";

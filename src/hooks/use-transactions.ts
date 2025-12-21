"use client";

import { db } from "@/lib/db";
import type { FilterOptions, Transaction, TransactionType } from "@/types";
import { subMonths } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useDeferredValue } from "react";

interface UseTransactionsOptions extends FilterOptions {
  limit?: number;
  offset?: number;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const {
    accountId,
    categoryId,
    type,
    dateRange,
    searchQuery,
    isDeductible,
    memberId,
    limit,
    offset,
  } = options;

  // Defer search query to avoid blocking UI while typing
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const transactions = useLiveQuery(async () => {
    let results: Transaction[];

    // Use indexed queries based on filter combination for optimal performance
    // Priority: compound indexes > single indexes > full scan
    if (accountId && dateRange) {
      // Use compound index [accountId+date]
      results = await db.transactions
        .where("[accountId+date]")
        .between(
          [accountId, dateRange.from],
          [accountId, dateRange.to],
          true,
          true
        )
        .reverse()
        .toArray();
    } else if (categoryId && dateRange) {
      // Use compound index [categoryId+date]
      results = await db.transactions
        .where("[categoryId+date]")
        .between(
          [categoryId, dateRange.from],
          [categoryId, dateRange.to],
          true,
          true
        )
        .reverse()
        .toArray();
    } else if (type && dateRange) {
      // Use compound index [type+date]
      results = await db.transactions
        .where("[type+date]")
        .between([type, dateRange.from], [type, dateRange.to], true, true)
        .reverse()
        .toArray();
    } else if (memberId && dateRange) {
      // Use compound index [memberId+date]
      results = await db.transactions
        .where("[memberId+date]")
        .between(
          [memberId, dateRange.from],
          [memberId, dateRange.to],
          true,
          true
        )
        .reverse()
        .toArray();
    } else if (dateRange) {
      // Use date index
      results = await db.transactions
        .where("date")
        .between(dateRange.from, dateRange.to, true, true)
        .reverse()
        .toArray();
    } else if (accountId) {
      // Use accountId index
      results = await db.transactions
        .where("accountId")
        .equals(accountId)
        .reverse()
        .toArray();
    } else if (categoryId) {
      // Use categoryId index
      results = await db.transactions
        .where("categoryId")
        .equals(categoryId)
        .reverse()
        .toArray();
    } else if (type) {
      // Use type index
      results = await db.transactions
        .where("type")
        .equals(type)
        .reverse()
        .toArray();
    } else {
      // No specific filter - get all ordered by date
      results = await db.transactions.orderBy("date").reverse().toArray();
    }

    // Determine which filter was used in the indexed query to avoid re-filtering
    const usedAccountIdIndex = accountId && dateRange;
    const usedCategoryIdIndex = categoryId && dateRange && !accountId;
    const usedTypeIndex = type && dateRange && !accountId && !categoryId;
    const usedMemberIdIndex = memberId && dateRange && !accountId && !categoryId && !type;
    const usedSingleAccountId = accountId && !dateRange && !categoryId && !type;
    const usedSingleCategoryId = categoryId && !dateRange && !accountId && !type;
    const usedSingleType = type && !dateRange && !accountId && !categoryId;

    // Apply accountId filter if not already filtered by index
    if (accountId && !usedAccountIdIndex && !usedSingleAccountId) {
      results = results.filter((t) => t.accountId === accountId);
    }

    // Apply categoryId filter if not already filtered by index
    if (categoryId && !usedCategoryIdIndex && !usedSingleCategoryId) {
      results = results.filter((t) => t.categoryId === categoryId);
    }

    // Apply type filter if not already filtered by index
    if (type && !usedTypeIndex && !usedSingleType) {
      results = results.filter((t) => t.type === type);
    }

    // Apply isDeductible filter (never indexed)
    if (isDeductible !== undefined) {
      results = results.filter((t) => t.isDeductible === isDeductible);
    }

    // Apply memberId filter - show transactions belonging to member OR from shared accounts
    // This is complex because it also checks account visibility
    if (memberId && !usedMemberIdIndex) {
      // Get accounts to check visibility
      const accounts = await db.accounts.toArray();
      const accountMap = new Map(accounts.map((a) => [a.id, a]));

      results = results.filter((t) => {
        // Transaction explicitly belongs to this member
        if (t.memberId === memberId) return true;

        // Transaction belongs to a shared account (no member assigned)
        const account = accountMap.get(t.accountId);
        if (account && !account.memberId && account.visibility !== "private") {
          return true;
        }

        // Transaction has no member and account has no member (legacy data)
        if (!t.memberId && account && !account.memberId) {
          return true;
        }

        return false;
      });
    }

    // Search query filter (can't be indexed - text search)
    if (deferredSearchQuery) {
      const query = deferredSearchQuery.toLowerCase();
      results = results.filter(
        (t) =>
          t.description.toLowerCase().includes(query) ||
          t.merchantName?.toLowerCase().includes(query) ||
          t.notes?.toLowerCase().includes(query)
      );
    }

    // Apply pagination
    if (offset || limit) {
      const start = offset || 0;
      const end = limit ? start + limit : undefined;
      results = results.slice(start, end);
    }

    return results;
  }, [
    accountId,
    categoryId,
    type,
    dateRange?.from,
    dateRange?.to,
    deferredSearchQuery,
    isDeductible,
    memberId,
    limit,
    offset,
  ]);

  return {
    transactions: transactions ?? [],
    isLoading: transactions === undefined,
  };
}

export function useTransaction(id: string | null) {
  const transaction = useLiveQuery(async () => {
    if (!id) return null;
    return db.transactions.get(id);
  }, [id]);

  return {
    transaction: transaction ?? null,
    isLoading: transaction === undefined,
  };
}

export function useRecentTransactions(limit: number = 10) {
  const transactions = useLiveQuery(async () => {
    return db.transactions.orderBy("date").reverse().limit(limit).toArray();
  }, [limit]);

  return {
    transactions: transactions ?? [],
    isLoading: transactions === undefined,
  };
}

// Helper to extract year-month as a single number for comparison
const getYearMonth = (d: Date) => d.getFullYear() * 12 + d.getMonth();

/**
 * Safely parse transaction date, handling both Date objects and ISO strings
 * Returns epoch (0) for invalid dates which can be filtered out
 */
const parseTransactionDate = (date: Date | string | unknown): Date => {
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }
  if (typeof date === "string") {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  console.warn("[parseTransactionDate] Invalid date:", date);
  return new Date(0); // Return epoch as fallback
};

export function useCashflow(months: number = 6) {
  const cashflow = useLiveQuery(async () => {
    const now = new Date();
    const monthsData = [];

    // Calculate date range for the query
    const startDate = subMonths(now, months - 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Use indexed date query instead of loading all transactions
    const relevantTransactions = await db.transactions
      .where("date")
      .aboveOrEqual(startDate)
      .toArray();

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const targetYearMonth = getYearMonth(monthDate);

      // Filter transactions by year-month to avoid timezone/time issues
      const transactions = relevantTransactions.filter((t) => {
        const txDate = parseTransactionDate(t.date);
        // Skip invalid dates (epoch fallback)
        if (txDate.getTime() === 0) return false;
        return getYearMonth(txDate) === targetYearMonth;
      });

      const income = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      monthsData.push({
        month: monthDate.toLocaleString("default", { month: "short" }),
        year: monthDate.getFullYear(),
        income,
        expenses,
        net: income - expenses,
      });
    }

    return monthsData;
  }, [months]);

  return {
    cashflow: cashflow ?? [],
    isLoading: cashflow === undefined,
  };
}

export function useMonthlyTotals() {
  const totals = useLiveQuery(async () => {
    const now = new Date();
    const currentYearMonth = getYearMonth(now);

    // Calculate start of current month for indexed query
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Use indexed date query instead of loading all transactions
    const monthTransactions = await db.transactions
      .where("date")
      .between(startOfMonth, endOfMonth, true, true)
      .toArray();

    // Filter for valid dates (handles format inconsistencies)
    const transactions = monthTransactions.filter((t) => {
      const txDate = parseTransactionDate(t.date);
      if (txDate.getTime() === 0) return false;
      return getYearMonth(txDate) === currentYearMonth;
    });

    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expenses,
      net: income - expenses,
      transactionCount: transactions.length,
    };
  }, []);

  return {
    totals: totals ?? { income: 0, expenses: 0, net: 0, transactionCount: 0 },
    isLoading: totals === undefined,
  };
}

export function useCategoryBreakdown(
  type: TransactionType = "expense",
  months: number = 1
) {
  const breakdown = useLiveQuery(async () => {
    const now = new Date();
    const currentYearMonth = getYearMonth(now);
    // Calculate the starting year-month (months back from current)
    const startYearMonth = currentYearMonth - (months - 1);

    // Calculate date range for indexed query
    const startDate = subMonths(now, months - 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Use compound index [type+date] for optimal performance
    const typeTransactions = await db.transactions
      .where("[type+date]")
      .between([type, startDate], [type, now], true, true)
      .toArray();

    // Filter for valid dates (handles format inconsistencies)
    const transactions = typeTransactions.filter((t) => {
      const txDate = parseTransactionDate(t.date);
      if (txDate.getTime() === 0) return false;
      const txYearMonth = getYearMonth(txDate);
      return txYearMonth >= startYearMonth && txYearMonth <= currentYearMonth;
    });

    const categories = await db.categories.toArray();
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const byCategory = transactions.reduce(
      (acc, t) => {
        const categoryId = t.categoryId || "uncategorized";
        acc[categoryId] = (acc[categoryId] || 0) + t.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(byCategory)
      .map(([categoryId, amount]) => {
        const category = categoryMap.get(categoryId);
        return {
          categoryId,
          categoryName: category?.name || "Uncategorized",
          icon: category?.icon,
          color: category?.color,
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [type, months]);

  return {
    breakdown: breakdown ?? [],
    isLoading: breakdown === undefined,
  };
}

'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Transaction, TransactionType, FilterOptions } from '@/types';
import { subMonths } from 'date-fns';

interface UseTransactionsOptions extends FilterOptions {
  limit?: number;
  offset?: number;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const { accountId, categoryId, type, dateRange, searchQuery, isDeductible, limit, offset } = options;

  const transactions = useLiveQuery(async () => {
    let results = await db.transactions.orderBy('date').reverse().toArray();

    // Apply filters
    if (accountId) {
      results = results.filter((t) => t.accountId === accountId);
    }

    if (categoryId) {
      results = results.filter((t) => t.categoryId === categoryId);
    }

    if (type) {
      results = results.filter((t) => t.type === type);
    }

    if (dateRange) {
      results = results.filter((t) => t.date >= dateRange.from && t.date <= dateRange.to);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (t) =>
          t.description.toLowerCase().includes(query) ||
          t.merchantName?.toLowerCase().includes(query) ||
          t.notes?.toLowerCase().includes(query)
      );
    }

    if (isDeductible !== undefined) {
      results = results.filter((t) => t.isDeductible === isDeductible);
    }

    // Apply pagination
    if (offset || limit) {
      const start = offset || 0;
      const end = limit ? start + limit : undefined;
      results = results.slice(start, end);
    }

    return results;
  }, [accountId, categoryId, type, dateRange?.from, dateRange?.to, searchQuery, isDeductible, limit, offset]);

  return {
    transactions: transactions ?? [],
    isLoading: transactions === undefined,
  };
}

export function useTransaction(id: string | null) {
  const transaction = useLiveQuery(
    async () => {
      if (!id) return null;
      return db.transactions.get(id);
    },
    [id]
  );

  return {
    transaction: transaction ?? null,
    isLoading: transaction === undefined,
  };
}

export function useRecentTransactions(limit: number = 10) {
  const transactions = useLiveQuery(async () => {
    return db.transactions.orderBy('date').reverse().limit(limit).toArray();
  }, [limit]);

  return {
    transactions: transactions ?? [],
    isLoading: transactions === undefined,
  };
}

// Helper to extract year-month as a single number for comparison
const getYearMonth = (d: Date) => d.getFullYear() * 12 + d.getMonth();

export function useCashflow(months: number = 6) {
  const cashflow = useLiveQuery(async () => {
    const now = new Date();
    const monthsData = [];

    // Get all transactions once and filter in memory
    // This handles inconsistent date storage formats
    const allTransactions = await db.transactions.toArray();

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const targetYearMonth = getYearMonth(monthDate);

      // Filter transactions by year-month to avoid timezone/time issues
      const transactions = allTransactions.filter((t) => {
        const txDate = t.date instanceof Date ? t.date : new Date(t.date);
        return getYearMonth(txDate) === targetYearMonth;
      });

      const income = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      monthsData.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
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

    // Get all transactions and filter in memory to handle date format inconsistencies
    const allTransactions = await db.transactions.toArray();
    const transactions = allTransactions.filter((t) => {
      const txDate = t.date instanceof Date ? t.date : new Date(t.date);
      return getYearMonth(txDate) === currentYearMonth;
    });

    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter((t) => t.type === 'expense')
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

export function useCategoryBreakdown(type: TransactionType = 'expense', months: number = 1) {
  const breakdown = useLiveQuery(async () => {
    const now = new Date();
    const currentYearMonth = getYearMonth(now);
    // Calculate the starting year-month (months back from current)
    const startYearMonth = currentYearMonth - (months - 1);

    // Get all transactions and filter in memory to handle date format inconsistencies
    const allTransactions = await db.transactions.toArray();
    const transactions = allTransactions.filter((t) => {
      if (t.type !== type) return false;
      const txDate = t.date instanceof Date ? t.date : new Date(t.date);
      const txYearMonth = getYearMonth(txDate);
      return txYearMonth >= startYearMonth && txYearMonth <= currentYearMonth;
    });

    const categories = await db.categories.toArray();
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const byCategory = transactions.reduce(
      (acc, t) => {
        const categoryId = t.categoryId || 'uncategorized';
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
          categoryName: category?.name || 'Uncategorized',
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

'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Transaction, TransactionType, FilterOptions } from '@/types';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

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

export function useCashflow(months: number = 6) {
  const cashflow = useLiveQuery(async () => {
    const now = new Date();
    const monthsData = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      const transactions = await db.transactions
        .where('date')
        .between(start, end, true, true)
        .toArray();

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
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const transactions = await db.transactions
      .where('date')
      .between(start, end, true, true)
      .toArray();

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
    const start = startOfMonth(subMonths(now, months - 1));
    const end = endOfMonth(now);

    const transactions = await db.transactions
      .where('date')
      .between(start, end, true, true)
      .filter((t) => t.type === type)
      .toArray();

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

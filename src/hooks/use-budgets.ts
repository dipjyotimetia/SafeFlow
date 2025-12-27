'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { BudgetProgress, BudgetPeriod } from '@/types';

interface UseBudgetsOptions {
  activeOnly?: boolean;
  memberId?: string;
}

/**
 * Get all budgets with optional filtering
 */
export function useBudgets(options: UseBudgetsOptions = {}) {
  const { activeOnly = true, memberId } = options;

  const budgets = useLiveQuery(async () => {
    let query = db.budgets.toCollection();

    if (activeOnly) {
      query = query.filter((b) => b.isActive);
    }

    if (memberId) {
      query = query.filter((b) => b.memberId === memberId || !b.memberId);
    }

    return query.sortBy('name');
  }, [activeOnly, memberId]);

  return {
    budgets: budgets ?? [],
    isLoading: budgets === undefined,
  };
}

/**
 * Get a single budget by ID
 */
export function useBudget(id: string | null) {
  const budget = useLiveQuery(
    async () => {
      if (!id) return null;
      return db.budgets.get(id);
    },
    [id]
  );

  return {
    budget: budget ?? null,
    isLoading: budget === undefined,
  };
}

/**
 * Calculate period dates for a given budget period
 */
function getPeriodDates(period: BudgetPeriod): { start: Date; end: Date } {
  const now = new Date();

  if (period === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  // Yearly - use Australian financial year (July 1 - June 30)
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const start = new Date(year, 6, 1); // July 1
  const end = new Date(year + 1, 5, 30, 23, 59, 59, 999); // June 30
  return { start, end };
}

/**
 * Get budget progress with spent amount calculation
 */
export function useBudgetProgress(budgetId: string | null) {
  const progress = useLiveQuery(
    async () => {
      if (!budgetId) return null;

      const budget = await db.budgets.get(budgetId);
      if (!budget) return null;

      const { start, end } = getPeriodDates(budget.period);

      // Get transactions for the period
      let query = db.transactions
        .where('date')
        .between(start, end, true, true)
        .filter((t) => t.type === 'expense');

      // Filter by category if specified
      if (budget.categoryId) {
        query = query.filter((t) => t.categoryId === budget.categoryId);
      }

      // Filter by member if specified
      if (budget.memberId) {
        query = query.filter((t) => t.memberId === budget.memberId);
      }

      const transactions = await query.toArray();
      const spent = transactions.reduce((sum, t) => sum + (t.amount ?? 0), 0);
      const remaining = budget.amount - spent;
      // Round to 2 decimal places for consistent display
      const percentUsed = budget.amount > 0
        ? Math.round((spent / budget.amount) * 10000) / 100
        : 0;

      return {
        budget,
        spent,
        remaining,
        percentUsed,
        isOverBudget: spent > budget.amount,
        periodStart: start,
        periodEnd: end,
      } as BudgetProgress;
    },
    [budgetId]
  );

  return {
    progress: progress ?? null,
    isLoading: progress === undefined,
  };
}

/**
 * Get progress for all active budgets
 * Optimized: loads all transactions once and filters in-memory to avoid N+1 queries
 */
export function useAllBudgetProgress(memberId?: string) {
  const allProgress = useLiveQuery(
    async () => {
      let budgets = await db.budgets.filter((b) => b.isActive).toArray();

      // Filter by member if specified
      if (memberId) {
        budgets = budgets.filter((b) => b.memberId === memberId || !b.memberId);
      }

      if (budgets.length === 0) {
        return [];
      }

      // Calculate overall date range needed (considering both monthly and yearly periods)
      const periodRanges = budgets.map((b) => getPeriodDates(b.period));
      const minStart = new Date(Math.min(...periodRanges.map((r) => r.start.getTime())));
      const maxEnd = new Date(Math.max(...periodRanges.map((r) => r.end.getTime())));

      // Load ALL expense transactions in the date range ONCE (fixes N+1 query issue)
      const allTransactions = await db.transactions
        .where('date')
        .between(minStart, maxEnd, true, true)
        .filter((t) => t.type === 'expense')
        .toArray();

      // Calculate progress for each budget by filtering in-memory
      const progressList: BudgetProgress[] = budgets.map((budget) => {
        const { start, end } = getPeriodDates(budget.period);

        // Filter transactions for this budget's period, category, and member
        const matchingTransactions = allTransactions.filter((t) => {
          // Check date range
          const txDate = t.date;
          if (txDate < start || txDate > end) return false;

          // Check category if specified
          if (budget.categoryId && t.categoryId !== budget.categoryId) return false;

          // Check member if specified
          if (budget.memberId && t.memberId !== budget.memberId) return false;

          return true;
        });

        const spent = matchingTransactions.reduce((sum, t) => sum + (t.amount ?? 0), 0);
        const remaining = budget.amount - spent;
        // Round to 2 decimal places for consistent display
        const percentUsed = budget.amount > 0
          ? Math.round((spent / budget.amount) * 10000) / 100
          : 0;

        return {
          budget,
          spent,
          remaining,
          percentUsed,
          isOverBudget: spent > budget.amount,
          periodStart: start,
          periodEnd: end,
        };
      });

      return progressList;
    },
    [memberId]
  );

  return {
    progress: allProgress ?? [],
    isLoading: allProgress === undefined,
  };
}

/**
 * Get spending by category for a given period (for budget creation)
 */
export function useCategorySpending(period: BudgetPeriod = 'monthly') {
  const spending = useLiveQuery(
    async () => {
      const { start, end } = getPeriodDates(period);

      const transactions = await db.transactions
        .where('date')
        .between(start, end, true, true)
        .filter((t) => t.type === 'expense')
        .toArray();

      const categories = await db.categories.filter((c) => c.isActive).toArray();
      const categoryMap = new Map(categories.map((c) => [c.id, c]));

      // Group by category
      const byCategory = new Map<string, { categoryId: string; categoryName: string; amount: number; count: number }>();

      for (const t of transactions) {
        const categoryId = t.categoryId || 'uncategorized';
        const category = categoryMap.get(categoryId);
        const existing = byCategory.get(categoryId) || {
          categoryId,
          categoryName: category?.name || 'Uncategorized',
          amount: 0,
          count: 0,
        };
        existing.amount += t.amount ?? 0;
        existing.count += 1;
        byCategory.set(categoryId, existing);
      }

      return Array.from(byCategory.values()).sort((a, b) => b.amount - a.amount);
    },
    [period]
  );

  return {
    spending: spending ?? [],
    isLoading: spending === undefined,
  };
}

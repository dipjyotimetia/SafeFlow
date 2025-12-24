'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Holding, HoldingType, PriceHistoryEntry } from '@/types';

/**
 * Get all holdings
 */
export function useHoldings(filters?: { accountId?: string; type?: HoldingType }) {
  const holdings = useLiveQuery(async () => {
    let collection = db.holdings.toCollection();

    if (filters?.accountId) {
      collection = db.holdings.where('accountId').equals(filters.accountId);
    }

    let results = await collection.toArray();

    if (filters?.type) {
      results = results.filter((h) => h.type === filters.type);
    }

    // Sort by current value (descending)
    return results.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
  }, [filters?.accountId, filters?.type]);

  return {
    holdings: holdings || [],
    isLoading: holdings === undefined,
  };
}

/**
 * Get a single holding by ID
 */
export function useHolding(id: string | undefined) {
  const holding = useLiveQuery(
    async () => (id ? db.holdings.get(id) : undefined),
    [id]
  );

  return {
    holding,
    isLoading: holding === undefined && id !== undefined,
  };
}

/**
 * Get portfolio summary
 */
export function usePortfolioSummary() {
  const summary = useLiveQuery(async () => {
    const holdings = await db.holdings.toArray();

    let totalValue = 0;
    let totalCostBasis = 0;
    let totalGainLoss = 0;

    for (const holding of holdings) {
      const value = holding.currentValue || 0;
      const costBasis = holding.costBasis || 0;

      totalValue += value;
      totalCostBasis += costBasis;
      totalGainLoss += value - costBasis;
    }

    // Round to 2 decimal places for consistent display
    const gainLossPercent = totalCostBasis > 0
      ? Math.round((totalGainLoss / totalCostBasis) * 10000) / 100
      : 0;

    return {
      totalValue,
      totalCostBasis,
      totalGainLoss,
      gainLossPercent,
      holdingCount: holdings.length,
    };
  }, []);

  return {
    summary: summary || {
      totalValue: 0,
      totalCostBasis: 0,
      totalGainLoss: 0,
      gainLossPercent: 0,
      holdingCount: 0,
    },
    isLoading: summary === undefined,
  };
}

/**
 * Get holdings grouped by type
 */
export function useHoldingsByType() {
  const grouped = useLiveQuery(async () => {
    const holdings = await db.holdings.toArray();

    const groups: Record<HoldingType, { holdings: Holding[]; totalValue: number }> = {
      etf: { holdings: [], totalValue: 0 },
      stock: { holdings: [], totalValue: 0 },
      crypto: { holdings: [], totalValue: 0 },
      'managed-fund': { holdings: [], totalValue: 0 },
    };

    for (const holding of holdings) {
      groups[holding.type].holdings.push(holding);
      groups[holding.type].totalValue += holding.currentValue || 0;
    }

    return groups;
  }, []);

  return {
    grouped: grouped || {
      etf: { holdings: [], totalValue: 0 },
      stock: { holdings: [], totalValue: 0 },
      crypto: { holdings: [], totalValue: 0 },
      'managed-fund': { holdings: [], totalValue: 0 },
    },
    isLoading: grouped === undefined,
  };
}

/**
 * Get investment transactions for a holding
 */
export function useInvestmentTransactions(holdingId?: string) {
  const transactions = useLiveQuery(async () => {
    if (!holdingId) return [];

    return db.investmentTransactions
      .where('holdingId')
      .equals(holdingId)
      .reverse()
      .sortBy('date');
  }, [holdingId]);

  return {
    transactions: transactions || [],
    isLoading: transactions === undefined,
  };
}

/**
 * Get all investment transactions (for tax reporting)
 */
export function useAllInvestmentTransactions(dateRange?: { from: Date; to: Date }) {
  const transactions = useLiveQuery(async () => {
    let results = await db.investmentTransactions.toArray();

    if (dateRange) {
      results = results.filter(
        (t) => t.date >= dateRange.from && t.date <= dateRange.to
      );
    }

    // Sort by date descending
    return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]);

  return {
    transactions: transactions || [],
    isLoading: transactions === undefined,
  };
}

/**
 * Get price history for a holding
 * @param holdingId - The holding ID to get price history for
 * @param days - Number of days of history to retrieve (default: 30)
 */
export function usePriceHistory(holdingId?: string, days: number = 30) {
  const history = useLiveQuery(async () => {
    if (!holdingId) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const results = await db.priceHistory
      .where('holdingId')
      .equals(holdingId)
      .filter((entry) => entry.date >= startDate)
      .toArray();

    // Sort by date ascending for charting
    return results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holdingId, days]);

  return {
    history: history || [],
    isLoading: history === undefined,
  };
}

/**
 * Get price history for multiple holdings (for sparklines)
 * Uses a single batch query instead of N+1 queries
 */
export function useMultiplePriceHistory(holdingIds: string[], days: number = 30) {
  // Stabilize the dependency to avoid unnecessary re-renders
  const holdingIdsKey = holdingIds.join(',');

  const historyMap = useLiveQuery(async () => {
    if (holdingIds.length === 0) return new Map<string, PriceHistoryEntry[]>();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Fetch all entries in a single query using anyOf (avoids N+1)
    const allEntries = await db.priceHistory
      .where('holdingId')
      .anyOf(holdingIds)
      .filter((entry) => entry.date >= startDate)
      .toArray();

    // Initialize results map with empty arrays
    const results = new Map<string, PriceHistoryEntry[]>();
    for (const holdingId of holdingIds) {
      results.set(holdingId, []);
    }

    // Group entries by holdingId
    for (const entry of allEntries) {
      const existing = results.get(entry.holdingId);
      if (existing) {
        existing.push(entry);
      }
    }

    // Sort each array by date ascending for charting
    for (const entries of results.values()) {
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return results;
  }, [holdingIdsKey, days]);

  return {
    historyMap: historyMap || new Map<string, PriceHistoryEntry[]>(),
    isLoading: historyMap === undefined,
  };
}

'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Holding, InvestmentTransaction, HoldingType } from '@/types';

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

    const gainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

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

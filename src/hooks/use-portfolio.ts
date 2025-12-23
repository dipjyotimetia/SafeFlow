'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { PortfolioSnapshot } from '@/types';

export type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

/**
 * Convert TimeRange to days
 */
export function getTimeRangeDays(range: TimeRange): number {
  switch (range) {
    case '1W':
      return 7;
    case '1M':
      return 30;
    case '3M':
      return 90;
    case '6M':
      return 180;
    case '1Y':
      return 365;
    case 'ALL':
      return 3650; // ~10 years
  }
}

/**
 * Get portfolio history for charting
 * @param days Number of days of history to retrieve (default: 30)
 */
export function usePortfolioHistory(days: number = 30) {
  const history = useLiveQuery(async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Use indexed query for better performance
    const results = await db.portfolioHistory
      .where('date')
      .aboveOrEqual(startDate)
      .sortBy('date'); // Already sorted ascending

    return results;
  }, [days]);

  return {
    history: history || [],
    isLoading: history === undefined,
  };
}

/**
 * Get portfolio performance metrics for a time range
 */
export function usePortfolioPerformance(range: TimeRange = '1M') {
  const days = getTimeRangeDays(range);

  const performance = useLiveQuery(async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Use indexed query for better performance
    const snapshots = await db.portfolioHistory
      .where('date')
      .aboveOrEqual(startDate)
      .sortBy('date'); // Already sorted ascending

    if (snapshots.length === 0) {
      return null;
    }

    const first = snapshots[0]!;
    const last = snapshots[snapshots.length - 1]!;

    const valueChange = last.totalValue - first.totalValue;
    const percentChange =
      first.totalValue > 0
        ? Math.round((valueChange / first.totalValue) * 10000) / 100
        : 0;

    // Find high and low
    let high = first.totalValue;
    let low = first.totalValue;
    for (const s of snapshots) {
      if (s.totalValue > high) high = s.totalValue;
      if (s.totalValue < low) low = s.totalValue;
    }

    return {
      startValue: first.totalValue,
      endValue: last.totalValue,
      valueChange,
      percentChange,
      high,
      low,
      dataPoints: snapshots.length,
    };
  }, [days]);

  return {
    performance,
    isLoading: performance === undefined,
  };
}

/**
 * Get the latest portfolio snapshot
 */
export function useLatestSnapshot() {
  const snapshot = useLiveQuery(async () => {
    const snapshots = await db.portfolioHistory
      .orderBy('date')
      .reverse()
      .limit(1)
      .toArray();

    return snapshots[0] || null;
  }, []);

  return {
    snapshot: snapshot || null,
    isLoading: snapshot === undefined,
  };
}

/**
 * Check if portfolio history has any data
 */
export function useHasPortfolioHistory() {
  const hasData = useLiveQuery(async () => {
    const count = await db.portfolioHistory.count();
    return count > 0;
  }, []);

  return {
    hasData: hasData ?? false,
    isLoading: hasData === undefined,
  };
}

/**
 * Get portfolio snapshots for a specific date range
 */
export function usePortfolioSnapshots(dateRange?: { from: Date; to: Date }) {
  const snapshots = useLiveQuery(
    async () => {
      let results: PortfolioSnapshot[];

      if (dateRange) {
        // Use indexed query for better performance
        results = await db.portfolioHistory
          .where('date')
          .between(dateRange.from, dateRange.to, true, true)
          .reverse() // Newest first
          .toArray();
      } else {
        results = await db.portfolioHistory
          .orderBy('date')
          .reverse()
          .toArray();
      }

      return results;
    },
    [dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]
  );

  return {
    snapshots: snapshots || [],
    isLoading: snapshots === undefined,
  };
}

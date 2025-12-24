import { create } from 'zustand';
import { db } from '@/lib/db';
import { getDateOnly, getDateKey } from '@/lib/utils/date';
import type { PortfolioSnapshot, HoldingSnapshot } from '@/types';

interface PortfolioStore {
  // State
  lastSnapshotDate: Date | null;
  isTakingSnapshot: boolean;

  // Actions
  takeSnapshot: () => Promise<void>;
  cleanupOldSnapshots: (daysToKeep?: number) => Promise<number>;
}

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  lastSnapshotDate: null,
  isTakingSnapshot: false,

  /**
   * Take a snapshot of the current portfolio state
   * Only one snapshot per day is kept (uses deterministic ID based on date)
   */
  takeSnapshot: async () => {
    set({ isTakingSnapshot: true });

    try {
      const holdings = await db.holdings.toArray();

      if (holdings.length === 0) {
        set({ isTakingSnapshot: false });
        return;
      }

      const now = new Date();
      const today = getDateOnly(now);
      const snapshotId = `portfolio-${getDateKey(today)}`;

      // Calculate totals
      let totalValue = 0;
      let totalCostBasis = 0;

      const holdingsSnapshot: HoldingSnapshot[] = holdings.map((h) => {
        const value = h.currentValue || 0;
        const costBasis = h.costBasis || 0;
        totalValue += value;
        totalCostBasis += costBasis;

        return {
          holdingId: h.id,
          symbol: h.symbol,
          type: h.type,
          units: h.units,
          value,
          costBasis,
        };
      });

      const snapshot: PortfolioSnapshot = {
        id: snapshotId,
        date: today,
        totalValue,
        totalCostBasis,
        totalGainLoss: totalValue - totalCostBasis,
        holdingsSnapshot,
        createdAt: now,
      };

      // Use put() to upsert - prevents duplicate snapshots for same day
      await db.portfolioHistory.put(snapshot);

      set({ isTakingSnapshot: false, lastSnapshotDate: today });
    } catch (error) {
      console.error('Failed to take portfolio snapshot:', error);
      set({ isTakingSnapshot: false });
    }
  },

  /**
   * Clean up old snapshots beyond the retention period
   * @param daysToKeep Number of days of history to keep (default: 365)
   * @returns Number of deleted snapshots
   */
  cleanupOldSnapshots: async (daysToKeep: number = 365) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    cutoffDate.setHours(0, 0, 0, 0);

    const oldSnapshots = await db.portfolioHistory
      .filter((s) => s.date < cutoffDate)
      .toArray();

    if (oldSnapshots.length > 0) {
      await db.portfolioHistory.bulkDelete(oldSnapshots.map((s) => s.id));
    }

    return oldSnapshots.length;
  },
}));

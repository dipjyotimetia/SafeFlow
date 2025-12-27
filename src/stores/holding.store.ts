import { create } from 'zustand';
import { db } from '@/lib/db';
import { logError } from '@/lib/errors';
import { fetchPrices } from '@/lib/prices';
import { calculateFrankingCredit, calculateGrossedUpDividend } from '@/lib/utils/franking';
import { calculateSellTransactionCGT, getEarliestPurchaseDate } from '@/lib/utils/investment-cgt';
import { getDateOnly, getDateKey } from '@/lib/utils/date';
import { usePortfolioStore } from './portfolio.store';
import type {
  Holding,
  HoldingType,
  InvestmentTransactionType,
  CompanyTaxRate,
  PriceHistoryEntry,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface HoldingStore {
  // Price refresh state
  lastPriceRefresh: Date | null;
  isRefreshingPrices: boolean;
  priceRefreshError: string | null;

  // CRUD operations
  createHolding: (data: {
    accountId: string;
    symbol: string;
    name: string;
    type: HoldingType;
    units: number;
    costBasis: number;
  }) => Promise<string>;

  updateHolding: (id: string, data: Partial<Holding>) => Promise<void>;

  deleteHolding: (id: string) => Promise<void>;

  // Price refresh
  refreshPrices: () => Promise<void>;

  // Investment transactions
  addTransaction: (data: {
    holdingId: string;
    type: InvestmentTransactionType;
    units: number;
    pricePerUnit: number;
    fees?: number;
    date: Date;
    notes?: string;
    // Franking credit fields (for dividends/distributions)
    frankingPercentage?: number; // 0-100
    companyTaxRate?: CompanyTaxRate; // 30 or 25
  }) => Promise<string>;

  deleteTransaction: (id: string) => Promise<void>;
}

export const useHoldingStore = create<HoldingStore>((set) => ({
  lastPriceRefresh: null,
  isRefreshingPrices: false,
  priceRefreshError: null,

  createHolding: async (data) => {
    try {
      // Validate that the account exists
      const account = await db.accounts.get(data.accountId);
      if (!account) {
        throw new Error(`Account not found: ${data.accountId}`);
      }

      const id = uuidv4();
      const now = new Date();

      await db.holdings.add({
        id,
        accountId: data.accountId,
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        type: data.type,
        units: data.units,
        costBasis: data.costBasis,
        createdAt: now,
        updatedAt: now,
      });

      return id;
    } catch (error) {
      logError('HoldingStore.createHolding', error);
      throw error;
    }
  },

  updateHolding: async (id, data) => {
    try {
      const existing = await db.holdings.get(id);
      if (!existing) {
        throw new Error(`Holding not found: ${id}`);
      }

      await db.holdings.update(id, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      logError('HoldingStore.updateHolding', error);
      throw error;
    }
  },

  deleteHolding: async (id) => {
    try {
      const existing = await db.holdings.get(id);
      if (!existing) {
        throw new Error(`Holding not found: ${id}`);
      }

      // Use transaction to ensure atomicity - delete holding and all related data
      await db.transaction('rw', [db.holdings, db.investmentTransactions, db.priceHistory, db.taxLots], async () => {
        // Delete related investment transactions
        await db.investmentTransactions.where('holdingId').equals(id).delete();
        // Delete related price history entries
        await db.priceHistory.where('holdingId').equals(id).delete();
        // Delete related tax lots (for CGT cost basis tracking)
        await db.taxLots.where('holdingId').equals(id).delete();
        // Delete the holding itself
        await db.holdings.delete(id);
      });
    } catch (error) {
      logError('HoldingStore.deleteHolding', error);
      throw error;
    }
  },

  refreshPrices: async () => {
    set({ isRefreshingPrices: true, priceRefreshError: null });

    try {
      const holdings = await db.holdings.toArray();

      if (holdings.length === 0) {
        set({ isRefreshingPrices: false, lastPriceRefresh: new Date() });
        return;
      }

      const prices = await fetchPrices(
        holdings.map((h) => ({ symbol: h.symbol, type: h.type }))
      );

      const now = new Date();
      const today = getDateOnly(now);

      // Track failed updates to report partial success
      const failedUpdates: string[] = [];

      // Update holdings with new prices and save price history
      // Each holding is updated independently to prevent one failure from stopping all updates
      for (const holding of holdings) {
        const price = prices.get(holding.symbol);
        if (price) {
          try {
            // Update holding with price and 24h change
            await db.holdings.update(holding.id, {
              currentPrice: price.price,
              currentValue: Math.round(holding.units * price.price),
              change24hPercent: price.change24hPercent,
              lastPriceUpdate: now,
              updatedAt: now,
            });

            // Save price history (one entry per day)
            // Use deterministic ID to avoid race conditions with concurrent refreshes
            const dateKey = getDateKey(today);
            const historyId = `${holding.id}-${dateKey}`;
            const historyEntry: PriceHistoryEntry = {
              id: historyId,
              holdingId: holding.id,
              date: today,
              price: price.price,
              source: 'api',
              createdAt: now,
            };
            // put() will upsert (insert or update), avoiding race conditions
            await db.priceHistory.put(historyEntry);
          } catch (err) {
            // Log the error but continue with other holdings
            logError(`HoldingStore.refreshPrices.${holding.symbol}`, err);
            failedUpdates.push(holding.symbol);
          }
        }
      }

      // Report partial failure if some updates failed
      if (failedUpdates.length > 0) {
        set({
          isRefreshingPrices: false,
          lastPriceRefresh: now,
          priceRefreshError: `Failed to update: ${failedUpdates.join(', ')}`,
        });
      } else {
        set({ isRefreshingPrices: false, lastPriceRefresh: now });
      }

      // Take a portfolio snapshot after successful price refresh
      try {
        await usePortfolioStore.getState().takeSnapshot();
      } catch (err) {
        logError('HoldingStore.refreshPrices.takeSnapshot', err);
      }
    } catch (error) {
      set({
        isRefreshingPrices: false,
        priceRefreshError: error instanceof Error ? error.message : 'Failed to refresh prices',
      });
    }
  },

  addTransaction: async (data) => {
    const id = uuidv4();
    const now = new Date();
    const totalAmount = data.units * data.pricePerUnit + (data.fees || 0);

    // Calculate franking credit for dividends and distributions
    let frankingCreditAmount: number | undefined;
    let grossedUpAmount: number | undefined;

    if (
      (data.type === 'dividend' || data.type === 'distribution') &&
      data.frankingPercentage !== undefined &&
      data.frankingPercentage > 0
    ) {
      frankingCreditAmount = calculateFrankingCredit(
        totalAmount,
        data.frankingPercentage,
        data.companyTaxRate || 30
      );
      grossedUpAmount = calculateGrossedUpDividend(totalAmount, frankingCreditAmount);
    }

    // Calculate capital gain for sell transactions
    let capitalGain: number | undefined;
    let holdingPeriod: number | undefined;

    // Use transaction to ensure atomicity - either both succeed or both fail
    await db.transaction('rw', [db.investmentTransactions, db.holdings], async () => {
      // Validate sell transactions and calculate CGT before processing
      if (data.type === 'sell') {
        const holding = await db.holdings.get(data.holdingId);
        if (!holding) {
          throw new Error('Holding not found');
        }
        if (data.units > holding.units) {
          throw new Error(
            `Cannot sell ${data.units} units. Only ${holding.units} units available.`
          );
        }

        // Get earliest purchase date for holding period calculation
        const existingTransactions = await db.investmentTransactions
          .where('holdingId')
          .equals(data.holdingId)
          .toArray();
        const firstPurchaseDate = getEarliestPurchaseDate(existingTransactions) || holding.createdAt;

        // Calculate capital gain using average cost basis
        const cgtResult = calculateSellTransactionCGT({
          holdingId: data.holdingId,
          units: data.units,
          pricePerUnit: data.pricePerUnit,
          fees: data.fees,
          saleDate: data.date,
          totalUnits: holding.units,
          totalCostBasis: holding.costBasis,
          firstPurchaseDate,
        });

        capitalGain = cgtResult.netCapitalGain; // After 50% discount if applicable
        holdingPeriod = cgtResult.holdingPeriodDays;
      }

      // Create the transaction
      await db.investmentTransactions.add({
        id,
        holdingId: data.holdingId,
        type: data.type,
        units: data.units,
        pricePerUnit: data.pricePerUnit,
        totalAmount,
        fees: data.fees,
        date: data.date,
        notes: data.notes,
        // Franking credit fields
        frankingPercentage: data.frankingPercentage,
        companyTaxRate: data.companyTaxRate,
        frankingCreditAmount,
        grossedUpAmount,
        // Capital gain fields (for sell transactions)
        capitalGain,
        holdingPeriod,
        createdAt: now,
        updatedAt: now,
      });

      // Update holding units and cost basis
      const holding = await db.holdings.get(data.holdingId);
      if (holding) {
        let newUnits = holding.units;
        let newCostBasis = holding.costBasis;

        if (data.type === 'buy') {
          newUnits += data.units;
          newCostBasis += totalAmount;
        } else if (data.type === 'sell') {
          // Calculate proportional cost basis reduction using integer math
          // Avoids float division drift: (costBasis * remainingUnits) / totalUnits
          newUnits -= data.units;
          newCostBasis = holding.units > 0
            ? Math.round((holding.costBasis * newUnits) / holding.units)
            : 0;
        }

        await db.holdings.update(data.holdingId, {
          units: newUnits,
          costBasis: newCostBasis,
          currentValue: holding.currentPrice ? Math.round(newUnits * holding.currentPrice) : undefined,
          updatedAt: now,
        });
      }
    });

    return id;
  },

  deleteTransaction: async (id) => {
    // Use transaction to ensure atomicity
    await db.transaction('rw', [db.investmentTransactions, db.holdings], async () => {
      const transaction = await db.investmentTransactions.get(id);
      if (!transaction) return;

      const holding = await db.holdings.get(transaction.holdingId);
      if (holding) {
        let newUnits = holding.units;
        let newCostBasis = holding.costBasis;

        // Reverse the transaction effect
        if (transaction.type === 'buy') {
          newUnits -= transaction.units;
          newCostBasis -= transaction.totalAmount;
        } else if (transaction.type === 'sell') {
          newUnits += transaction.units;
          newCostBasis += transaction.totalAmount;
        }

        await db.holdings.update(transaction.holdingId, {
          units: Math.max(0, newUnits),
          costBasis: Math.max(0, newCostBasis),
          updatedAt: new Date(),
        });
      }

      await db.investmentTransactions.delete(id);
    });
  },
}));

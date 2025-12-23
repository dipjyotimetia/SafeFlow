import { create } from 'zustand';
import { db } from '@/lib/db';
import { fetchPrices } from '@/lib/prices';
import { calculateFrankingCredit, calculateGrossedUpDividend } from '@/lib/utils/franking';
import type {
  Holding,
  HoldingType,
  InvestmentTransaction,
  InvestmentTransactionType,
  CompanyTaxRate,
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

export const useHoldingStore = create<HoldingStore>((set, get) => ({
  lastPriceRefresh: null,
  isRefreshingPrices: false,
  priceRefreshError: null,

  createHolding: async (data) => {
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
  },

  updateHolding: async (id, data) => {
    await db.holdings.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  deleteHolding: async (id) => {
    // Delete related transactions first
    const transactions = await db.investmentTransactions
      .where('holdingId')
      .equals(id)
      .toArray();

    await db.investmentTransactions.bulkDelete(transactions.map((t) => t.id));
    await db.holdings.delete(id);
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

      // Update holdings with new prices
      for (const holding of holdings) {
        const price = prices.get(holding.symbol);
        if (price) {
          await db.holdings.update(holding.id, {
            currentPrice: price.price,
            currentValue: Math.round(holding.units * price.price),
            lastPriceUpdate: now,
            updatedAt: now,
          });
        }
      }

      set({ isRefreshingPrices: false, lastPriceRefresh: now });
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

    return id;
  },

  deleteTransaction: async (id) => {
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
  },
}));

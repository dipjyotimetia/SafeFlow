import { create } from 'zustand';
import { db } from '@/lib/db';
import { logError } from '@/lib/errors';
import {
  holdingCreateSchema,
  holdingUpdateSchema,
  investmentTransactionCreateSchema,
} from '@/lib/schemas';
import { fetchPrices } from '@/lib/prices';
import { calculateFrankingCredit, calculateGrossedUpDividend } from '@/lib/utils/franking';
import { calculateSellTransactionCGT, getEarliestPurchaseDate } from '@/lib/utils/investment-cgt';
import { getDateOnly, getDateKey } from '@/lib/utils/date';
import { usePortfolioStore } from './portfolio.store';
import type {
  Holding,
  HoldingType,
  InvestmentTransaction,
  InvestmentTransactionType,
  CompanyTaxRate,
  PriceHistoryEntry,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

type HoldingReplayState = {
  units: number;
  costBasis: number;
};

function sortTransactionsForReplay(transactions: InvestmentTransaction[]): InvestmentTransaction[] {
  return [...transactions].sort((a, b) => {
    const dateDelta = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDelta !== 0) return dateDelta;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function applyTransactionToState(
  state: HoldingReplayState,
  transaction: InvestmentTransaction
): { next: HoldingReplayState; costBasisReduction?: number } {
  if (transaction.type === 'buy') {
    return {
      next: {
        units: state.units + transaction.units,
        costBasis: state.costBasis + transaction.totalAmount,
      },
    };
  }

  if (transaction.type === 'sell') {
    if (transaction.units > state.units) {
      throw new Error(
        `Cannot sell ${transaction.units} units with only ${state.units} units available`
      );
    }

    const nextUnits = Math.max(0, state.units - transaction.units);
    const nextCostBasis = state.units > 0
      ? Math.round((state.costBasis * nextUnits) / state.units)
      : 0;
    const costBasisReduction = Math.max(0, state.costBasis - nextCostBasis);

    return {
      next: {
        units: nextUnits,
        costBasis: nextCostBasis,
      },
      costBasisReduction,
    };
  }

  if (transaction.type === 'fee') {
    return {
      next: {
        units: state.units,
        costBasis: Math.max(0, state.costBasis - transaction.totalAmount),
      },
    };
  }

  return { next: state };
}

function reverseTransactionFromState(
  state: HoldingReplayState,
  transaction: InvestmentTransaction
): HoldingReplayState {
  if (transaction.type === 'buy') {
    return {
      units: Math.max(0, state.units - transaction.units),
      costBasis: Math.max(0, state.costBasis - transaction.totalAmount),
    };
  }

  if (transaction.type === 'sell') {
    const estimatedReduction =
      transaction.costBasisReduction !== undefined
        ? transaction.costBasisReduction
        : state.units > 0
          ? Math.round((state.costBasis * transaction.units) / state.units)
          : 0;
    return {
      units: state.units + transaction.units,
      costBasis: Math.max(0, state.costBasis + estimatedReduction),
    };
  }

  if (transaction.type === 'fee') {
    return {
      units: state.units,
      costBasis: state.costBasis + transaction.totalAmount,
    };
  }

  return state;
}

function deriveOpeningStateFromHolding(
  holding: Holding,
  appliedTransactions: InvestmentTransaction[]
): HoldingReplayState {
  const desc = sortTransactionsForReplay(appliedTransactions).reverse();
  let state: HoldingReplayState = {
    units: holding.units,
    costBasis: holding.costBasis,
  };

  for (const tx of desc) {
    state = reverseTransactionFromState(state, tx);
  }

  return {
    units: Math.max(0, state.units),
    costBasis: Math.max(0, state.costBasis),
  };
}

function replayHoldingState(
  openingState: HoldingReplayState,
  transactions: InvestmentTransaction[]
): {
  finalState: HoldingReplayState;
  sellCostBasisByTransactionId: Map<string, number>;
} {
  const ordered = sortTransactionsForReplay(transactions);
  let state: HoldingReplayState = { ...openingState };
  const sellCostBasisByTransactionId = new Map<string, number>();

  for (const tx of ordered) {
    const applied = applyTransactionToState(state, tx);
    state = applied.next;
    if (tx.type === 'sell' && applied.costBasisReduction !== undefined) {
      sellCostBasisByTransactionId.set(tx.id, applied.costBasisReduction);
    }
  }

  return {
    finalState: state,
    sellCostBasisByTransactionId,
  };
}

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
      const parsed = holdingCreateSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(`Invalid holding input: ${parsed.error.message}`);
      }
      const validData = parsed.data;

      // Validate that the account exists
      const account = await db.accounts.get(validData.accountId);
      if (!account) {
        throw new Error(`Account not found: ${validData.accountId}`);
      }

      const id = uuidv4();
      const now = new Date();

      await db.holdings.add({
        id,
        accountId: validData.accountId,
        symbol: validData.symbol.toUpperCase(),
        name: validData.name,
        type: validData.type,
        units: validData.units,
        costBasis: validData.costBasis,
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
      if (Object.keys(data).length > 0) {
        const parsed = holdingUpdateSchema.safeParse(data);
        if (!parsed.success) {
          throw new Error(`Invalid holding update: ${parsed.error.message}`);
        }
      }

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
    const isTrade = data.type === 'buy' || data.type === 'sell';
    const units = isTrade ? data.units : 0;
    const totalAmount = isTrade
      ? Math.round(data.units * data.pricePerUnit + (data.fees || 0))
      : Math.round(data.pricePerUnit + (data.fees || 0));
    const validatedInput = investmentTransactionCreateSchema.safeParse({
      holdingId: data.holdingId,
      type: data.type,
      units,
      pricePerUnit: data.pricePerUnit,
      totalAmount,
      fees: data.fees,
      date: data.date,
      notes: data.notes,
    });
    if (!validatedInput.success) {
      throw new Error(`Invalid investment transaction input: ${validatedInput.error.message}`);
    }
    if (
      data.frankingPercentage !== undefined &&
      (data.frankingPercentage < 0 || data.frankingPercentage > 100)
    ) {
      throw new Error('Franking percentage must be between 0 and 100');
    }

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

    // Use transaction to ensure atomicity - either both transaction + holding recompute succeed or both fail
    await db.transaction('rw', [db.investmentTransactions, db.holdings], async () => {
      const holding = await db.holdings.get(data.holdingId);
      if (!holding) {
        throw new Error('Holding not found');
      }

      const existingTransactions = await db.investmentTransactions
        .where('holdingId')
        .equals(data.holdingId)
        .toArray();
      const openingState = deriveOpeningStateFromHolding(holding, existingTransactions);
      const replayBeforeNew = replayHoldingState(openingState, existingTransactions);

      // Validate sell transactions and calculate CGT before processing
      if (data.type === 'sell') {
        if (data.units > replayBeforeNew.finalState.units) {
          throw new Error(
            `Cannot sell ${data.units} units. Only ${replayBeforeNew.finalState.units} units available.`
          );
        }

        // Get earliest purchase date for holding period calculation
        const firstPurchaseDate = getEarliestPurchaseDate(existingTransactions) || holding.createdAt;

        // Calculate capital gain using average cost basis
        const cgtResult = calculateSellTransactionCGT({
          holdingId: data.holdingId,
          units: data.units,
          pricePerUnit: data.pricePerUnit,
          fees: data.fees,
          saleDate: data.date,
          totalUnits: replayBeforeNew.finalState.units,
          totalCostBasis: replayBeforeNew.finalState.costBasis,
          firstPurchaseDate,
        });

        capitalGain = cgtResult.netCapitalGain; // After 50% discount if applicable
        holdingPeriod = cgtResult.holdingPeriodDays;
      }

      const newTransaction: InvestmentTransaction = {
        id,
        holdingId: data.holdingId,
        type: data.type,
        units,
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
        costBasisReduction: undefined,
        createdAt: now,
        updatedAt: now,
      };

      const allTransactions = [...existingTransactions, newTransaction];
      const replay = replayHoldingState(openingState, allTransactions);
      const sellCostBasisReduction = replay.sellCostBasisByTransactionId.get(id);

      await db.investmentTransactions.add({
        ...newTransaction,
        costBasisReduction:
          newTransaction.type === 'sell' ? sellCostBasisReduction : undefined,
      });

      const existingSellUpdates = allTransactions
        .filter((tx) => tx.type === 'sell' && tx.id !== id)
        .map((tx) => {
          const recalculated = replay.sellCostBasisByTransactionId.get(tx.id);
          if (recalculated === undefined || tx.costBasisReduction === recalculated) {
            return null;
          }
          return {
            ...tx,
            costBasisReduction: recalculated,
            updatedAt: now,
          };
        })
        .filter((tx) => tx !== null) as InvestmentTransaction[];

      if (existingSellUpdates.length > 0) {
        await db.investmentTransactions.bulkPut(existingSellUpdates);
      }

      await db.holdings.update(data.holdingId, {
        units: replay.finalState.units,
        costBasis: replay.finalState.costBasis,
        currentValue: holding.currentPrice
          ? Math.round(replay.finalState.units * holding.currentPrice)
          : undefined,
        updatedAt: now,
      });
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
        const allTransactions = await db.investmentTransactions
          .where('holdingId')
          .equals(transaction.holdingId)
          .toArray();
        const openingState = deriveOpeningStateFromHolding(holding, allTransactions);
        const remainingTransactions = allTransactions.filter((tx) => tx.id !== id);
        const replay = replayHoldingState(openingState, remainingTransactions);
        const now = new Date();

        const sellUpdates = remainingTransactions
          .filter((tx) => tx.type === 'sell')
          .map((tx) => {
            const recalculated = replay.sellCostBasisByTransactionId.get(tx.id);
            if (recalculated === undefined || tx.costBasisReduction === recalculated) {
              return null;
            }
            return {
              ...tx,
              costBasisReduction: recalculated,
              updatedAt: now,
            };
          })
          .filter((tx) => tx !== null) as InvestmentTransaction[];

        if (sellUpdates.length > 0) {
          await db.investmentTransactions.bulkPut(sellUpdates);
        }

        await db.holdings.update(transaction.holdingId, {
          units: replay.finalState.units,
          costBasis: replay.finalState.costBasis,
          currentValue: holding.currentPrice
            ? Math.round(replay.finalState.units * holding.currentPrice)
            : undefined,
          updatedAt: now,
        });
      }

      await db.investmentTransactions.delete(id);
    });
  },
}));

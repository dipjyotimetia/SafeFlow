'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getFinancialYearDates } from '@/lib/utils/financial-year';

type AccountVisibilityInfo = {
  id: string;
  memberId?: string;
  visibility?: 'private' | 'shared';
};

function isAccountVisibleToMember(account: AccountVisibilityInfo | undefined, memberId?: string): boolean {
  if (!memberId) {
    return true;
  }

  if (!account) {
    return false;
  }

  if (account.memberId === memberId) {
    return true;
  }

  if (account.visibility === 'shared' || !account.memberId) {
    return true;
  }

  return false;
}

function isTransactionVisibleToMember(
  transaction: { accountId: string; memberId?: string },
  accountMap: Map<string, AccountVisibilityInfo>,
  memberId?: string
): boolean {
  if (!memberId) {
    return true;
  }

  if (transaction.memberId === memberId) {
    return true;
  }

  return isAccountVisibleToMember(accountMap.get(transaction.accountId), memberId);
}

function getVisibleHoldingIdsForMember(
  holdings: Array<{ id: string; accountId: string }>,
  accountMap: Map<string, AccountVisibilityInfo>,
  memberId?: string
): Set<string> {
  if (!memberId) {
    return new Set(holdings.map((h) => h.id));
  }

  return new Set(
    holdings
      .filter((holding) => isAccountVisibleToMember(accountMap.get(holding.accountId), memberId))
      .map((holding) => holding.id)
  );
}

/**
 * Get deductible transactions for a financial year
 * Optimized to use indexed date query instead of loading all transactions
 */
export function useDeductibleTransactions(financialYear: string, memberId?: string) {
  const { start, end } = getFinancialYearDates(financialYear);

  const transactions = useLiveQuery(async () => {
    const [fyTransactions, accounts] = await Promise.all([
      db.transactions.where('date').between(start, end, true, true).toArray(),
      memberId ? db.accounts.toArray() : Promise.resolve([]),
    ]);

    const accountMap = new Map<string, AccountVisibilityInfo>(
      accounts.map((a) => [a.id, { id: a.id, memberId: a.memberId, visibility: a.visibility }])
    );

    return fyTransactions.filter(
      (t) =>
        t.isDeductible === true &&
        isTransactionVisibleToMember(t, accountMap, memberId)
    );
  }, [financialYear, memberId]);

  return {
    transactions: transactions || [],
    isLoading: transactions === undefined,
  };
}

/**
 * Get deductions summary by ATO category for a financial year
 * Optimized to use indexed date query
 */
export function useDeductionsSummary(financialYear: string, memberId?: string) {
  const { start, end } = getFinancialYearDates(financialYear);

  const summary = useLiveQuery(async () => {
    const [fyTransactions, categories, accounts] = await Promise.all([
      db.transactions.where('date').between(start, end, true, true).toArray(),
      db.categories.toArray(),
      memberId ? db.accounts.toArray() : Promise.resolve([]),
    ]);

    const accountMap = new Map<string, AccountVisibilityInfo>(
      accounts.map((a) => [a.id, { id: a.id, memberId: a.memberId, visibility: a.visibility }])
    );

    // Filter to deductible transactions
    const deductible = fyTransactions.filter(
      (t) =>
        t.isDeductible === true &&
        isTransactionVisibleToMember(t, accountMap, memberId)
    );

    // Group by ATO category
    const byCategory = new Map<string, { amount: number; gst: number; count: number; name: string }>();

    for (const t of deductible) {
      const atoCode = t.atoCategory || 'other';
      const category = categories.find((c) => c.atoCode === atoCode);
      const existing = byCategory.get(atoCode) || {
        amount: 0,
        gst: 0,
        count: 0,
        name: category?.name || atoCode,
      };

      existing.amount += t.amount;
      existing.gst += t.gstAmount || 0;
      existing.count += 1;
      byCategory.set(atoCode, existing);
    }

    const totalDeductions = deductible.reduce((sum, t) => sum + t.amount, 0);
    const totalGst = deductible.reduce((sum, t) => sum + (t.gstAmount || 0), 0);

    return {
      totalDeductions,
      totalGst,
      totalCount: deductible.length,
      byCategory: Array.from(byCategory.entries())
        .map(([code, data]) => ({
          code,
          ...data,
        }))
        .sort((a, b) => b.amount - a.amount),
    };
  }, [financialYear, memberId]);

  return {
    summary: summary || {
      totalDeductions: 0,
      totalGst: 0,
      totalCount: 0,
      byCategory: [],
    },
    isLoading: summary === undefined,
  };
}

/**
 * Get capital gains/losses for a financial year
 * Optimized to use indexed date query
 */
export function useCapitalGains(financialYear: string, memberId?: string) {
  const { start, end } = getFinancialYearDates(financialYear);

  const data = useLiveQuery(async () => {
    const [investmentTransactions, holdings, accounts] = await Promise.all([
      db.investmentTransactions.where('date').between(start, end, true, true).toArray(),
      memberId ? db.holdings.toArray() : Promise.resolve([]),
      memberId ? db.accounts.toArray() : Promise.resolve([]),
    ]);

    const accountMap = new Map<string, AccountVisibilityInfo>(
      accounts.map((a) => [a.id, { id: a.id, memberId: a.memberId, visibility: a.visibility }])
    );

    const visibleHoldingIds = getVisibleHoldingIdsForMember(holdings, accountMap, memberId);
    const fyTransactions = memberId
      ? investmentTransactions.filter((t) => visibleHoldingIds.has(t.holdingId))
      : investmentTransactions;

    // Filter to sell transactions
    const sells = fyTransactions.filter((t) => t.type === 'sell');

    const gains = sells.filter((t) => (t.capitalGain || 0) > 0);
    const losses = sells.filter((t) => (t.capitalGain || 0) < 0);

    const totalGains = gains.reduce((sum, t) => sum + (t.capitalGain || 0), 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + (t.capitalGain || 0), 0));

    // Separate short-term and long-term gains (12+ months holding)
    const shortTermGains = gains
      .filter((t) => (t.holdingPeriod || 0) < 365)
      .reduce((sum, t) => sum + (t.capitalGain || 0), 0);

    const longTermGains = gains
      .filter((t) => (t.holdingPeriod || 0) >= 365)
      .reduce((sum, t) => sum + (t.capitalGain || 0), 0);

    // ATO CGT Calculation Method:
    // 1. Apply losses against gross gains FIRST
    // 2. THEN apply the 50% discount to remaining long-term portion
    const totalGrossGains = shortTermGains + longTermGains;
    const gainsAfterLosses = Math.max(0, totalGrossGains - totalLosses);

    let netCapitalGain = 0;
    let discountedLongTermGains = 0;

    if (gainsAfterLosses > 0) {
      // Determine what portion of remaining gains is from long-term assets
      // Losses reduce gains proportionally, or we can apply losses to short-term first
      // ATO allows taxpayer choice - applying to short-term first maximizes discount
      const lossesAppliedToShortTerm = Math.min(totalLosses, shortTermGains);
      const remainingLosses = totalLosses - lossesAppliedToShortTerm;

      const shortTermAfterLosses = shortTermGains - lossesAppliedToShortTerm;
      const longTermAfterLosses = Math.max(0, longTermGains - remainingLosses);

      // Apply 50% CGT discount to long-term portion only
      // Round to avoid floating-point precision issues in cents
      discountedLongTermGains = Math.round(longTermAfterLosses * 0.5);
      netCapitalGain = shortTermAfterLosses + discountedLongTermGains;
    }

    return {
      totalGains,
      totalLosses,
      shortTermGains,
      longTermGains,
      discountedLongTermGains,
      netCapitalGain,
      transactions: sells,
    };
  }, [financialYear, memberId]);

  return {
    data: data || {
      totalGains: 0,
      totalLosses: 0,
      shortTermGains: 0,
      longTermGains: 0,
      discountedLongTermGains: 0,
      netCapitalGain: 0,
      transactions: [],
    },
    isLoading: data === undefined,
  };
}

/**
 * Get income summary for a financial year
 * Includes franking credit data for dividends
 * Optimized to use indexed date queries with parallel fetching
 */
export function useIncomeSummary(financialYear: string, memberId?: string) {
  const { start, end } = getFinancialYearDates(financialYear);

  const summary = useLiveQuery(async () => {
    const [fyTransactions, fyInvestmentTrans, accounts, holdings] = await Promise.all([
      db.transactions.where('date').between(start, end, true, true).toArray(),
      db.investmentTransactions.where('date').between(start, end, true, true).toArray(),
      memberId ? db.accounts.toArray() : Promise.resolve([]),
      memberId ? db.holdings.toArray() : Promise.resolve([]),
    ]);

    const accountMap = new Map<string, AccountVisibilityInfo>(
      accounts.map((a) => [a.id, { id: a.id, memberId: a.memberId, visibility: a.visibility }])
    );
    const visibleHoldingIds = getVisibleHoldingIdsForMember(holdings, accountMap, memberId);
    const memberTransactions = fyTransactions.filter((t) =>
      isTransactionVisibleToMember(t, accountMap, memberId)
    );
    const memberInvestmentTransactions = memberId
      ? fyInvestmentTrans.filter((t) => visibleHoldingIds.has(t.holdingId))
      : fyInvestmentTrans;

    // Filter income transactions
    const income = memberTransactions.filter((t) => t.type === 'income');

    // Filter dividends and distributions
    const dividends = memberInvestmentTransactions.filter(
      (t) => t.type === 'dividend' || t.type === 'distribution'
    );

    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalDividends = dividends.reduce((sum, t) => sum + t.totalAmount, 0);

    // Calculate franking credit totals
    const totalFrankingCredits = dividends.reduce(
      (sum, t) => sum + (t.frankingCreditAmount || 0),
      0
    );
    const totalGrossedUpDividends = dividends.reduce(
      (sum, t) => sum + (t.grossedUpAmount || t.totalAmount),
      0
    );

    return {
      totalIncome,
      totalDividends,
      totalFrankingCredits,
      totalGrossedUpDividends,
      // Use grossed-up for assessable income (ATO requirement)
      combinedIncome: totalIncome + totalGrossedUpDividends,
      incomeCount: income.length,
      dividendCount: dividends.length,
    };
  }, [financialYear, memberId]);

  return {
    summary: summary || {
      totalIncome: 0,
      totalDividends: 0,
      totalFrankingCredits: 0,
      totalGrossedUpDividends: 0,
      combinedIncome: 0,
      incomeCount: 0,
      dividendCount: 0,
    },
    isLoading: summary === undefined,
  };
}

/**
 * Get franking credit summary for a financial year
 * Shows breakdown by holding for tax reporting
 */
export function useFrankingSummary(financialYear: string, memberId?: string) {
  const { start, end } = getFinancialYearDates(financialYear);

  const summary = useLiveQuery(async () => {
    const [fyInvestmentTrans, holdings, accounts] = await Promise.all([
      db.investmentTransactions.where('date').between(start, end, true, true).toArray(),
      db.holdings.toArray(),
      memberId ? db.accounts.toArray() : Promise.resolve([]),
    ]);

    const accountMap = new Map<string, AccountVisibilityInfo>(
      accounts.map((a) => [a.id, { id: a.id, memberId: a.memberId, visibility: a.visibility }])
    );
    const visibleHoldingIds = getVisibleHoldingIdsForMember(holdings, accountMap, memberId);

    // Filter to dividends and distributions
    const dividends = fyInvestmentTrans.filter(
      (t) =>
        (t.type === 'dividend' || t.type === 'distribution') &&
        (!memberId || visibleHoldingIds.has(t.holdingId))
    );

    const holdingMap = new Map(holdings.map((h) => [h.id, h]));

    let totalDividends = 0;
    let totalFrankingCredits = 0;
    let totalGrossedUpDividends = 0;

    const byHolding = new Map<
      string,
      {
        holdingId: string;
        symbol: string;
        dividends: number;
        frankingCredits: number;
        grossedUp: number;
        transactionCount: number;
      }
    >();

    for (const t of dividends) {
      const holding = holdingMap.get(t.holdingId);
      const symbol = holding?.symbol || 'Unknown';

      const cashAmount = t.totalAmount;
      const frankingCredit = t.frankingCreditAmount || 0;
      const grossedUp = t.grossedUpAmount || cashAmount;

      totalDividends += cashAmount;
      totalFrankingCredits += frankingCredit;
      totalGrossedUpDividends += grossedUp;

      const existing = byHolding.get(t.holdingId) || {
        holdingId: t.holdingId,
        symbol,
        dividends: 0,
        frankingCredits: 0,
        grossedUp: 0,
        transactionCount: 0,
      };

      existing.dividends += cashAmount;
      existing.frankingCredits += frankingCredit;
      existing.grossedUp += grossedUp;
      existing.transactionCount += 1;
      byHolding.set(t.holdingId, existing);
    }

    return {
      financialYear,
      totalDividends,
      totalFrankingCredits,
      totalGrossedUpDividends,
      byHolding: Array.from(byHolding.values()).sort((a, b) => b.dividends - a.dividends),
    };
  }, [financialYear, memberId]);

  return {
    summary: summary || {
      financialYear,
      totalDividends: 0,
      totalFrankingCredits: 0,
      totalGrossedUpDividends: 0,
      byHolding: [],
    },
    isLoading: summary === undefined,
  };
}

/**
 * Get list of available financial years based on transaction data
 * This still needs to scan transactions but is called infrequently
 */
export function useAvailableFinancialYears(memberId?: string) {
  const years = useLiveQuery(async () => {
    if (!memberId) {
      // Use indexed lookups when no member scoping is required
      const oldestTx = await db.transactions.orderBy('date').first();
      const newestTx = await db.transactions.orderBy('date').last();

      if (!oldestTx || !newestTx) {
        const now = new Date();
        const currentFY =
          now.getMonth() >= 6
            ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}`
            : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(-2)}`;
        return [currentFY];
      }

      const fySet = new Set<string>();
      const oldestDate = oldestTx.date instanceof Date ? oldestTx.date : new Date(oldestTx.date);
      const newestDate = newestTx.date instanceof Date ? newestTx.date : new Date(newestTx.date);
      let currentYear = oldestDate.getMonth() >= 6 ? oldestDate.getFullYear() : oldestDate.getFullYear() - 1;
      const endYear = newestDate.getMonth() >= 6 ? newestDate.getFullYear() : newestDate.getFullYear() - 1;

      while (currentYear <= endYear) {
        fySet.add(`${currentYear}-${(currentYear + 1).toString().slice(-2)}`);
        currentYear++;
      }

      return Array.from(fySet).sort().reverse();
    }

    let transactions = await db.transactions.toArray();
    const accounts = await db.accounts.toArray();
    const accountMap = new Map<string, AccountVisibilityInfo>(
      accounts.map((a) => [a.id, { id: a.id, memberId: a.memberId, visibility: a.visibility }])
    );
    transactions = transactions.filter((t) =>
      isTransactionVisibleToMember(t, accountMap, memberId)
    );

    if (transactions.length === 0) {
      // Return current FY
      const now = new Date();
      const currentFY =
        now.getMonth() >= 6
          ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}`
          : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(-2)}`;
      return [currentFY];
    }

    transactions.sort((a, b) => {
      const aDate = a.date instanceof Date ? a.date : new Date(a.date);
      const bDate = b.date instanceof Date ? b.date : new Date(b.date);
      return aDate.getTime() - bDate.getTime();
    });
    const oldestTx = transactions[0];
    const newestTx = transactions[transactions.length - 1];

    // Generate FY range from oldest to newest transaction
    const fySet = new Set<string>();

    const oldestDate = oldestTx.date instanceof Date ? oldestTx.date : new Date(oldestTx.date);
    const newestDate = newestTx.date instanceof Date ? newestTx.date : new Date(newestTx.date);

    // Calculate FY for oldest date
    let currentYear = oldestDate.getMonth() >= 6 ? oldestDate.getFullYear() : oldestDate.getFullYear() - 1;
    const endYear = newestDate.getMonth() >= 6 ? newestDate.getFullYear() : newestDate.getFullYear() - 1;

    while (currentYear <= endYear) {
      fySet.add(`${currentYear}-${(currentYear + 1).toString().slice(-2)}`);
      currentYear++;
    }

    return Array.from(fySet).sort().reverse();
  }, [memberId]);

  return {
    years: years || [],
    isLoading: years === undefined,
  };
}

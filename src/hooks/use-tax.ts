'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getFinancialYearDates } from '@/lib/utils/financial-year';

/**
 * Get deductible transactions for a financial year
 */
export function useDeductibleTransactions(financialYear: string) {
  const { start, end } = getFinancialYearDates(financialYear);

  const transactions = useLiveQuery(async () => {
    const allTransactions = await db.transactions.toArray();

    return allTransactions.filter((t) => {
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      return t.isDeductible && date >= start && date <= end;
    });
  }, [financialYear]);

  return {
    transactions: transactions || [],
    isLoading: transactions === undefined,
  };
}

/**
 * Get deductions summary by ATO category for a financial year
 */
export function useDeductionsSummary(financialYear: string) {
  const { start, end } = getFinancialYearDates(financialYear);

  const summary = useLiveQuery(async () => {
    const transactions = await db.transactions.toArray();
    const categories = await db.categories.toArray();

    // Filter to deductible transactions in the FY
    const deductible = transactions.filter((t) => {
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      return t.isDeductible && date >= start && date <= end;
    });

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
  }, [financialYear]);

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
 */
export function useCapitalGains(financialYear: string) {
  const { start, end } = getFinancialYearDates(financialYear);

  const data = useLiveQuery(async () => {
    const transactions = await db.investmentTransactions.toArray();

    // Filter to sell transactions in the FY
    const sells = transactions.filter((t) => {
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      return t.type === 'sell' && date >= start && date <= end;
    });

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

    // 50% CGT discount for long-term gains
    const discountedLongTermGains = longTermGains * 0.5;
    const netCapitalGain = shortTermGains + discountedLongTermGains - totalLosses;

    return {
      totalGains,
      totalLosses,
      shortTermGains,
      longTermGains,
      discountedLongTermGains,
      netCapitalGain,
      transactions: sells,
    };
  }, [financialYear]);

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
 */
export function useIncomeSummary(financialYear: string) {
  const { start, end } = getFinancialYearDates(financialYear);

  const summary = useLiveQuery(async () => {
    const transactions = await db.transactions.toArray();
    const investmentTrans = await db.investmentTransactions.toArray();

    // Filter income transactions
    const income = transactions.filter((t) => {
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      return t.type === 'income' && date >= start && date <= end;
    });

    // Filter dividends and distributions
    const dividends = investmentTrans.filter((t) => {
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      return (t.type === 'dividend' || t.type === 'distribution') && date >= start && date <= end;
    });

    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalDividends = dividends.reduce((sum, t) => sum + t.totalAmount, 0);

    return {
      totalIncome,
      totalDividends,
      combinedIncome: totalIncome + totalDividends,
      incomeCount: income.length,
      dividendCount: dividends.length,
    };
  }, [financialYear]);

  return {
    summary: summary || {
      totalIncome: 0,
      totalDividends: 0,
      combinedIncome: 0,
      incomeCount: 0,
      dividendCount: 0,
    },
    isLoading: summary === undefined,
  };
}

/**
 * Get list of available financial years based on transaction data
 */
export function useAvailableFinancialYears() {
  const years = useLiveQuery(async () => {
    const transactions = await db.transactions.toArray();

    if (transactions.length === 0) {
      // Return current and previous FY
      const now = new Date();
      const currentFY = now.getMonth() >= 6
        ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}`
        : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(-2)}`;
      return [currentFY];
    }

    const fySet = new Set<string>();
    for (const t of transactions) {
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      const fy = date.getMonth() >= 6
        ? `${date.getFullYear()}-${(date.getFullYear() + 1).toString().slice(-2)}`
        : `${date.getFullYear() - 1}-${date.getFullYear().toString().slice(-2)}`;
      fySet.add(fy);
    }

    return Array.from(fySet).sort().reverse();
  }, []);

  return {
    years: years || [],
    isLoading: years === undefined,
  };
}

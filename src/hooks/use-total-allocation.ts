'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { CHART_COLORS } from '@/lib/charts/config';

/**
 * Asset class for total allocation breakdown
 */
export interface AssetAllocationSlice {
  key: string;
  label: string;
  value: number; // cents
  valueDollars: number; // dollars (for chart dataKey)
  color: string;
  percentage: number;
  accountCount: number;
  [k: string]: string | number; // recharts index signature
}

export interface TotalAllocationData {
  slices: AssetAllocationSlice[];
  totalAssets: number; // cents
  totalLiabilities: number; // cents
  netWorth: number; // cents
  isLoading: boolean;
}

/**
 * Aggregates all financial data across bank accounts, investments,
 * superannuation, and property into a single asset allocation breakdown.
 *
 * This is the "one-stop" hook for a holistic financial picture.
 */
export function useTotalAssetAllocation(): TotalAllocationData {
  const data = useLiveQuery(async () => {
    // Fetch all data sources in parallel
    const [accounts, holdings, superAccounts, properties, propertyLoans] =
      await Promise.all([
        db.accounts.filter((a) => a.isActive).toArray(),
        db.holdings.toArray(),
        db.superannuationAccounts.toArray(),
        db.properties.where('status').equals('active').toArray(),
        db.propertyLoans.toArray(),
      ]);

    // --- 1. Cash & Banking ---
    const cashAccountTypes = ['bank', 'cash'];
    const cashAccounts = accounts.filter((a) =>
      cashAccountTypes.includes(a.type),
    );
    const cashTotal = cashAccounts.reduce(
      (sum, a) => sum + Math.max(0, a.balance ?? 0),
      0,
    );

    // --- 2. Investments (portfolio) ---
    const investmentTotal = holdings.reduce(
      (sum, h) => sum + (h.currentValue ?? 0),
      0,
    );

    // --- 3. Superannuation ---
    const superTotal = superAccounts.reduce(
      (sum, s) => sum + s.totalBalance,
      0,
    );

    // --- 4. Property (equity = valuation - loans) ---
    // Build loan-balance map per property
    const loansByProperty = new Map<string, number>();
    for (const loan of propertyLoans) {
      const effective =
        loan.currentBalance - (loan.offsetBalance ?? 0);
      const current = loansByProperty.get(loan.propertyId) ?? 0;
      loansByProperty.set(loan.propertyId, current + Math.max(0, effective));
    }

    let propertyValuation = 0;
    let propertyDebt = 0;
    for (const property of properties) {
      propertyValuation += property.valuationAmount;
      propertyDebt += loansByProperty.get(property.id) ?? 0;
    }
    const propertyEquity = Math.max(0, propertyValuation - propertyDebt);

    // --- 5. Other Assets (asset-type accounts, investment accounts) ---
    const otherAssetTypes = ['asset', 'investment', 'crypto'];
    const otherAccounts = accounts.filter((a) =>
      otherAssetTypes.includes(a.type),
    );
    const otherTotal = otherAccounts.reduce(
      (sum, a) => sum + Math.max(0, a.balance ?? 0),
      0,
    );

    // --- Liabilities ---
    const liabilityTypes = ['credit', 'liability'];
    const liabilityAccounts = accounts.filter((a) =>
      liabilityTypes.includes(a.type),
    );
    const totalLiabilities = liabilityAccounts.reduce(
      (sum, a) => sum + Math.abs(a.balance ?? 0),
      0,
    );

    // --- Build slices ---
    const totalAssets =
      cashTotal + investmentTotal + superTotal + propertyEquity + otherTotal;

    const colors = CHART_COLORS.allocation;

    interface RawSlice {
      key: string;
      label: string;
      value: number;
      color: string;
      accountCount: number;
    }

    const rawSlices: RawSlice[] = [
      {
        key: 'cash',
        label: 'Cash & Banking',
        value: cashTotal,
        color: colors.cash,
        accountCount: cashAccounts.length,
      },
      {
        key: 'investments',
        label: 'Investments',
        value: investmentTotal,
        color: colors.investments,
        accountCount: holdings.length,
      },
      {
        key: 'superannuation',
        label: 'Superannuation',
        value: superTotal,
        color: colors.superannuation,
        accountCount: superAccounts.length,
      },
      {
        key: 'property',
        label: 'Property Equity',
        value: propertyEquity,
        color: colors.property,
        accountCount: properties.length,
      },
      {
        key: 'other',
        label: 'Other Assets',
        value: otherTotal,
        color: colors.other,
        accountCount: otherAccounts.length,
      },
    ];

    // Filter out zero-value slices and calculate percentages
    const slices: AssetAllocationSlice[] = rawSlices
      .filter((s) => s.value > 0)
      .map((s) => ({
        ...s,
        valueDollars: s.value / 100,
        percentage: totalAssets > 0 ? (s.value / totalAssets) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      slices,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    };
  }, []);

  return {
    slices: data?.slices ?? [],
    totalAssets: data?.totalAssets ?? 0,
    totalLiabilities: data?.totalLiabilities ?? 0,
    netWorth: data?.netWorth ?? 0,
    isLoading: data === undefined,
  };
}

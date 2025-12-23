'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
  calculateFutureValue,
  calculateRetirementProjection,
  generateProjectionPoints,
  type RetirementProjection,
  type ProjectionPoint,
} from '@/lib/utils/projections';

/**
 * Get net worth projection based on current balances and expected contributions
 */
export function useNetWorthProjection(
  monthlyContributionCents: number = 0,
  expectedReturnRate: number = 0.07,
  months: number = 120 // 10 years default
) {
  const projection = useLiveQuery(
    async () => {
      const accounts = await db.accounts.filter((a) => a.isActive).toArray();

      const totalAssets = accounts
        .filter((a) => ['bank', 'cash', 'investment', 'crypto', 'asset'].includes(a.type))
        .reduce((sum, a) => sum + (a.balance || 0), 0);

      const totalLiabilities = accounts
        .filter((a) => ['credit', 'liability'].includes(a.type))
        .reduce((sum, a) => sum + Math.abs(a.balance || 0), 0);

      const currentNetWorth = totalAssets - totalLiabilities;

      const points = generateProjectionPoints(
        currentNetWorth,
        monthlyContributionCents,
        expectedReturnRate,
        months
      );

      return {
        currentNetWorth,
        projectedNetWorth: points[points.length - 1]?.value || currentNetWorth,
        points,
        totalAssets,
        totalLiabilities,
      };
    },
    [monthlyContributionCents, expectedReturnRate, months]
  );

  return {
    projection: projection ?? {
      currentNetWorth: 0,
      projectedNetWorth: 0,
      points: [] as ProjectionPoint[],
      totalAssets: 0,
      totalLiabilities: 0,
    },
    isLoading: projection === undefined,
  };
}

/**
 * Get retirement projection with Australian superannuation rules
 */
export function useRetirementProjection(
  currentAge: number,
  retirementAge: number = 67,
  monthlySuperContributionCents: number = 0,
  monthlyInvestmentContributionCents: number = 0,
  superReturnRate: number = 0.07,
  investmentReturnRate: number = 0.07,
  targetMonthlyIncomeCents: number = 500000 // $5,000
) {
  const projection = useLiveQuery(
    async () => {
      const [superAccounts, holdings] = await Promise.all([
        db.superannuationAccounts.toArray(),
        db.holdings.toArray(),
      ]);

      const currentSuperBalance = superAccounts.reduce((sum, s) => sum + s.totalBalance, 0);
      const currentInvestments = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);

      return calculateRetirementProjection(
        currentAge,
        retirementAge,
        currentSuperBalance,
        currentInvestments,
        monthlySuperContributionCents,
        monthlyInvestmentContributionCents,
        superReturnRate,
        investmentReturnRate,
        60, // Australian preservation age
        targetMonthlyIncomeCents
      );
    },
    [
      currentAge,
      retirementAge,
      monthlySuperContributionCents,
      monthlyInvestmentContributionCents,
      superReturnRate,
      investmentReturnRate,
      targetMonthlyIncomeCents,
    ]
  );

  return {
    projection: projection ?? null,
    isLoading: projection === undefined,
  };
}

/**
 * Compound interest calculator hook
 * Returns future value, total contributions, and interest earned
 */
export function useCompoundInterest(
  principalCents: number,
  monthlyContributionCents: number,
  annualRate: number,
  years: number
) {
  const result = useLiveQuery(
    async () => {
      const months = years * 12;
      const futureValue = calculateFutureValue(
        principalCents,
        monthlyContributionCents,
        annualRate,
        months
      );

      const totalContributions = principalCents + monthlyContributionCents * months;
      const interestEarned = futureValue - totalContributions;

      const points = generateProjectionPoints(
        principalCents,
        monthlyContributionCents,
        annualRate,
        months
      );

      return {
        futureValue,
        totalContributions,
        interestEarned,
        points,
      };
    },
    [principalCents, monthlyContributionCents, annualRate, years]
  );

  return {
    result: result ?? {
      futureValue: 0,
      totalContributions: 0,
      interestEarned: 0,
      points: [] as ProjectionPoint[],
    },
    isLoading: result === undefined,
  };
}

/**
 * Get current financial summary for projection starting points
 */
export function useFinancialSummary() {
  const summary = useLiveQuery(async () => {
    const [accounts, holdings, superAccounts] = await Promise.all([
      db.accounts.filter((a) => a.isActive).toArray(),
      db.holdings.toArray(),
      db.superannuationAccounts.toArray(),
    ]);

    const bankAccounts = accounts.filter((a) => a.type === 'bank');
    const creditAccounts = accounts.filter((a) => a.type === 'credit');
    const investmentAccounts = accounts.filter((a) => a.type === 'investment');
    const cryptoAccounts = accounts.filter((a) => a.type === 'crypto');
    const assetAccounts = accounts.filter((a) => a.type === 'asset');
    const liabilityAccounts = accounts.filter((a) => a.type === 'liability');

    const bankBalance = bankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const creditBalance = creditAccounts.reduce((sum, a) => sum + Math.abs(a.balance || 0), 0);
    const investmentBalance = investmentAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const cryptoBalance = cryptoAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const assetBalance = assetAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const liabilityBalance = liabilityAccounts.reduce(
      (sum, a) => sum + Math.abs(a.balance || 0),
      0
    );

    const holdingsValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
    const superBalance = superAccounts.reduce((sum, s) => sum + s.totalBalance, 0);

    const totalAssets = bankBalance + investmentBalance + cryptoBalance + assetBalance + holdingsValue;
    const totalLiabilities = creditBalance + liabilityBalance;
    const netWorth = totalAssets - totalLiabilities;
    const netWorthWithSuper = netWorth + superBalance;

    return {
      bankBalance,
      creditBalance,
      investmentBalance,
      cryptoBalance,
      assetBalance,
      liabilityBalance,
      holdingsValue,
      superBalance,
      totalAssets,
      totalLiabilities,
      netWorth,
      netWorthWithSuper,
    };
  }, []);

  return {
    summary: summary ?? {
      bankBalance: 0,
      creditBalance: 0,
      investmentBalance: 0,
      cryptoBalance: 0,
      assetBalance: 0,
      liabilityBalance: 0,
      holdingsValue: 0,
      superBalance: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0,
      netWorthWithSuper: 0,
    },
    isLoading: summary === undefined,
  };
}

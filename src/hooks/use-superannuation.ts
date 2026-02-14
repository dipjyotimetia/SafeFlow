'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { SuperannuationAccount } from '@/types';
import { getCurrentFinancialYear, getFinancialYearDates } from '@/lib/utils/financial-year';
import {
  calculateBringForwardCap,
  calculateCarryForwardConcessional,
  getSuperCapConfig,
} from '@/lib/utils/super-caps';

/**
 * Get all superannuation accounts
 */
export function useSuperAccounts() {
  const accounts = useLiveQuery(async () => {
    return db.superannuationAccounts.toArray();
  }, []);

  return {
    accounts: accounts || [],
    isLoading: accounts === undefined,
  };
}

/**
 * Get a single superannuation account by ID
 */
export function useSuperAccount(id: string | undefined) {
  const account = useLiveQuery(
    async () => (id ? db.superannuationAccounts.get(id) : undefined),
    [id]
  );

  return {
    account,
    isLoading: account === undefined && id !== undefined,
  };
}

/**
 * Get transactions for a superannuation account
 */
export function useSuperTransactions(accountId?: string, financialYear?: string) {
  const transactions = useLiveQuery(async () => {
    let results = await db.superTransactions.toArray();

    if (accountId) {
      results = results.filter((t) => t.superAccountId === accountId);
    }

    if (financialYear) {
      results = results.filter((t) => t.financialYear === financialYear);
    }

    // Sort by date descending
    return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [accountId, financialYear]);

  return {
    transactions: transactions || [],
    isLoading: transactions === undefined,
  };
}

/**
 * Get overall superannuation summary
 */
export function useSuperSummary() {
  const summary = useLiveQuery(async () => {
    const accounts = await db.superannuationAccounts.toArray();
    const currentFY = getCurrentFinancialYear();
    const { start, end } = getFinancialYearDates(currentFY);

    // Get YTD transactions
    const allTransactions = await db.superTransactions.toArray();
    const ytdTransactions = allTransactions.filter((t) => {
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      return date >= start && date <= end;
    });

    let totalBalance = 0;
    let totalPreserved = 0;
    let totalUnrestricted = 0;

    for (const account of accounts) {
      totalBalance += account.totalBalance;
      totalPreserved += account.preservedBalance;
      totalUnrestricted += account.unrestrictedNonPreserved;
    }

    // Calculate YTD contributions and earnings
    let ytdContributions = 0;
    let ytdEarnings = 0;
    let ytdFees = 0;

    const contributionTypes = [
      'employer-sg',
      'employer-additional',
      'salary-sacrifice',
      'personal-concessional',
      'personal-non-concessional',
      'government-co-contribution',
      'spouse-contribution',
    ];

    for (const t of ytdTransactions) {
      if (contributionTypes.includes(t.type)) {
        ytdContributions += Math.abs(t.amount);
      } else if (t.type === 'earnings') {
        ytdEarnings += t.amount;
      } else if (t.type === 'fees' || t.type === 'insurance') {
        ytdFees += Math.abs(t.amount);
      }
    }

    return {
      totalBalance,
      totalPreserved,
      totalUnrestricted,
      accountCount: accounts.length,
      ytdContributions,
      ytdEarnings,
      ytdFees,
      financialYear: currentFY,
    };
  }, []);

  return {
    summary: summary || {
      totalBalance: 0,
      totalPreserved: 0,
      totalUnrestricted: 0,
      accountCount: 0,
      ytdContributions: 0,
      ytdEarnings: 0,
      ytdFees: 0,
      financialYear: getCurrentFinancialYear(),
    },
    isLoading: summary === undefined,
  };
}

/**
 * Get contribution summary for a financial year
 */
export function useContributionSummary(financialYear: string) {
  const summary = useLiveQuery(async () => {
    const [transactions, allTransactions, superAccounts] = await Promise.all([
      db.superTransactions.where('financialYear').equals(financialYear).toArray(),
      db.superTransactions.toArray(),
      db.superannuationAccounts.toArray(),
    ]);

    let employerSG = 0;
    let employerAdditional = 0;
    let salarySacrifice = 0;
    let personalConcessional = 0;
    let personalNonConcessional = 0;
    let governmentCoContribution = 0;
    let spouseContribution = 0;

    for (const t of transactions) {
      const amount = Math.abs(t.amount);
      switch (t.type) {
        case 'employer-sg':
          employerSG += amount;
          break;
        case 'employer-additional':
          employerAdditional += amount;
          break;
        case 'salary-sacrifice':
          salarySacrifice += amount;
          break;
        case 'personal-concessional':
          personalConcessional += amount;
          break;
        case 'personal-non-concessional':
          personalNonConcessional += amount;
          break;
        case 'government-co-contribution':
          governmentCoContribution += amount;
          break;
        case 'spouse-contribution':
          spouseContribution += amount;
          break;
      }
    }

    const totalConcessional = employerSG + employerAdditional + salarySacrifice + personalConcessional;
    const totalNonConcessional = personalNonConcessional + spouseContribution;
    const capConfig = getSuperCapConfig(financialYear);
    const totalSuperBalance = superAccounts.reduce((sum, account) => sum + account.totalBalance, 0);

    const concessionalByFY = allTransactions.reduce<Record<string, number>>((acc, tx) => {
      if (
        tx.type === 'employer-sg' ||
        tx.type === 'employer-additional' ||
        tx.type === 'salary-sacrifice' ||
        tx.type === 'personal-concessional'
      ) {
        acc[tx.financialYear] = (acc[tx.financialYear] || 0) + Math.abs(tx.amount);
      }
      return acc;
    }, {});

    const carryForward = calculateCarryForwardConcessional({
      financialYear,
      concessionalContributionsByFY: concessionalByFY,
      totalSuperBalancePreviousJune30: totalSuperBalance,
    });

    const bringForward = calculateBringForwardCap({
      financialYear,
      totalSuperBalancePreviousJune30: totalSuperBalance,
    });

    const concessionalCap = capConfig.concessionalCap + carryForward.available;
    const nonConcessionalCap = bringForward.availableCap;

    return {
      financialYear,
      employerSG,
      employerAdditional,
      salarySacrifice,
      personalConcessional,
      personalNonConcessional,
      governmentCoContribution,
      spouseContribution,
      totalConcessional,
      totalNonConcessional,
      concessionalCap,
      nonConcessionalCap,
      concessionalRemaining: Math.max(0, concessionalCap - totalConcessional),
      nonConcessionalRemaining: Math.max(0, nonConcessionalCap - totalNonConcessional),
      baseConcessionalCap: capConfig.concessionalCap,
      baseNonConcessionalCap: capConfig.nonConcessionalCap,
      carryForwardAvailable: carryForward.available,
      carryForwardEligible: carryForward.eligible,
      carryForwardReason: carryForward.reason,
      bringForwardYearsAvailable: bringForward.yearsAvailable,
      bringForwardEligible: bringForward.eligible,
      bringForwardReason: bringForward.reason,
      superGuaranteeRate: capConfig.superGuaranteeRate,
      totalSuperBalanceForCapTests: totalSuperBalance,
      transferBalanceCap: capConfig.generalTransferBalanceCap,
    };
  }, [financialYear]);

  const capConfig = getSuperCapConfig(financialYear);
  return {
    summary: summary || {
      financialYear,
      employerSG: 0,
      employerAdditional: 0,
      salarySacrifice: 0,
      personalConcessional: 0,
      personalNonConcessional: 0,
      governmentCoContribution: 0,
      spouseContribution: 0,
      totalConcessional: 0,
      totalNonConcessional: 0,
      concessionalCap: capConfig.concessionalCap,
      nonConcessionalCap: capConfig.nonConcessionalCap,
      concessionalRemaining: capConfig.concessionalCap,
      nonConcessionalRemaining: capConfig.nonConcessionalCap,
      baseConcessionalCap: capConfig.concessionalCap,
      baseNonConcessionalCap: capConfig.nonConcessionalCap,
      carryForwardAvailable: 0,
      carryForwardEligible: true,
      carryForwardReason: undefined,
      bringForwardYearsAvailable: 1,
      bringForwardEligible: true,
      bringForwardReason: undefined,
      superGuaranteeRate: capConfig.superGuaranteeRate,
      totalSuperBalanceForCapTests: 0,
      transferBalanceCap: capConfig.generalTransferBalanceCap,
    },
    isLoading: summary === undefined,
  };
}

/**
 * Get accounts grouped by provider
 */
export function useSuperAccountsByProvider() {
  const grouped = useLiveQuery(async () => {
    const accounts = await db.superannuationAccounts.toArray();

    const groups: Record<string, { accounts: SuperannuationAccount[]; totalBalance: number }> = {};

    for (const account of accounts) {
      if (!groups[account.provider]) {
        groups[account.provider] = { accounts: [], totalBalance: 0 };
      }
      groups[account.provider].accounts.push(account);
      groups[account.provider].totalBalance += account.totalBalance;
    }

    return groups;
  }, []);

  return {
    grouped: grouped || {},
    isLoading: grouped === undefined,
  };
}

/**
 * Get available financial years from super transactions
 */
export function useSuperFinancialYears() {
  const years = useLiveQuery(async () => {
    const transactions = await db.superTransactions.toArray();

    if (transactions.length === 0) {
      return [getCurrentFinancialYear()];
    }

    const fySet = new Set<string>();
    for (const t of transactions) {
      fySet.add(t.financialYear);
    }

    return Array.from(fySet).sort().reverse();
  }, []);

  return {
    years: years || [getCurrentFinancialYear()],
    isLoading: years === undefined,
  };
}

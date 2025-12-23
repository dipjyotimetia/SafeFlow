import { create } from 'zustand';
import { db } from '@/lib/db';
import type {
  SuperannuationAccount,
  SuperTransaction,
  SuperTransactionType,
  SuperProvider,
  ContributionSummary,
  ImportSource,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getFinancialYearForDate } from '@/lib/utils/financial-year';

// Contribution caps for 2024-25 FY (in cents)
const CONCESSIONAL_CAP = 30000 * 100;
const NON_CONCESSIONAL_CAP = 120000 * 100;

// Types that count as concessional contributions
const CONCESSIONAL_TYPES: SuperTransactionType[] = [
  'employer-sg',
  'employer-additional',
  'salary-sacrifice',
  'personal-concessional',
];

// Types that count as non-concessional contributions
const NON_CONCESSIONAL_TYPES: SuperTransactionType[] = [
  'personal-non-concessional',
  'spouse-contribution',
];

// Types that reduce balance
const DEBIT_TYPES: SuperTransactionType[] = [
  'fees',
  'insurance',
  'withdrawal',
  'rollover-out',
];

/**
 * Helper function to recalculate account balance from all transactions.
 * This is the single source of truth for balance calculation.
 * Must be called within a db.transaction context.
 */
async function recalculateAccountBalance(accountId: string): Promise<void> {
  const transactions = await db.superTransactions
    .where('superAccountId')
    .equals(accountId)
    .toArray();

  let totalBalance = 0;
  for (const t of transactions) {
    if (DEBIT_TYPES.includes(t.type)) {
      totalBalance -= Math.abs(t.amount);
    } else {
      totalBalance += t.amount;
    }
  }

  await db.superannuationAccounts.update(accountId, {
    totalBalance,
    preservedBalance: totalBalance, // Simplified - assume all preserved
    updatedAt: new Date(),
  });
}

interface SuperannuationStore {
  // CRUD operations for accounts
  createAccount: (data: {
    provider: SuperProvider;
    providerName: string;
    memberNumber: string;
    accountName?: string;
    investmentOption?: string;
    employerName?: string;
    totalBalance: number;
    preservedBalance?: number;
    restrictedNonPreserved?: number;
    unrestrictedNonPreserved?: number;
    hasLifeInsurance?: boolean;
    hasTpdInsurance?: boolean;
    hasIncomeProtection?: boolean;
  }) => Promise<string>;

  updateAccount: (id: string, data: Partial<SuperannuationAccount>) => Promise<void>;

  deleteAccount: (id: string) => Promise<void>;

  // Transaction operations
  addTransaction: (data: {
    superAccountId: string;
    type: SuperTransactionType;
    amount: number;
    date: Date;
    description?: string;
    employerName?: string;
  }) => Promise<string>;

  bulkImportTransactions: (
    transactions: Array<{
      superAccountId: string;
      type: SuperTransactionType;
      amount: number;
      date: Date;
      description?: string;
      employerName?: string;
      importSource?: ImportSource;
      importBatchId?: string;
    }>
  ) => Promise<{ imported: number; skipped: number }>;

  deleteTransaction: (id: string) => Promise<void>;

  // Update balance after transaction changes
  recalculateBalance: (accountId: string) => Promise<void>;

  // Get contribution summary for a financial year
  getContributionSummary: (financialYear: string) => Promise<ContributionSummary>;
}

export const useSuperannuationStore = create<SuperannuationStore>(() => ({
  createAccount: async (data) => {
    const id = uuidv4();
    const now = new Date();

    await db.superannuationAccounts.add({
      id,
      provider: data.provider,
      providerName: data.providerName,
      memberNumber: data.memberNumber,
      accountName: data.accountName,
      investmentOption: data.investmentOption,
      employerName: data.employerName,
      totalBalance: data.totalBalance,
      preservedBalance: data.preservedBalance ?? data.totalBalance,
      restrictedNonPreserved: data.restrictedNonPreserved ?? 0,
      unrestrictedNonPreserved: data.unrestrictedNonPreserved ?? 0,
      hasLifeInsurance: data.hasLifeInsurance ?? false,
      hasTpdInsurance: data.hasTpdInsurance ?? false,
      hasIncomeProtection: data.hasIncomeProtection ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },

  updateAccount: async (id, data) => {
    await db.superannuationAccounts.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  deleteAccount: async (id) => {
    // Delete related transactions first
    const transactions = await db.superTransactions
      .where('superAccountId')
      .equals(id)
      .toArray();

    await db.superTransactions.bulkDelete(transactions.map((t) => t.id));
    await db.superannuationAccounts.delete(id);
  },

  addTransaction: async (data) => {
    const id = uuidv4();
    const now = new Date();
    const financialYear = getFinancialYearForDate(data.date);

    // Determine if this is a concessional contribution
    const isConcessional = CONCESSIONAL_TYPES.includes(data.type);

    // Wrap in transaction for atomicity
    await db.transaction("rw", [db.superTransactions, db.superannuationAccounts], async () => {
      await db.superTransactions.add({
        id,
        superAccountId: data.superAccountId,
        type: data.type,
        amount: data.amount,
        date: data.date,
        description: data.description,
        financialYear,
        employerName: data.employerName,
        isConcessional,
        createdAt: now,
        updatedAt: now,
      });

      // Recalculate balance from all transactions for consistency
      await recalculateAccountBalance(data.superAccountId);
    });

    return id;
  },

  bulkImportTransactions: async (transactions) => {
    const now = new Date();
    let imported = 0;
    let skipped = 0;

    // Get existing transactions for duplicate detection
    const existingTransactions = await db.superTransactions.toArray();
    const existingKeys = new Set(
      existingTransactions.map(
        (t) => `${t.superAccountId}-${t.date.toISOString()}-${t.amount}-${t.type}`
      )
    );

    const toImport: SuperTransaction[] = [];

    for (const t of transactions) {
      const key = `${t.superAccountId}-${t.date.toISOString()}-${t.amount}-${t.type}`;

      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      const financialYear = getFinancialYearForDate(t.date);
      const isConcessional = CONCESSIONAL_TYPES.includes(t.type);

      toImport.push({
        id: uuidv4(),
        superAccountId: t.superAccountId,
        type: t.type,
        amount: t.amount,
        date: t.date,
        description: t.description,
        financialYear,
        employerName: t.employerName,
        isConcessional,
        importSource: t.importSource,
        importBatchId: t.importBatchId,
        createdAt: now,
        updatedAt: now,
      });
      imported++;
    }

    if (toImport.length > 0) {
      // Wrap in transaction for atomicity
      await db.transaction("rw", [db.superTransactions, db.superannuationAccounts], async () => {
        await db.superTransactions.bulkAdd(toImport);

        // Recalculate balances for all affected accounts
        const accountIds = [...new Set(toImport.map((t) => t.superAccountId))];
        for (const accountId of accountIds) {
          await recalculateAccountBalance(accountId);
        }
      });
    }

    return { imported, skipped };
  },

  deleteTransaction: async (id) => {
    const transaction = await db.superTransactions.get(id);
    if (!transaction) return;

    // Wrap in transaction for atomicity
    await db.transaction("rw", [db.superTransactions, db.superannuationAccounts], async () => {
      await db.superTransactions.delete(id);
      await recalculateAccountBalance(transaction.superAccountId);
    });
  },

  recalculateBalance: async (accountId) => {
    // Use the centralized helper function for consistency
    await recalculateAccountBalance(accountId);
  },

  getContributionSummary: async (financialYear) => {
    const transactions = await db.superTransactions
      .where('financialYear')
      .equals(financialYear)
      .toArray();

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
      concessionalCap: CONCESSIONAL_CAP,
      nonConcessionalCap: NON_CONCESSIONAL_CAP,
      concessionalRemaining: Math.max(0, CONCESSIONAL_CAP - totalConcessional),
      nonConcessionalRemaining: Math.max(0, NON_CONCESSIONAL_CAP - totalNonConcessional),
    };
  },
}));

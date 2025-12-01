import { create } from 'zustand';
import { db } from '@/lib/db';
import { categorizationService } from '@/lib/ai/categorization';
import type { Transaction, TransactionType, FilterOptions } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface TransactionStore {
  // Filter state
  filters: FilterOptions;
  setFilters: (filters: Partial<FilterOptions>) => void;
  clearFilters: () => void;

  // Selected transactions (for bulk operations)
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;

  // CRUD operations
  createTransaction: (data: {
    accountId: string;
    type: TransactionType;
    amount: number;
    description: string;
    date: Date;
    categoryId?: string;
    merchantName?: string;
    notes?: string;
    isDeductible?: boolean;
    gstAmount?: number;
    atoCategory?: string;
  }) => Promise<string>;

  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;

  deleteTransaction: (id: string) => Promise<void>;

  deleteTransactions: (ids: string[]) => Promise<void>;

  // Bulk import
  importTransactions: (
    transactions: Array<{
      accountId: string;
      type: TransactionType;
      amount: number;
      description: string;
      date: Date;
      categoryId?: string;
      merchantName?: string;
      originalDescription?: string;
    }>,
    batchId: string,
    importSource: string
  ) => Promise<number>;

  // Undo import
  deleteImportBatch: (batchId: string) => Promise<number>;

  // Simple bulk import with duplicate detection
  bulkImport: (
    transactions: Array<{
      accountId: string;
      type: TransactionType;
      amount: number;
      description: string;
      date: string;
      notes?: string;
    }>
  ) => Promise<{ imported: number; skipped: number }>;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  filters: {},

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  clearFilters: () => set({ filters: {} }),

  selectedIds: new Set(),

  toggleSelected: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedIds: newSet };
    }),

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),

  clearSelection: () => set({ selectedIds: new Set() }),

  createTransaction: async (data) => {
    const id = uuidv4();
    const now = new Date();

    await db.transactions.add({
      id,
      accountId: data.accountId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      merchantName: data.merchantName,
      date: data.date,
      notes: data.notes,
      isDeductible: data.isDeductible,
      gstAmount: data.gstAmount,
      atoCategory: data.atoCategory,
      importSource: 'manual',
      isReconciled: false,
      createdAt: now,
      updatedAt: now,
    });

    // Update account balance
    const account = await db.accounts.get(data.accountId);
    if (account) {
      const balanceChange = data.type === 'income' ? data.amount : -data.amount;
      await db.accounts.update(data.accountId, {
        balance: account.balance + balanceChange,
        updatedAt: now,
      });
    }

    return id;
  },

  updateTransaction: async (id, data) => {
    // If category is being changed, learn from the user correction
    if (data.categoryId) {
      const existingTransaction = await db.transactions.get(id);
      if (existingTransaction && existingTransaction.categoryId !== data.categoryId) {
        // User is changing the category - learn from this correction
        try {
          await categorizationService.learnFromUserCorrection(id, data.categoryId);
        } catch (error) {
          console.error('Failed to learn from user correction:', error);
        }
      }
    }

    await db.transactions.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  deleteTransaction: async (id) => {
    const transaction = await db.transactions.get(id);
    if (transaction) {
      // Reverse the balance change
      const account = await db.accounts.get(transaction.accountId);
      if (account) {
        const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
        await db.accounts.update(transaction.accountId, {
          balance: account.balance + balanceChange,
          updatedAt: new Date(),
        });
      }

      await db.transactions.delete(id);
    }
  },

  deleteTransactions: async (ids) => {
    for (const id of ids) {
      await get().deleteTransaction(id);
    }
    set({ selectedIds: new Set() });
  },

  importTransactions: async (transactions, batchId, importSource) => {
    const now = new Date();

    const records: Transaction[] = transactions.map((t) => ({
      id: uuidv4(),
      accountId: t.accountId,
      categoryId: t.categoryId,
      type: t.type,
      amount: t.amount,
      description: t.description,
      merchantName: t.merchantName,
      date: t.date,
      originalDescription: t.originalDescription,
      importSource: importSource as Transaction['importSource'],
      importBatchId: batchId,
      importedAt: now,
      isReconciled: false,
      createdAt: now,
      updatedAt: now,
    }));

    await db.transactions.bulkAdd(records);

    // Track the import batch
    await db.importBatches.add({
      id: batchId,
      source: importSource,
      fileName: '',
      transactionCount: records.length,
      importedAt: now,
      status: 'completed',
    });

    return records.length;
  },

  deleteImportBatch: async (batchId) => {
    const transactions = await db.transactions
      .where('importBatchId')
      .equals(batchId)
      .toArray();

    const ids = transactions.map((t) => t.id);
    await db.transactions.bulkDelete(ids);

    await db.importBatches.update(batchId, { status: 'failed' });

    return ids.length;
  },

  bulkImport: async (transactions) => {
    const now = new Date();
    const batchId = uuidv4();
    let imported = 0;
    let skipped = 0;

    // Get existing transactions for duplicate detection
    const existingTransactions = await db.transactions.toArray();

    // Create a key for each existing transaction for duplicate detection
    const existingKeys = new Set(
      existingTransactions.map((t) => {
        const date = t.date instanceof Date ? t.date : new Date(t.date);
        return `${t.accountId}_${date.toISOString().split('T')[0]}_${t.amount}_${t.description.substring(0, 50)}`;
      })
    );

    const recordsToAdd: Transaction[] = [];

    for (const t of transactions) {
      const date = new Date(t.date);
      const key = `${t.accountId}_${date.toISOString().split('T')[0]}_${t.amount}_${t.description.substring(0, 50)}`;

      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      existingKeys.add(key);

      recordsToAdd.push({
        id: uuidv4(),
        accountId: t.accountId,
        type: t.type,
        amount: t.amount,
        description: t.description,
        date,
        notes: t.notes,
        importSource: 'pdf',
        importBatchId: batchId,
        importedAt: now,
        isReconciled: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (recordsToAdd.length > 0) {
      await db.transactions.bulkAdd(recordsToAdd);
      imported = recordsToAdd.length;

      // Track the import batch
      await db.importBatches.add({
        id: batchId,
        source: 'pdf',
        fileName: '',
        transactionCount: imported,
        importedAt: now,
        status: 'completed',
      });

      // Update account balances
      const accountUpdates = new Map<string, number>();
      for (const t of recordsToAdd) {
        const change = t.type === 'income' ? t.amount : -t.amount;
        accountUpdates.set(t.accountId, (accountUpdates.get(t.accountId) || 0) + change);
      }

      for (const [accountId, change] of accountUpdates) {
        const account = await db.accounts.get(accountId);
        if (account) {
          await db.accounts.update(accountId, {
            balance: account.balance + change,
            updatedAt: now,
          });
        }
      }

      // Queue uncategorized transactions for AI categorization
      const uncategorizedIds = recordsToAdd
        .filter((t) => !t.categoryId)
        .map((t) => t.id);

      if (uncategorizedIds.length > 0) {
        try {
          await categorizationService.queueForCategorization(uncategorizedIds);
          toast.info(`Queued ${uncategorizedIds.length} transactions for AI categorization`);
        } catch (error) {
          console.error('Failed to queue for categorization:', error);
        }
      }
    }

    return { imported, skipped };
  },
}));

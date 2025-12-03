import { create } from 'zustand';
import { z } from 'zod';
import { db } from '@/lib/db';
import { llmCategorizationService } from '@/lib/ai/llm-categorization';
import type { Transaction, TransactionType, FilterOptions } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { transactionCreateSchema, transactionUpdateSchema } from '@/lib/schemas';
import { logError, ErrorCode, SafeFlowError } from '@/lib/errors';

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
    // Validate input data
    const validationResult = transactionCreateSchema.safeParse(data);
    if (!validationResult.success) {
      const errorMessage = z.prettifyError(validationResult.error);
      throw new SafeFlowError(
        `Validation failed for createTransaction: ${errorMessage}`,
        ErrorCode.VALIDATION_FAILED
      );
    }

    const validData = validationResult.data;
    const id = uuidv4();
    const now = new Date();

    try {
      await db.transactions.add({
        id,
        accountId: validData.accountId,
        categoryId: validData.categoryId,
        type: validData.type,
        amount: validData.amount,
        description: validData.description,
        merchantName: validData.merchantName,
        date: validData.date,
        notes: validData.notes,
        isDeductible: validData.isDeductible,
        gstAmount: validData.gstAmount,
        atoCategory: validData.atoCategory,
        importSource: 'manual',
        isReconciled: false,
        createdAt: now,
        updatedAt: now,
      });

      // Update account balance
      const account = await db.accounts.get(validData.accountId);
      if (account) {
        const balanceChange = validData.type === 'income' ? validData.amount : -validData.amount;
        await db.accounts.update(validData.accountId, {
          balance: account.balance + balanceChange,
          updatedAt: now,
        });
      }

      return id;
    } catch (error) {
      logError('createTransaction', error);
      throw new SafeFlowError(
        'Failed to create transaction',
        ErrorCode.DB_OPERATION_FAILED,
        { cause: error instanceof Error ? error : undefined }
      );
    }
  },

  updateTransaction: async (id, data) => {
    // Validate update data if provided
    if (Object.keys(data).length > 0) {
      const validationResult = transactionUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        const errorMessage = z.prettifyError(validationResult.error);
        throw new SafeFlowError(
          `Validation failed for updateTransaction: ${errorMessage}`,
          ErrorCode.VALIDATION_FAILED
        );
      }
    }

    try {
      // If category is being changed, learn from the user correction
      if (data.categoryId) {
        const existingTransaction = await db.transactions.get(id);
        if (existingTransaction && existingTransaction.categoryId !== data.categoryId) {
          // User is changing the category - learn from this correction
          try {
            await llmCategorizationService.learnFromUserCorrection(id, data.categoryId);
          } catch (error) {
            logError('learnFromUserCorrection', error);
          }
        }
      }

      await db.transactions.update(id, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      logError('updateTransaction', error);
      throw new SafeFlowError(
        'Failed to update transaction',
        ErrorCode.DB_OPERATION_FAILED,
        { cause: error instanceof Error ? error : undefined }
      );
    }
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
    if (ids.length === 0) {
      set({ selectedIds: new Set() });
      return;
    }

    // Wrap all deletions in a single transaction to ensure atomicity
    await db.transaction('rw', [db.transactions, db.accounts], async () => {
      // Get all transactions to be deleted
      const transactions = await db.transactions.bulkGet(ids);

      // Calculate balance changes per account
      const accountUpdates = new Map<string, number>();
      for (const transaction of transactions) {
        if (transaction) {
          const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
          accountUpdates.set(
            transaction.accountId,
            (accountUpdates.get(transaction.accountId) || 0) + balanceChange
          );
        }
      }

      // Delete all transactions
      await db.transactions.bulkDelete(ids);

      // Update all account balances
      const now = new Date();
      for (const [accountId, change] of accountUpdates) {
        const account = await db.accounts.get(accountId);
        if (account) {
          await db.accounts.update(accountId, {
            balance: account.balance + change,
            updatedAt: now,
          });
        }
      }
    });

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

    // Get unique account IDs from incoming transactions
    const accountIds = [...new Set(transactions.map((t) => t.accountId))];

    // Only load transactions for the relevant accounts (more efficient)
    const existingTransactions = await db.transactions
      .where('accountId')
      .anyOf(accountIds)
      .toArray();

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
      // Wrap all operations in a single transaction to ensure atomicity
      await db.transaction('rw', [db.transactions, db.accounts, db.importBatches], async () => {
        // Add all transactions
        await db.transactions.bulkAdd(recordsToAdd);

        // Track the import batch
        await db.importBatches.add({
          id: batchId,
          source: 'pdf',
          fileName: '',
          transactionCount: recordsToAdd.length,
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
      });

      imported = recordsToAdd.length;

      // Auto-categorize transactions using LLM (outside transaction)
      const uncategorizedTransactions = recordsToAdd.filter((t) => !t.categoryId);

      if (uncategorizedTransactions.length > 0) {
        try {
          // Check if AI is available
          const isAvailable = await llmCategorizationService.checkAvailability();

          if (isAvailable) {
            const categorizations = await llmCategorizationService.categorizeTransactions(
              uncategorizedTransactions
            );

            // Apply categorizations to transactions
            if (categorizations.size > 0) {
              const updateNow = new Date();
              await Promise.all(
                Array.from(categorizations.entries()).map(([txId, result]) =>
                  db.transactions.update(txId, {
                    categoryId: result.categoryId,
                    updatedAt: updateNow,
                  })
                )
              );
              toast.success(`AI categorized ${categorizations.size} transaction(s)`);
            }

            const uncategorizedCount = uncategorizedTransactions.length - categorizations.size;
            if (uncategorizedCount > 0) {
              toast.info(`${uncategorizedCount} transaction(s) need manual categorization`);
            }
          } else {
            toast.info('AI unavailable - categorize transactions manually or start Ollama');
          }
        } catch (error) {
          console.error('Failed to auto-categorize:', error);
          toast.info('Auto-categorization failed - categorize manually');
        }
      }
    }

    return { imported, skipped };
  },
}));

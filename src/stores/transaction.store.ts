import { llmCategorizationService } from "@/lib/ai/llm-categorization";
import { db } from "@/lib/db";
import { ErrorCode, logError, SafeFlowError } from "@/lib/errors";
import {
  transactionCreateSchema,
  transactionUpdateSchema,
} from "@/lib/schemas";
import type { FilterOptions, Transaction, TransactionType } from "@/types";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { create } from "zustand";

type BulkImportDedupInput = {
  accountId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: Date;
};

export function buildBulkImportDedupKey(input: BulkImportDedupInput): string {
  const normalizedDescription = input.description
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return [
    input.accountId,
    input.type,
    input.date.toISOString().split("T")[0],
    input.amount,
    normalizedDescription,
  ].join("_");
}

type TransactionBalanceFields = Pick<
  Transaction,
  "type" | "amount" | "accountId" | "transferToAccountId"
>;

function addAccountDelta(deltas: Map<string, number>, accountId: string, delta: number): void {
  if (!delta) return;
  deltas.set(accountId, (deltas.get(accountId) || 0) + delta);
}

/**
 * Apply or reverse transaction effect on account balances.
 * direction = 1 applies the transaction, direction = -1 reverses it.
 */
function applyTransactionBalanceDelta(
  tx: TransactionBalanceFields,
  deltas: Map<string, number>,
  direction: 1 | -1 = 1
): void {
  if (tx.type === "transfer" && tx.transferToAccountId) {
    addAccountDelta(deltas, tx.accountId, -tx.amount * direction);
    addAccountDelta(deltas, tx.transferToAccountId, tx.amount * direction);
    return;
  }

  const sourceDelta =
    tx.type === "income" ? tx.amount * direction : -tx.amount * direction;
  addAccountDelta(deltas, tx.accountId, sourceDelta);
}

async function applyAccountDeltas(
  deltas: Map<string, number>,
  updatedAt: Date
): Promise<void> {
  for (const [accountId, delta] of deltas) {
    const account = await db.accounts.get(accountId);
    if (!account) continue;
    await db.accounts.update(accountId, {
      balance: account.balance + delta,
      updatedAt,
    });
  }
}

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
    transferToAccountId?: string;
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
    }>,
    memberId?: string
  ) => Promise<{ imported: number; skipped: number }>;
}

export const useTransactionStore = create<TransactionStore>((set) => ({
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
      // Validate that the source account exists
      const account = await db.accounts.get(validData.accountId);
      if (!account) {
        throw new SafeFlowError(
          `Account not found: ${validData.accountId}`,
          ErrorCode.VALIDATION_FAILED
        );
      }

      // Validate category exists if provided
      if (validData.categoryId) {
        const category = await db.categories.get(validData.categoryId);
        if (!category) {
          throw new SafeFlowError(
            `Category not found: ${validData.categoryId}`,
            ErrorCode.VALIDATION_FAILED
          );
        }
      }

      // Transfer-specific validations
      if (validData.type === "transfer") {
        if (!validData.transferToAccountId) {
          throw new SafeFlowError(
            "Transfer transactions require a destination account (transferToAccountId)",
            ErrorCode.VALIDATION_FAILED
          );
        }

        if (validData.transferToAccountId === validData.accountId) {
          throw new SafeFlowError(
            "Cannot transfer to the same account",
            ErrorCode.VALIDATION_FAILED
          );
        }

        // Validate destination account exists
        const destAccount = await db.accounts.get(validData.transferToAccountId);
        if (!destAccount) {
          throw new SafeFlowError(
            `Destination account not found: ${validData.transferToAccountId}`,
            ErrorCode.VALIDATION_FAILED
          );
        }
      }

      // Wrap in transaction for atomicity - if balance update fails, transaction is rolled back
      await db.transaction("rw", [db.transactions, db.accounts], async () => {
        const createdTransaction: TransactionBalanceFields = {
          accountId: validData.accountId,
          type: validData.type,
          amount: validData.amount,
          transferToAccountId: validData.transferToAccountId,
        };

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
          transferToAccountId: validData.transferToAccountId,
          importSource: "manual",
          isReconciled: false,
          createdAt: now,
          updatedAt: now,
        });

        const deltas = new Map<string, number>();
        applyTransactionBalanceDelta(createdTransaction, deltas, 1);
        await applyAccountDeltas(deltas, now);
      });

      return id;
    } catch (error) {
      logError("createTransaction", error);
      if (error instanceof SafeFlowError) {
        throw error;
      }
      throw new SafeFlowError(
        "Failed to create transaction",
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
        if (
          existingTransaction &&
          existingTransaction.categoryId !== data.categoryId
        ) {
          // User is changing the category - learn from this correction
          try {
            await llmCategorizationService.learnFromUserCorrection(
              id,
              data.categoryId
            );
          } catch (error) {
            logError("learnFromUserCorrection", error);
          }
        }
      }

      await db.transaction("rw", [db.transactions, db.accounts], async () => {
        const existingTransaction = await db.transactions.get(id);
        if (!existingTransaction) {
          throw new SafeFlowError(
            `Transaction not found: ${id}`,
            ErrorCode.DB_NOT_FOUND
          );
        }

        const merged: Transaction = {
          ...existingTransaction,
          ...data,
        };

        const sourceAccount = await db.accounts.get(merged.accountId);
        if (!sourceAccount) {
          throw new SafeFlowError(
            `Account not found: ${merged.accountId}`,
            ErrorCode.VALIDATION_FAILED
          );
        }

        if (merged.categoryId) {
          const category = await db.categories.get(merged.categoryId);
          if (!category) {
            throw new SafeFlowError(
              `Category not found: ${merged.categoryId}`,
              ErrorCode.VALIDATION_FAILED
            );
          }
        }

        if (merged.type === "transfer") {
          if (!merged.transferToAccountId) {
            throw new SafeFlowError(
              "Transfer transactions require a destination account (transferToAccountId)",
              ErrorCode.VALIDATION_FAILED
            );
          }

          if (merged.transferToAccountId === merged.accountId) {
            throw new SafeFlowError(
              "Cannot transfer to the same account",
              ErrorCode.VALIDATION_FAILED
            );
          }

          const destination = await db.accounts.get(merged.transferToAccountId);
          if (!destination) {
            throw new SafeFlowError(
              `Destination account not found: ${merged.transferToAccountId}`,
              ErrorCode.VALIDATION_FAILED
            );
          }
        }

        const now = new Date();
        const deltas = new Map<string, number>();
        applyTransactionBalanceDelta(existingTransaction, deltas, -1);
        applyTransactionBalanceDelta(merged, deltas, 1);

        await db.transactions.update(id, {
          ...data,
          updatedAt: now,
        });
        await applyAccountDeltas(deltas, now);
      });
    } catch (error) {
      logError("updateTransaction", error);
      throw new SafeFlowError(
        "Failed to update transaction",
        ErrorCode.DB_OPERATION_FAILED,
        { cause: error instanceof Error ? error : undefined }
      );
    }
  },

  deleteTransaction: async (id) => {
    // Wrap in transaction for atomicity - balance update and deletion succeed/fail together
    await db.transaction("rw", [db.transactions, db.accounts], async () => {
      const transaction = await db.transactions.get(id);
      if (transaction) {
        const now = new Date();
        const deltas = new Map<string, number>();
        applyTransactionBalanceDelta(transaction, deltas, -1);
        await applyAccountDeltas(deltas, now);

        await db.transactions.delete(id);
      }
    });
  },

  deleteTransactions: async (ids) => {
    if (ids.length === 0) {
      set({ selectedIds: new Set() });
      return;
    }

    // Wrap all deletions in a single transaction to ensure atomicity
    await db.transaction("rw", [db.transactions, db.accounts], async () => {
      // Get all transactions to be deleted
      const transactions = await db.transactions.bulkGet(ids);

      // Calculate balance changes per account
      const accountUpdates = new Map<string, number>();
      for (const transaction of transactions) {
        if (transaction) {
          applyTransactionBalanceDelta(transaction, accountUpdates, -1);
        }
      }

      // Delete all transactions
      await db.transactions.bulkDelete(ids);

      // Update all account balances
      const now = new Date();
      await applyAccountDeltas(accountUpdates, now);
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
      importSource: importSource as Transaction["importSource"],
      importBatchId: batchId,
      importedAt: now,
      isReconciled: false,
      createdAt: now,
      updatedAt: now,
    }));

    await db.transaction("rw", [db.transactions, db.importBatches, db.accounts], async () => {
      await db.transactions.bulkAdd(records);

      // Track the import batch
      await db.importBatches.add({
        id: batchId,
        source: importSource,
        fileName: "",
        transactionCount: records.length,
        importedAt: now,
        status: "completed",
      });

      const deltas = new Map<string, number>();
      for (const record of records) {
        applyTransactionBalanceDelta(record, deltas, 1);
      }
      await applyAccountDeltas(deltas, now);
    });

    return records.length;
  },

  deleteImportBatch: async (batchId) => {
    const transactions = await db.transactions
      .where("importBatchId")
      .equals(batchId)
      .toArray();

    const ids = transactions.map((t) => t.id);
    const now = new Date();

    await db.transaction("rw", [db.transactions, db.importBatches, db.accounts], async () => {
      const deltas = new Map<string, number>();
      for (const transaction of transactions) {
        applyTransactionBalanceDelta(transaction, deltas, -1);
      }

      await db.transactions.bulkDelete(ids);
      await applyAccountDeltas(deltas, now);
      await db.importBatches.update(batchId, { status: "failed" });
    });

    return ids.length;
  },

  bulkImport: async (transactions, memberId) => {
    const now = new Date();
    const batchId = uuidv4();
    let imported = 0;
    let skipped = 0;

    // Get unique account IDs from incoming transactions
    const accountIds = [...new Set(transactions.map((t) => t.accountId))];

    // Only load transactions for the relevant accounts (more efficient)
    const existingTransactions = await db.transactions
      .where("accountId")
      .anyOf(accountIds)
      .toArray();

    // Track existing duplicate counts by exact normalized key.
    // Using counts avoids dropping legitimate same-day repeats when only part
    // of that key set already exists in the database.
    const existingKeyCounts = new Map<string, number>();
    for (const t of existingTransactions) {
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      const key = buildBulkImportDedupKey({
        accountId: t.accountId,
        type: t.type,
        amount: t.amount,
        description: t.description,
        date,
      });
      existingKeyCounts.set(key, (existingKeyCounts.get(key) ?? 0) + 1);
    }
    const incomingKeyCounts = new Map<string, number>();

    const recordsToAdd: Transaction[] = [];

    for (const t of transactions) {
      const date = new Date(t.date);
      const key = buildBulkImportDedupKey({
        accountId: t.accountId,
        type: t.type,
        amount: t.amount,
        description: t.description,
        date,
      });

      const seenInIncoming = incomingKeyCounts.get(key) ?? 0;
      const existingCount = existingKeyCounts.get(key) ?? 0;

      if (seenInIncoming < existingCount) {
        incomingKeyCounts.set(key, seenInIncoming + 1);
        skipped++;
        continue;
      }

      incomingKeyCounts.set(key, seenInIncoming + 1);

      recordsToAdd.push({
        id: uuidv4(),
        accountId: t.accountId,
        type: t.type,
        amount: t.amount,
        description: t.description,
        date,
        notes: t.notes,
        memberId,
        importSource: "pdf",
        importBatchId: batchId,
        importedAt: now,
        isReconciled: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (recordsToAdd.length > 0) {
      // Wrap all operations in a single transaction to ensure atomicity
      await db.transaction(
        "rw",
        [db.transactions, db.accounts, db.importBatches],
        async () => {
          // Add all transactions
          await db.transactions.bulkAdd(recordsToAdd);

          // Track the import batch
          await db.importBatches.add({
            id: batchId,
            source: "pdf",
            fileName: "",
            transactionCount: recordsToAdd.length,
            importedAt: now,
            status: "completed",
          });

          // Update account balances
          const accountUpdates = new Map<string, number>();
          for (const t of recordsToAdd) {
            const change = t.type === "income" ? t.amount : -t.amount;
            accountUpdates.set(
              t.accountId,
              (accountUpdates.get(t.accountId) || 0) + change
            );
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
        }
      );

      imported = recordsToAdd.length;

      // Auto-categorize transactions using LLM (outside transaction)
      const uncategorizedTransactions = recordsToAdd.filter(
        (t) => !t.categoryId
      );

      if (uncategorizedTransactions.length > 0) {
        try {
          // Check if AI is available
          const isAvailable =
            await llmCategorizationService.checkAvailability();

          if (isAvailable) {
            const categorizations =
              await llmCategorizationService.categorizeTransactions(
                uncategorizedTransactions
              );

            // Apply categorizations to transactions
            if (categorizations.size > 0) {
              const updateNow = new Date();
              const results = await Promise.allSettled(
                Array.from(categorizations.entries()).map(([txId, result]) =>
                  db.transactions.update(txId, {
                    categoryId: result.categoryId,
                    updatedAt: updateNow,
                  })
                )
              );

              // Count successful and failed updates
              const successful = results.filter(
                (r) => r.status === "fulfilled"
              ).length;
              const failed = results.filter(
                (r) => r.status === "rejected"
              ).length;

              if (failed > 0) {
                console.error(
                  `[TransactionStore] ${failed} categorization update(s) failed`
                );
                toast.success(
                  `AI categorized ${successful} transaction(s) (${failed} failed)`
                );
              } else {
                toast.success(
                  `AI categorized ${successful} transaction(s)`
                );
              }
            }

            const uncategorizedCount =
              uncategorizedTransactions.length - categorizations.size;
            if (uncategorizedCount > 0) {
              toast.info(
                `${uncategorizedCount} transaction(s) need manual categorization`
              );
            }
          } else {
            toast.info(
              "AI unavailable - categorize transactions manually or start Ollama"
            );
          }
        } catch (error) {
          console.error("Failed to auto-categorize:", error);
          toast.info("Auto-categorization failed - categorize manually");
        }
      }
    }

    return { imported, skipped };
  },
}));

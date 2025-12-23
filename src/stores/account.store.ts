import { db } from "@/lib/db";
import type { Account, AccountType, AccountVisibility } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

interface AccountStore {
  // State
  selectedAccountId: string | null;
  isLoading: boolean;

  // Actions
  setSelectedAccount: (id: string | null) => void;

  // CRUD operations
  createAccount: (data: {
    name: string;
    type: AccountType;
    institution?: string;
    balance?: number;
    memberId?: string;
    visibility?: AccountVisibility;
  }) => Promise<string>;

  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;

  deleteAccount: (id: string, options?: { cascade?: boolean }) => Promise<void>;

  hardDeleteAccount: (id: string) => Promise<void>;

  updateBalance: (id: string, balance: number) => Promise<void>;
}

export const useAccountStore = create<AccountStore>((set) => ({
  selectedAccountId: null,
  isLoading: false,

  setSelectedAccount: (id) => set({ selectedAccountId: id }),

  createAccount: async (data) => {
    const id = uuidv4();
    const now = new Date();

    await db.accounts.add({
      id,
      name: data.name,
      type: data.type,
      institution: data.institution,
      balance: data.balance ?? 0,
      currency: "AUD",
      isActive: true,
      memberId: data.memberId,
      visibility: data.visibility ?? (data.memberId ? "private" : "shared"),
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },

  updateAccount: async (id, data) => {
    await db.accounts.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  deleteAccount: async (id, options = { cascade: true }) => {
    const now = new Date();

    if (options.cascade) {
      // Cascade soft delete: mark related records inactive/deleted
      await db.transaction(
        "rw",
        [db.accounts, db.transactions, db.holdings, db.investmentTransactions, db.priceHistory],
        async () => {
          // Get holdings for this account to cascade to investment transactions
          const holdings = await db.holdings.where("accountId").equals(id).toArray();
          const holdingIds = holdings.map((h) => h.id);

          // Delete investment transactions for these holdings
          if (holdingIds.length > 0) {
            await db.investmentTransactions
              .where("holdingId")
              .anyOf(holdingIds)
              .delete();

            // Delete price history for these holdings
            await db.priceHistory
              .where("holdingId")
              .anyOf(holdingIds)
              .delete();
          }

          // Delete holdings for this account
          await db.holdings.where("accountId").equals(id).delete();

          // Delete transactions for this account
          await db.transactions.where("accountId").equals(id).delete();

          // Soft delete the account
          await db.accounts.update(id, {
            isActive: false,
            updatedAt: now,
          });
        }
      );
    } else {
      // Soft delete only the account
      await db.accounts.update(id, {
        isActive: false,
        updatedAt: now,
      });
    }
  },

  hardDeleteAccount: async (id) => {
    // Hard delete account and all related data
    await db.transaction(
      "rw",
      [db.accounts, db.transactions, db.holdings, db.investmentTransactions, db.priceHistory],
      async () => {
        // Get holdings for this account to cascade to investment transactions
        const holdings = await db.holdings.where("accountId").equals(id).toArray();
        const holdingIds = holdings.map((h) => h.id);

        // Delete investment transactions for these holdings
        if (holdingIds.length > 0) {
          await db.investmentTransactions
            .where("holdingId")
            .anyOf(holdingIds)
            .delete();

          // Delete price history for these holdings
          await db.priceHistory
            .where("holdingId")
            .anyOf(holdingIds)
            .delete();
        }

        // Delete holdings for this account
        await db.holdings.where("accountId").equals(id).delete();

        // Delete transactions for this account
        await db.transactions.where("accountId").equals(id).delete();

        // Hard delete the account
        await db.accounts.delete(id);
      }
    );
  },

  updateBalance: async (id, balance) => {
    await db.accounts.update(id, {
      balance,
      updatedAt: new Date(),
    });
  },
}));

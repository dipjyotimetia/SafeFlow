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

  deleteAccount: (id: string) => Promise<void>;

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

  deleteAccount: async (id) => {
    // Soft delete by marking inactive
    await db.accounts.update(id, {
      isActive: false,
      updatedAt: new Date(),
    });
  },

  updateBalance: async (id, balance) => {
    await db.accounts.update(id, {
      balance,
      updatedAt: new Date(),
    });
  },
}));

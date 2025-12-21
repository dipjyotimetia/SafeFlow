import { create } from 'zustand';
import { db } from '@/lib/db';
import type { Budget, BudgetPeriod } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface BudgetStore {
  // CRUD operations
  createBudget: (data: {
    name: string;
    categoryId?: string;
    amount: number;
    period: BudgetPeriod;
    memberId?: string;
  }) => Promise<string>;

  updateBudget: (id: string, data: Partial<Budget>) => Promise<void>;

  deleteBudget: (id: string) => Promise<void>;

  // Toggle active state
  toggleBudgetActive: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetStore>(() => ({
  createBudget: async (data) => {
    const id = uuidv4();
    const now = new Date();

    await db.budgets.add({
      id,
      name: data.name,
      categoryId: data.categoryId,
      amount: data.amount,
      period: data.period,
      memberId: data.memberId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },

  updateBudget: async (id, data) => {
    await db.budgets.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  deleteBudget: async (id) => {
    await db.budgets.delete(id);
  },

  toggleBudgetActive: async (id) => {
    const budget = await db.budgets.get(id);
    if (budget) {
      await db.budgets.update(id, {
        isActive: !budget.isActive,
        updatedAt: new Date(),
      });
    }
  },
}));

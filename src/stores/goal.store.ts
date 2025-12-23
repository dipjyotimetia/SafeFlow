import { create } from 'zustand';
import { db } from '@/lib/db';
import type { Goal, GoalType, GoalStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface GoalStore {
  // CRUD operations
  createGoal: (data: {
    name: string;
    type: GoalType;
    targetAmount: number; // cents
    targetDate?: Date;
    monthlyContribution?: number; // cents
    expectedReturnRate?: number; // e.g., 0.07 for 7%
    retirementAge?: number;
    preservationAge?: number;
    includeSuperannuation?: boolean;
    linkedAccountIds?: string[];
    linkedHoldingIds?: string[];
    notes?: string;
    color?: string;
    icon?: string;
  }) => Promise<string>;

  updateGoal: (
    id: string,
    data: Partial<Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;

  deleteGoal: (id: string) => Promise<void>;

  // Status changes
  achieveGoal: (id: string) => Promise<void>;
  pauseGoal: (id: string) => Promise<void>;
  resumeGoal: (id: string) => Promise<void>;
  cancelGoal: (id: string) => Promise<void>;

  // Update current amount (called when calculating progress)
  updateCurrentAmount: (id: string, currentAmount: number) => Promise<void>;
}

export const useGoalStore = create<GoalStore>(() => ({
  createGoal: async (data) => {
    const id = uuidv4();
    const now = new Date();

    await db.goals.add({
      id,
      name: data.name,
      type: data.type,
      targetAmount: data.targetAmount,
      currentAmount: 0, // Will be calculated by hooks
      targetDate: data.targetDate,
      monthlyContribution: data.monthlyContribution,
      expectedReturnRate: data.expectedReturnRate,
      retirementAge: data.retirementAge,
      preservationAge: data.preservationAge || 60, // Australian default
      includeSuperannuation: data.includeSuperannuation,
      linkedAccountIds: data.linkedAccountIds,
      linkedHoldingIds: data.linkedHoldingIds,
      status: 'active',
      notes: data.notes,
      color: data.color,
      icon: data.icon,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },

  updateGoal: async (id, data) => {
    await db.goals.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  deleteGoal: async (id) => {
    await db.goals.delete(id);
  },

  achieveGoal: async (id) => {
    await db.goals.update(id, {
      status: 'achieved',
      updatedAt: new Date(),
    });
  },

  pauseGoal: async (id) => {
    await db.goals.update(id, {
      status: 'paused',
      updatedAt: new Date(),
    });
  },

  resumeGoal: async (id) => {
    await db.goals.update(id, {
      status: 'active',
      updatedAt: new Date(),
    });
  },

  cancelGoal: async (id) => {
    await db.goals.update(id, {
      status: 'cancelled',
      updatedAt: new Date(),
    });
  },

  updateCurrentAmount: async (id, currentAmount) => {
    await db.goals.update(id, {
      currentAmount,
      updatedAt: new Date(),
    });
  },
}));

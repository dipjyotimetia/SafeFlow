import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db';
import type { FamilyMember } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Pre-defined colors for family members
const MEMBER_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
];

interface FamilyStore {
  // Selected member for filtering (null = all members)
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string | null) => void;

  // CRUD operations
  createMember: (name: string) => Promise<string>;
  updateMember: (id: string, data: Partial<FamilyMember>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  toggleMemberActive: (id: string) => Promise<void>;
}

export const useFamilyStore = create<FamilyStore>()(
  persist(
    (set) => ({
      selectedMemberId: null,

      setSelectedMemberId: (id) => set({ selectedMemberId: id }),

      createMember: async (name) => {
        const id = uuidv4();
        const now = new Date();

        // Get existing members to determine next color
        const existingMembers = await db.familyMembers.toArray();
        const colorIndex = existingMembers.length % MEMBER_COLORS.length;

        await db.familyMembers.add({
          id,
          name,
          color: MEMBER_COLORS[colorIndex],
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });

        return id;
      },

      updateMember: async (id, data) => {
        await db.familyMembers.update(id, {
          ...data,
          updatedAt: new Date(),
        });
      },

      deleteMember: async (id) => {
        // Note: We don't delete transactions/accounts, just mark member inactive
        // This preserves historical data
        await db.familyMembers.update(id, {
          isActive: false,
          updatedAt: new Date(),
        });
      },

      toggleMemberActive: async (id) => {
        const member = await db.familyMembers.get(id);
        if (member) {
          await db.familyMembers.update(id, {
            isActive: !member.isActive,
            updatedAt: new Date(),
          });
        }
      },
    }),
    {
      name: 'safeflow-family',
      partialize: (state) => ({
        selectedMemberId: state.selectedMemberId,
      }),
    }
  )
);

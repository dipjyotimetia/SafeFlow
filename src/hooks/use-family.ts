'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { FamilyMember } from '@/types';

interface UseFamilyMembersOptions {
  activeOnly?: boolean;
}

/**
 * Get all family members
 */
export function useFamilyMembers(options: UseFamilyMembersOptions = {}) {
  const { activeOnly = true } = options;

  const members = useLiveQuery(async () => {
    let query = db.familyMembers.toCollection();

    if (activeOnly) {
      query = query.filter((m) => m.isActive);
    }

    return query.sortBy('name');
  }, [activeOnly]);

  return {
    members: members ?? [],
    isLoading: members === undefined,
  };
}

/**
 * Get a single family member by ID
 */
export function useFamilyMember(id: string | null) {
  const member = useLiveQuery(
    async () => {
      if (!id) return null;
      return db.familyMembers.get(id);
    },
    [id]
  );

  return {
    member: member ?? null,
    isLoading: member === undefined,
  };
}

/**
 * Get spending summary by family member
 */
export function useFamilySpending(period: 'month' | 'year' = 'month') {
  const spending = useLiveQuery(
    async () => {
      const now = new Date();
      let start: Date;

      if (period === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        // Australian financial year (July 1)
        const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
        start = new Date(year, 6, 1);
      }

      const transactions = await db.transactions
        .where('date')
        .aboveOrEqual(start)
        .filter((t) => t.type === 'expense')
        .toArray();

      const members = await db.familyMembers.filter((m) => m.isActive).toArray();
      const memberMap = new Map(members.map((m) => [m.id, m]));

      // Group by member
      const byMember = new Map<string | null, { member: FamilyMember | null; amount: number; count: number }>();

      // Initialize with all members
      for (const member of members) {
        byMember.set(member.id, { member, amount: 0, count: 0 });
      }
      // Add unassigned bucket
      byMember.set(null, { member: null, amount: 0, count: 0 });

      for (const t of transactions) {
        const memberId = t.memberId || null;
        const existing = byMember.get(memberId) || {
          member: memberId ? memberMap.get(memberId) || null : null,
          amount: 0,
          count: 0,
        };
        existing.amount += t.amount ?? 0;
        existing.count += 1;
        byMember.set(memberId, existing);
      }

      return Array.from(byMember.values())
        .filter((b) => b.count > 0 || b.member !== null)
        .sort((a, b) => b.amount - a.amount);
    },
    [period]
  );

  return {
    spending: spending ?? [],
    isLoading: spending === undefined,
  };
}

/**
 * Get account summary by family member
 */
export function useFamilyAccounts() {
  const summary = useLiveQuery(async () => {
    const accounts = await db.accounts.filter((a) => a.isActive).toArray();
    const members = await db.familyMembers.filter((m) => m.isActive).toArray();
    const memberMap = new Map(members.map((m) => [m.id, m]));

    // Group accounts by member
    const byMember = new Map<string | null, {
      member: FamilyMember | null;
      accounts: typeof accounts;
      totalBalance: number;
    }>();

    // Initialize with all members
    for (const member of members) {
      byMember.set(member.id, { member, accounts: [], totalBalance: 0 });
    }
    // Add shared/unassigned bucket
    byMember.set(null, { member: null, accounts: [], totalBalance: 0 });

    for (const account of accounts) {
      const memberId = account.memberId || null;
      const isShared = account.visibility === 'shared';

      if (isShared) {
        // Shared accounts go to the shared bucket
        const existing = byMember.get(null)!;
        existing.accounts.push(account);
        existing.totalBalance += account.balance ?? 0;
      } else {
        // Private accounts go to the owner
        const existing = byMember.get(memberId) || {
          member: memberId ? memberMap.get(memberId) || null : null,
          accounts: [],
          totalBalance: 0,
        };
        existing.accounts.push(account);
        existing.totalBalance += account.balance ?? 0;
        byMember.set(memberId, existing);
      }
    }

    return Array.from(byMember.values());
  }, []);

  return {
    accountSummary: summary ?? [],
    isLoading: summary === undefined,
  };
}

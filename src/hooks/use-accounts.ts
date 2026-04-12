'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { AccountType } from '@/types';

interface UseAccountsOptions {
  type?: AccountType;
  activeOnly?: boolean;
  memberId?: string;
}

function isAccountVisibleToMember(
  account: { memberId?: string; visibility?: 'private' | 'shared' },
  memberId?: string
): boolean {
  if (!memberId) {
    return true;
  }

  if (account.memberId === memberId) {
    return true;
  }

  if (account.visibility === 'shared' || !account.memberId) {
    return true;
  }

  return false;
}

export function useAccounts(options: UseAccountsOptions = {}) {
  const { type, activeOnly = true, memberId } = options;

  const accounts = useLiveQuery(async () => {
    let query = db.accounts.toCollection();

    if (activeOnly) {
      query = query.filter((a) => a.isActive);
    }

    if (type) {
      query = query.filter((a) => a.type === type);
    }

    if (memberId) {
      query = query.filter((a) => isAccountVisibleToMember(a, memberId));
    }

    return query.sortBy('name');
  }, [type, activeOnly, memberId]);

  return {
    accounts: accounts ?? [],
    isLoading: accounts === undefined,
  };
}

export function useAccount(id: string | null) {
  const account = useLiveQuery(
    async () => {
      if (!id) return null;
      return db.accounts.get(id);
    },
    [id]
  );

  return {
    account: account ?? null,
    isLoading: account === undefined,
  };
}

export function useAccountsSummary(memberId?: string) {
  const summary = useLiveQuery(async () => {
    let accounts = await db.accounts.filter((a) => a.isActive).toArray();

    if (memberId) {
      accounts = accounts.filter((a) => isAccountVisibleToMember(a, memberId));
    }

    const totalAssets = accounts
      .filter((a) => ['bank', 'cash', 'investment', 'crypto', 'asset'].includes(a.type))
      .reduce((sum, a) => sum + (a.balance ?? 0), 0);

    const totalLiabilities = accounts
      .filter((a) => ['credit', 'liability'].includes(a.type))
      .reduce((sum, a) => sum + Math.abs(a.balance ?? 0), 0);

    const netWorth = totalAssets - totalLiabilities;

    const byType = accounts.reduce(
      (acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + (a.balance ?? 0);
        return acc;
      },
      {} as Record<AccountType, number>
    );

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      byType,
      accountCount: accounts.length,
    };
  }, [memberId]);

  return {
    summary: summary ?? {
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0,
      byType: {} as Record<AccountType, number>,
      accountCount: 0,
    },
    isLoading: summary === undefined,
  };
}

'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { CategoryType } from '@/types';

interface UseCategoriesOptions {
  type?: CategoryType;
  activeOnly?: boolean;
  includeATO?: boolean;
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const { type, activeOnly = true, includeATO = true } = options;

  const categories = useLiveQuery(async () => {
    let results = await db.categories.toArray();

    if (activeOnly) {
      results = results.filter((c) => c.isActive);
    }

    if (type) {
      results = results.filter((c) => c.type === type);
    }

    if (!includeATO) {
      results = results.filter((c) => !c.atoCode);
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }, [type, activeOnly, includeATO]);

  return {
    categories: categories ?? [],
    isLoading: categories === undefined,
  };
}

export function useCategory(id: string | null) {
  const category = useLiveQuery(
    async () => {
      if (!id) return null;
      return db.categories.get(id);
    },
    [id]
  );

  return {
    category: category ?? null,
    isLoading: category === undefined,
  };
}

export function useATOCategories() {
  const categories = useLiveQuery(async () => {
    return db.categories
      .filter((c) => c.atoCode !== undefined && c.isActive)
      .sortBy('atoCode');
  }, []);

  return {
    categories: categories ?? [],
    isLoading: categories === undefined,
  };
}

export function useCategoriesGrouped() {
  const grouped = useLiveQuery(async () => {
    const categories = await db.categories.filter((c) => c.isActive).toArray();

    const income = categories
      .filter((c) => c.type === 'income' && !c.atoCode)
      .sort((a, b) => a.name.localeCompare(b.name));

    const expense = categories
      .filter((c) => c.type === 'expense' && !c.atoCode)
      .sort((a, b) => a.name.localeCompare(b.name));

    const transfer = categories
      .filter((c) => c.type === 'transfer')
      .sort((a, b) => a.name.localeCompare(b.name));

    const ato = categories
      .filter((c) => c.atoCode)
      .sort((a, b) => (a.atoCode || '').localeCompare(b.atoCode || ''));

    return { income, expense, transfer, ato };
  }, []);

  return {
    grouped: grouped ?? { income: [], expense: [], transfer: [], ato: [] },
    isLoading: grouped === undefined,
  };
}

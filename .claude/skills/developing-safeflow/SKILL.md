---
name: developing-safeflow
description: Develops features for SafeFlow personal finance app. Use when working with transactions, accounts, budgets, investments, superannuation, PDF parsing, Australian tax, or financial projections in this codebase.
---

# SafeFlow Development

Australian personal finance app with offline-first architecture, expense tracking, and financial projections.

## Quick Reference

| Pattern | Implementation |
|---------|----------------|
| Money | Store in **cents** (integers), never floats |
| Currency | Hardcoded to AUD, use `formatAUD()` |
| Dates | JavaScript `Date` objects |
| IDs | Generate with `uuid.v4()` |
| Queries | Use hooks with `useLiveQuery` |
| Mutations | Use Zustand stores |
| Validation | Zod schemas before DB writes |
| Multi-table ops | Use `db.transaction()` for atomicity |
| Sync | 4 backends: Google Drive, WebDAV, S3, Local File |

## Technology Stack

- **Framework**: Next.js 16.1.0 (App Router), React 19.2.3, TypeScript
- **Database**: Dexie 4.2 (IndexedDB wrapper)
- **State**: Zustand 5 (mutations), dexie-react-hooks (queries)
- **Compiler**: React Compiler 1.0.0 (automatic optimization)
- **PDF**: pdfjs-dist in Web Worker
- **Charts**: Recharts 3.6
- **UI**: shadcn/ui + Radix UI + Tailwind CSS 4
- **Validation**: Zod 4

## React 19 & Next.js 16 Patterns

### React Compiler (Automatic Optimization)

React Compiler is **enabled**. Do NOT manually add:
- `useMemo()` - compiler handles memoization
- `useCallback()` - compiler optimizes callbacks
- `React.memo()` - compiler determines when to memo

### Server vs Client Components

This is an **offline-first app** using IndexedDB. Most components are Client Components.

| Use Client Component | Use Server Component |
|---------------------|---------------------|
| Hooks (useState, useEffect, useLiveQuery) | Static content with no interactivity |
| Browser APIs (IndexedDB, localStorage) | Initial page layouts |
| Event handlers | Metadata generation |

**Default**: Add `'use client'` to components using Dexie, Zustand, or React hooks.

### React 19 Hooks

#### useOptimistic - Optimistic UI Updates
```typescript
import { useOptimistic } from 'react';

function TransactionList({ transactions }) {
  const [optimisticTxns, addOptimistic] = useOptimistic(
    transactions,
    (state, newTxn) => [...state, { ...newTxn, pending: true }]
  );

  async function handleAdd(data) {
    addOptimistic(data);  // Instant UI update
    await createTransaction(data);  // Actual mutation
  }
}
```

#### useDeferredValue - Non-Urgent Updates
```typescript
import { useDeferredValue, useState } from 'react';

function TransactionSearch({ transactions }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // Expensive filter uses deferred value - keeps UI responsive
  const filtered = transactions.filter(t =>
    t.description.toLowerCase().includes(deferredQuery.toLowerCase())
  );
}
```

## Project Structure

```
src/
├── app/(dashboard)/     # Routes: overview, accounts, transactions, investments,
│                        #         superannuation, goals, budgets, family,
│                        #         tax, import, settings
├── components/
│   ├── ui/              # shadcn/ui components (do not modify)
│   ├── layout/          # Header, Sidebar
│   ├── accounts/        # Account components
│   ├── transactions/    # Transaction components
│   ├── investments/     # Holdings, portfolio charts
│   ├── settings/        # Sync provider config
│   ├── charts/          # Recharts components
│   ├── budgets/         # Budget components
│   ├── goals/           # Goal and projections
│   ├── family/          # Family member components
│   ├── import/          # PDF import wizard
│   ├── ai/              # Chat widget
│   └── icons/           # Institution icons
├── hooks/               # useLiveQuery hooks for data fetching
├── stores/              # Zustand stores for mutations
├── lib/
│   ├── db/              # Dexie schema and initialization
│   ├── parsers/         # Bank and super statement parsers
│   │   ├── bank/        # 11 bank parsers
│   │   └── super/       # 2 super parsers
│   ├── ai/              # Ollama integration
│   ├── sync/            # Cloud sync system
│   │   ├── backends/    # Google Drive, WebDAV, S3, Local File
│   │   ├── encryption.ts
│   │   └── sync-service.ts
│   ├── utils/
│   │   ├── financial-year.ts  # Australian FY utilities
│   │   ├── currency.ts        # AUD formatting
│   │   ├── gst.ts             # GST calculations
│   │   ├── date.ts            # Date utilities
│   │   └── projections.ts     # Financial projections
│   └── schemas/         # Zod validation schemas
├── types/index.ts       # All TypeScript interfaces
└── workers/pdf.worker.ts
```

## Core Data Types

```typescript
// Account types
type AccountType = 'bank' | 'credit' | 'investment' | 'crypto' | 'cash' | 'asset' | 'liability';

// Transaction types
type TransactionType = 'income' | 'expense' | 'transfer';

// Investment transaction types
type InvestmentTransactionType = 'buy' | 'sell' | 'dividend' | 'split' | 'transfer_in' | 'transfer_out';

// Super contribution types
type SuperContributionType =
  | 'employer-sg' | 'employer-additional' | 'salary-sacrifice'
  | 'personal-concessional' | 'personal-non-concessional'
  | 'spouse-contribution' | 'government-co-contribution'
  | 'rollover-in' | 'rollover-out' | 'withdrawal' | 'fees' | 'insurance' | 'earnings';
```

## Common Patterns

### Store + Hook Pattern

```typescript
// Store for mutations (src/stores/account.store.ts)
export const useAccountStore = create<AccountStore>((set, get) => ({
  createAccount: async (data) => {
    const account = { id: uuidv4(), ...data, createdAt: new Date() };
    await db.accounts.add(account);
  },
}));

// Hook for queries (src/hooks/use-accounts.ts)
export function useAccounts() {
  return useLiveQuery(() => db.accounts.where('isActive').equals(1).toArray());
}
```

### Currency Formatting

```typescript
import { formatAUD } from '@/lib/utils/currency';

// Amount is in cents
const display = formatAUD(150000); // "$1,500.00"
```

### Financial Year

```typescript
import { getCurrentFinancialYear, getFinancialYearDates } from '@/lib/utils/financial-year';

const fy = getCurrentFinancialYear(); // "2024-25"
const { start, end } = getFinancialYearDates(fy);
// start: July 1, 2024
// end: June 30, 2025
```

### Date Utilities

```typescript
import { getDateKey, isDateStale, ONE_HOUR_MS, ONE_DAY_MS } from '@/lib/utils/date';

// Create deterministic daily IDs
const dateKey = getDateKey(new Date()); // "2024-12-23"

// Check if data is stale
const needsRefresh = isDateStale(lastUpdated, ONE_HOUR_MS);
```

### Portfolio Snapshot Pattern

```typescript
import { getDateKey } from '@/lib/utils/date';

// Create deterministic daily ID to prevent duplicates
const snapshotId = `snapshot-${getDateKey(new Date())}`;

await db.portfolioHistory.put({
  id: snapshotId,  // Same ID = updates existing
  date: new Date(),
  totalValue: portfolioValue,
  ...
});
```

## Reference Documentation

**Data Layer**: See [ARCHITECTURE.md](ARCHITECTURE.md) for database schema, stores, and hooks.

**PDF Parsing**: See [PARSERS.md](PARSERS.md) for bank and super statement parsing.

**Financial Year**: See [FINANCIAL-YEAR.md](FINANCIAL-YEAR.md) for Australian FY utilities and tax.

**AI Integration**: See [AI-INTEGRATION.md](AI-INTEGRATION.md) for Ollama categorization.

**Cloud Sync**: See [SYNC.md](SYNC.md) for sync backends and encryption.

**Adding Features**: See [FEATURE-GUIDE.md](FEATURE-GUIDE.md) for step-by-step checklist.

## Key Files

| Purpose | Location |
|---------|----------|
| Database schema | `src/lib/db/schema.ts` |
| Type definitions | `src/types/index.ts` |
| Validation schemas | `src/lib/schemas/*.schema.ts` |
| Financial utilities | `src/lib/utils/financial-year.ts` |
| Date utilities | `src/lib/utils/date.ts` |
| Stores | `src/stores/*.store.ts` |
| Hooks | `src/hooks/use-*.ts` |
| Bank parsers | `src/lib/parsers/bank/*.parser.ts` |
| Super parsers | `src/lib/parsers/super/*.parser.ts` |
| Sync backends | `src/lib/sync/backends/*.ts` |
| Sync service | `src/lib/sync/sync-service.ts` |
| AI categorization | `src/lib/ai/llm-categorization.ts` |

## Import Alias

Use `@/*` for imports from `src/`:

```typescript
import { db } from '@/lib/db';
import { useAccounts } from '@/hooks/use-accounts';
import type { Account } from '@/types';
```

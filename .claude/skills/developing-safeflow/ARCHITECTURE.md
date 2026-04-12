# SafeFlow Architecture

## Database Schema (Dexie/IndexedDB)

Current schema version: **9**

### Tables Overview

| Table | Purpose |
|-------|---------|
| `accounts` | Bank, credit, investment, crypto accounts |
| `categories` | Income/expense categories with ATO codes |
| `transactions` | Financial transactions |
| `holdings` | Investment holdings (stocks, ETFs, crypto) |
| `investmentTransactions` | Buy/sell/dividend records |
| `priceHistory` | Historical prices for holdings |
| `portfolioHistory` | Daily portfolio snapshots |
| `taxItems` | Tax deductions |
| `importBatches` | PDF import metadata |
| `syncMetadata` | Cloud sync state |
| `superannuationAccounts` | Super accounts |
| `superTransactions` | Super contributions |
| `chatConversations` | AI chat history |
| `categorizationQueue` | AI categorization queue |
| `merchantPatterns` | Learned merchant patterns |
| `budgets` | Monthly/yearly budgets |
| `familyMembers` | Household members |
| `goals` | Financial goals |

### Table Indexes

```typescript
// Version 9 schema (current)
accounts: 'id, type, isActive, createdAt, memberId, visibility'
categories: 'id, type, parentId, atoCode, isActive'
transactions: 'id, accountId, categoryId, type, date, importBatchId, memberId, [accountId+date], [categoryId+date], [type+date], [memberId+date]'
holdings: 'id, accountId, symbol, type'
investmentTransactions: 'id, holdingId, type, date, [type+date]'
priceHistory: 'id, holdingId, date, [holdingId+date]'
portfolioHistory: 'id, date'
taxItems: 'id, financialYear, atoCategory, transactionId'
syncMetadata: 'id'
importBatches: 'id, source, importedAt'
superannuationAccounts: 'id, provider, memberNumber, createdAt'
superTransactions: 'id, superAccountId, type, date, financialYear, [superAccountId+date]'
chatConversations: 'id, createdAt, updatedAt'
categorizationQueue: 'id, transactionId, status, createdAt'
merchantPatterns: 'id, normalizedName, categoryId, confidence, lastUsed, userConfirmed'
budgets: 'id, categoryId, memberId, period, isActive, createdAt'
familyMembers: 'id, isActive, createdAt'
goals: 'id, type, status, targetDate, createdAt'
```

### Compound Indexes

Use compound indexes for efficient filtered queries:

```typescript
// Query transactions by account and date range
db.transactions.where('[accountId+date]')
  .between([accountId, startDate], [accountId, endDate])
  .toArray();

// Query by category and date
db.transactions.where('[categoryId+date]')
  .between([categoryId, startDate], [categoryId, endDate])
  .toArray();

// Query by member and date
db.transactions.where('[memberId+date]')
  .between([memberId, startDate], [memberId, endDate])
  .toArray();

// Query price history for a holding
db.priceHistory.where('[holdingId+date]')
  .between([holdingId, startDate], [holdingId, endDate])
  .toArray();
```

### Adding a New Table

1. Add interface to `src/types/index.ts`
2. Add table property to schema class
3. Add table definition in `stores()` with indexes
4. **Increment version number**

```typescript
// Increment version and add new table
this.version(10).stores({
  // ... existing tables (copy all from version 9)
  newTable: 'id, field1, field2, createdAt',
});
```

**Important**: Copy ALL existing table definitions when incrementing version.

## Zustand Stores

Stores handle **mutations only**. Located in `src/stores/`.

### Available Stores

| Store | Purpose |
|-------|---------|
| `account.store.ts` | Account CRUD with cascade delete |
| `transaction.store.ts` | Transaction CRUD with balance updates |
| `holding.store.ts` | Investment holdings and price refresh |
| `portfolio.store.ts` | Portfolio snapshot management |
| `superannuation.store.ts` | Super account and contribution tracking |
| `budget.store.ts` | Budget CRUD |
| `goal.store.ts` | Goal lifecycle management |
| `family.store.ts` | Family member management |
| `sync.store.ts` | Cloud sync state with auth |
| `ui.store.ts` | UI state with localStorage persistence |
| `ai.store.ts` | AI integration state |

### Store Pattern

```typescript
// src/stores/account.store.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import type { Account, CreateAccountInput } from '@/types';

interface AccountStore {
  createAccount: (data: CreateAccountInput) => Promise<Account>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  createAccount: async (data) => {
    const account: Account = {
      id: uuidv4(),
      ...data,
      balance: data.balance ?? 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.accounts.add(account);
    return account;
  },

  updateAccount: async (id, data) => {
    await db.accounts.update(id, { ...data, updatedAt: new Date() });
  },

  deleteAccount: async (id) => {
    await db.accounts.update(id, { isActive: false, updatedAt: new Date() });
  },
}));
```

### Atomic Operations with db.transaction()

Use `db.transaction()` for operations that modify multiple tables:

```typescript
// CORRECT: Atomic balance update
await db.transaction('rw', [db.transactions, db.accounts], async () => {
  await db.transactions.add(record);
  await db.accounts.update(accountId, { balance: newBalance });
});

// INCORRECT: Non-atomic (can partially fail)
await db.transactions.add(record);  // If this succeeds...
await db.accounts.update(accountId, { balance: newBalance }); // ...but this fails = inconsistent
```

### Calling Store Methods

```typescript
// In a component
const { createAccount } = useAccountStore();

const handleCreate = async () => {
  await createAccount({
    name: 'Savings',
    type: 'bank',
    institutionName: 'CBA',
  });
};
```

## React Hooks (Queries)

Hooks use `useLiveQuery` for **reactive data fetching**. Located in `src/hooks/`.

### Available Hooks

| Hook | Purpose |
|------|---------|
| `use-accounts.ts` | Account queries and summaries |
| `use-transactions.ts` | Transaction queries with filters |
| `use-holdings.ts` | Investment holdings and price history |
| `use-portfolio.ts` | Portfolio snapshots and performance |
| `use-superannuation.ts` | Super accounts and contributions |
| `use-budgets.ts` | Budget queries with progress |
| `use-goals.ts` | Goal queries with projections |
| `use-family.ts` | Family member queries |

### Hook Pattern

```typescript
// src/hooks/use-accounts.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export function useAccounts() {
  const accounts = useLiveQuery(
    () => db.accounts.where('isActive').equals(1).toArray()
  );

  return {
    accounts: accounts ?? [],
    isLoading: accounts === undefined,
  };
}
```

### Filtered Queries with Index Selection

```typescript
export function useTransactions(filters?: TransactionFilters) {
  return useLiveQuery(async () => {
    // Use compound index when filtering by account + date range
    if (filters?.accountId && filters?.startDate) {
      return db.transactions
        .where('[accountId+date]')
        .between(
          [filters.accountId, filters.startDate],
          [filters.accountId, filters.endDate ?? new Date()]
        )
        .toArray();
    }

    // Use single index for account-only filter
    if (filters?.accountId) {
      return db.transactions
        .where('accountId')
        .equals(filters.accountId)
        .toArray();
    }

    // Default: all transactions sorted by date
    return db.transactions.orderBy('date').reverse().toArray();
  }, [filters?.accountId, filters?.startDate, filters?.endDate]);
}
```

## Zod Validation

Validate input before database writes. Located in `src/lib/schemas/`.

### Schema Pattern

```typescript
// src/lib/schemas/account.schema.ts
import { z } from 'zod';

export const accountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['bank', 'credit', 'investment', 'crypto', 'cash', 'asset', 'liability']),
  institutionName: z.string().optional(),
  balance: z.number().int().default(0), // in cents
  memberId: z.string().uuid().optional(),
});

export type CreateAccountInput = z.infer<typeof accountSchema>;
```

### Using Validation

```typescript
import { accountSchema } from '@/lib/schemas/account.schema';

const handleSubmit = async (formData: unknown) => {
  const result = accountSchema.safeParse(formData);

  if (!result.success) {
    // Handle validation errors
    console.error(result.error.flatten());
    return;
  }

  await createAccount(result.data);
};
```

## Key Patterns Summary

1. **Separation of concerns**: Stores mutate, hooks query
2. **Reactive updates**: `useLiveQuery` auto-updates on DB changes
3. **Validation first**: Zod validates before any DB operation
4. **Soft deletes**: Set `isActive: false` instead of hard delete
5. **Timestamps**: Always update `updatedAt` on mutations
6. **Atomic operations**: Use `db.transaction()` for multi-table updates

## React 19 Performance

### React Compiler

The project has React Compiler enabled (`babel-plugin-react-compiler`).

**Do NOT add manual optimization:**
```typescript
// DON'T do this - compiler handles it
const memoizedValue = useMemo(() => expensiveCalc(data), [data]);
const memoizedFn = useCallback((id) => handleClick(id), []);

// DO just write normal code
const value = expensiveCalc(data);
const handleClick = (id) => { /* ... */ };
```

### useOptimistic Pattern

For instant UI feedback during mutations:

```typescript
'use client';
import { useOptimistic } from 'react';
import { useAccountStore } from '@/stores/account.store';

export function AccountList({ accounts }) {
  const { deleteAccount } = useAccountStore();
  const [optimisticAccounts, removeOptimistic] = useOptimistic(
    accounts,
    (state, removedId) => state.filter(a => a.id !== removedId)
  );

  async function handleDelete(id: string) {
    removeOptimistic(id);  // Instant UI removal
    await deleteAccount(id);  // Actual DB operation
  }

  return (
    <ul>
      {optimisticAccounts.map(account => (
        <li key={account.id}>
          {account.name}
          <button onClick={() => handleDelete(account.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

### useDeferredValue Pattern

For expensive computations that shouldn't block UI:

```typescript
'use client';
import { useState, useDeferredValue } from 'react';
import { useTransactions } from '@/hooks/use-transactions';

export function TransactionSearch() {
  const { transactions } = useTransactions();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // Filter uses deferred value - typing stays responsive
  const filtered = transactions.filter(t =>
    t.description.toLowerCase().includes(deferredQuery.toLowerCase())
  );

  const isStale = query !== deferredQuery;

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ul style={{ opacity: isStale ? 0.5 : 1 }}>
        {filtered.map(t => <li key={t.id}>{t.description}</li>)}
      </ul>
    </div>
  );
}
```

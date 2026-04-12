# Adding New Features

Step-by-step checklist for adding features to SafeFlow.

## Feature Checklist

```
[ ] 1. Define types in src/types/index.ts
[ ] 2. Add Dexie table in src/lib/db/schema.ts (bump version!)
[ ] 3. Create Zod schema in src/lib/schemas/
[ ] 4. Create Zustand store in src/stores/
[ ] 5. Create React hook in src/hooks/
[ ] 6. Create components in src/components/{feature}/
[ ] 7. Create route in src/app/(dashboard)/{feature}/page.tsx
[ ] 8. Add to sidebar navigation in src/components/layout/sidebar.tsx
```

## Component Type Decision

### When to Use 'use client'

Add `'use client'` at the top of your file when using:
- React hooks: `useState`, `useEffect`, `useOptimistic`, `useDeferredValue`
- Dexie hooks: `useLiveQuery`
- Zustand stores: `useAccountStore`, `useTransactionStore`, etc.
- Browser APIs: IndexedDB, localStorage
- Event handlers: `onClick`, `onChange`, `onSubmit`

```typescript
// src/components/goals/goal-card.tsx
'use client';  // Required: uses hooks and event handlers

import { useState } from 'react';
import { useGoalStore } from '@/stores/goal.store';
```

### Server Components (No Directive Needed)

Use for static UI with no interactivity:
- Layout wrappers
- Static headers/footers
- Metadata pages

```typescript
// src/app/(dashboard)/goals/layout.tsx
// No 'use client' - renders on server

export default function GoalsLayout({ children }) {
  return (
    <div className="container">
      <h1>Financial Goals</h1>
      {children}
    </div>
  );
}
```

### React 19: No Manual Memoization

React Compiler handles optimization automatically:

```typescript
// ❌ Don't do this
const memoizedFn = useCallback(() => handleDelete(id), [id]);
const memoizedList = useMemo(() => items.filter(...), [items]);

// ✅ Just write normal code
const handleClick = () => handleDelete(id);
const filteredList = items.filter(...);
```

## Step 1: Types

```typescript
// src/types/index.ts

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;   // in cents
  currentAmount: number;  // in cents
  targetDate: Date;
  category?: 'savings' | 'debt' | 'investment';
  linkedAccountId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  targetDate: Date;
  category?: 'savings' | 'debt' | 'investment';
  linkedAccountId?: string;
}
```

## Step 2: Database Table

```typescript
// src/lib/db/schema.ts

// Add table property
goals!: Table<Goal>;

// Increment version and add table definition
this.version(6).stores({
  // ... existing tables (copy all)
  goals: 'id, targetDate, category, isActive, createdAt',
});
```

**Important**: Copy ALL existing table definitions when incrementing version.

## Step 3: Validation Schema

```typescript
// src/lib/schemas/goal.schema.ts
import { z } from 'zod';

export const goalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().int().positive(),
  targetDate: z.date(),
  category: z.enum(['savings', 'debt', 'investment']).optional(),
  linkedAccountId: z.string().uuid().optional(),
});

export type CreateGoalInput = z.infer<typeof goalSchema>;
```

## Step 4: Zustand Store

```typescript
// src/stores/goal.store.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import type { Goal, CreateGoalInput } from '@/types';

interface GoalStore {
  createGoal: (data: CreateGoalInput) => Promise<Goal>;
  updateGoal: (id: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateProgress: (id: string, amount: number) => Promise<void>;
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  createGoal: async (data) => {
    const goal: Goal = {
      id: uuidv4(),
      ...data,
      currentAmount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.goals.add(goal);
    return goal;
  },

  updateGoal: async (id, data) => {
    await db.goals.update(id, { ...data, updatedAt: new Date() });
  },

  deleteGoal: async (id) => {
    await db.goals.update(id, { isActive: false, updatedAt: new Date() });
  },

  updateProgress: async (id, amount) => {
    const goal = await db.goals.get(id);
    if (goal) {
      await db.goals.update(id, {
        currentAmount: goal.currentAmount + amount,
        updatedAt: new Date(),
      });
    }
  },
}));
```

## Step 5: React Hook

```typescript
// src/hooks/use-goals.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export function useGoals() {
  const goals = useLiveQuery(
    () => db.goals.where('isActive').equals(1).toArray()
  );

  return {
    goals: goals ?? [],
    isLoading: goals === undefined,
  };
}

export function useGoal(id: string) {
  const goal = useLiveQuery(() => db.goals.get(id), [id]);

  return {
    goal,
    isLoading: goal === undefined,
  };
}
```

## Step 6: Components

```typescript
// src/components/goals/goal-card.tsx
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatAUD } from '@/lib/utils/currency';
import type { Goal } from '@/types';

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const progress = (goal.currentAmount / goal.targetAmount) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{goal.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={progress} className="mb-2" />
        <p>
          {formatAUD(goal.currentAmount)} / {formatAUD(goal.targetAmount)}
        </p>
      </CardContent>
    </Card>
  );
}
```

```typescript
// src/components/goals/index.ts
export { GoalCard } from './goal-card';
export { GoalForm } from './goal-form';
export { GoalsList } from './goals-list';
```

## Step 7: Route Page

```typescript
// src/app/(dashboard)/goals/page.tsx
'use client';

import { useGoals } from '@/hooks/use-goals';
import { GoalsList } from '@/components/goals';

export default function GoalsPage() {
  const { goals, isLoading } = useGoals();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Financial Goals</h1>
      <GoalsList goals={goals} />
    </div>
  );
}
```

## Step 8: Sidebar Navigation

```typescript
// src/components/layout/sidebar.tsx
// Add to navigation items array:

{
  href: '/goals',
  label: 'Goals',
  icon: TargetIcon,  // from lucide-react
}
```

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Types | PascalCase | `Goal`, `CreateGoalInput` |
| Store | `{feature}.store.ts` | `goal.store.ts` |
| Hook | `use-{feature}.ts` | `use-goals.ts` |
| Schema | `{feature}.schema.ts` | `goal.schema.ts` |
| Component | `{name}.tsx` | `goal-card.tsx` |
| Route | `{feature}/page.tsx` | `goals/page.tsx` |

## Common Imports

```typescript
// Database
import { db } from '@/lib/db';

// Types
import type { Goal } from '@/types';

// Utils
import { formatAUD } from '@/lib/utils/currency';
import { getCurrentFinancialYear } from '@/lib/utils/financial-year';

// UI Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

// State
import { useGoalStore } from '@/stores/goal.store';
import { useGoals } from '@/hooks/use-goals';
```

## Testing Checklist

```
[ ] Page loads without errors
[ ] Create operation works
[ ] Update operation works
[ ] Delete (soft) operation works
[ ] Data persists after refresh
[ ] Navigation link appears in sidebar
[ ] Form validation shows errors
[ ] Loading states display correctly
```

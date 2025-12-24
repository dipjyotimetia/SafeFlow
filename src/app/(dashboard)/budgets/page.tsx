'use client';

import { BudgetOverview } from '@/components/budgets';
import { Header } from '@/components/layout/header';

export default function BudgetsPage() {
  return (
    <>
      <Header title="Budgets" />
      <div className="p-6 space-y-6">
        <div>
          <p className="text-muted-foreground">
            Track your spending against your budget limits
          </p>
        </div>

        <BudgetOverview />
      </div>
    </>
  );
}

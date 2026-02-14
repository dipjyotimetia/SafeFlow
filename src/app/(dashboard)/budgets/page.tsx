'use client';

import { BudgetOverview } from '@/components/budgets';
import { Header } from '@/components/layout/header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BudgetsPage() {
  return (
    <>
      <Header title="Budgets" />
      <div className="pb-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 sm:px-6 lg:px-8">
          <Card variant="glass-luxury" className="border-primary/15 animate-enter">
            <CardHeader>
              <CardTitle className="text-2xl">Budget Planner</CardTitle>
              <CardDescription>
                Track spending against monthly and yearly limits.
              </CardDescription>
            </CardHeader>
          </Card>

          <BudgetOverview />
        </div>
      </div>
    </>
  );
}

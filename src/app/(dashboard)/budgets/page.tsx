'use client';

import { BudgetOverview } from '@/components/budgets';
import { Header } from '@/components/layout/header';

export default function BudgetsPage() {
  return (
    <>
      <Header title="Budgets" />
      <div className="pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 sm:px-6 lg:px-8">
          <section className="card-trace relative overflow-hidden rounded-md border border-border bg-card animate-enter">
            <div className="p-6 md:p-8">
              <span className="eyebrow">// Budget planner</span>
              <h1 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
                Spending vs limits
              </h1>
              <p className="mt-2 max-w-prose text-[13px] text-muted-foreground">
                Track monthly and yearly category spending against caps.
              </p>
            </div>
          </section>

          <BudgetOverview />
        </div>
      </div>
    </>
  );
}

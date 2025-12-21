import { BudgetOverview } from '@/components/budgets';

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Budgets</h2>
        <p className="text-muted-foreground">
          Track your spending against your budget limits
        </p>
      </div>

      <BudgetOverview />
    </div>
  );
}

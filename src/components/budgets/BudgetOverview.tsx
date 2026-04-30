'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Wallet } from 'lucide-react';
import { BudgetCard } from './BudgetCard';
import { BudgetFormDialog } from './BudgetFormDialog';
import { useAllBudgetProgress } from '@/hooks/use-budgets';
import { useBudgetStore } from '@/stores/budget.store';
import { useFamilyStore } from '@/stores/family.store';
import type { Budget } from '@/types';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SkeletonCard } from '@/components/ui/skeleton';
import { StatCell } from '@/components/ui/stat-cell';
import { formatAUD } from '@/lib/utils/currency';

export function BudgetOverview() {
  const { selectedMemberId } = useFamilyStore();
  const { progress, isLoading } = useAllBudgetProgress(
    selectedMemberId ?? undefined,
  );
  const { deleteBudget } = useBudgetStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

  const totalBudgeted = progress.reduce((sum, p) => sum + p.budget.amount, 0);
  const totalSpent = progress.reduce((sum, p) => sum + p.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overBudgetCount = progress.filter((p) => p.isOverBudget).length;
  const usedPct =
    totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!budgetToDelete) return;
    try {
      await deleteBudget(budgetToDelete.id);
      toast.success('Budget deleted');
    } catch (error) {
      toast.error('Failed to delete budget');
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setBudgetToDelete(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingBudget(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-lg border border-border/80 fintech-panel sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[110px]" />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Metric strip */}
      <section className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-lg border border-border/80 fintech-panel sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
        <StatCell
          label="Budgeted"
          value={formatAUD(totalBudgeted)}
          sublabel={`${progress.length} active`}
          tone="neutral"
          delay={0.05}
        />
        <StatCell
          label="Spent"
          value={formatAUD(totalSpent)}
          sublabel={`${usedPct}% of budget`}
          tone={usedPct > 100 ? 'negative' : 'neutral'}
          delay={0.1}
        />
        <StatCell
          label="Remaining"
          value={formatAUD(totalRemaining)}
          sublabel={totalRemaining >= 0 ? 'Under budget' : 'Over budget'}
          tone={totalRemaining >= 0 ? 'positive' : 'negative'}
          delay={0.15}
        />
        <StatCell
          label="Over Budget"
          value={String(overBudgetCount)}
          sublabel={overBudgetCount === 0 ? 'All on track' : 'exceeded'}
          tone={overBudgetCount > 0 ? 'negative' : 'positive'}
          delay={0.2}
        />
      </section>

      {/* Budgets grid */}
      <section className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="eyebrow">Your budgets</span>
          <span className="hairline-v h-3" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
            {progress.length} record{progress.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          New Budget
        </Button>
      </section>

      {progress.length === 0 ? (
        <div className="rounded-lg border border-border/80 fintech-panel px-5 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/40">
            <Wallet
              className="h-5 w-5 text-[--text-subtle]"
              strokeWidth={1.5}
            />
          </div>
          <p className="font-display text-lg tracking-tight">
            No budgets yet
          </p>
          <p className="mx-auto mt-2 max-w-xs text-[13px] text-muted-foreground">
            Create your first budget to start tracking spending.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {progress.map((p, i) => (
            <div
              key={p.budget.id}
              className="animate-enter-fast"
              style={{ animationDelay: `${0.04 * i}s` }}
            >
              <BudgetCard
                progress={p}
                onEdit={() => handleEdit(p.budget)}
                onDelete={() => {
                  setBudgetToDelete(p.budget);
                  setDeleteDialogOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      )}

      <BudgetFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        budget={editingBudget}
        defaultMemberId={selectedMemberId}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{budgetToDelete?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

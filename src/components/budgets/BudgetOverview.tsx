'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { BudgetCard } from './BudgetCard';
import { BudgetFormDialog } from './BudgetFormDialog';
import { useAllBudgetProgress } from '@/hooks/use-budgets';
import { useBudgetStore } from '@/stores/budget.store';
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
import { MetricCard } from '@/components/ui/metric-card';
import { SkeletonCard, SkeletonMetricCards } from '@/components/ui/skeleton';

export function BudgetOverview() {
  const { progress, isLoading } = useAllBudgetProgress();
  const { deleteBudget } = useBudgetStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100);
  };

  const totalBudgeted = progress.reduce((sum, p) => sum + p.budget.amount, 0);
  const totalSpent = progress.reduce((sum, p) => sum + p.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overBudgetCount = progress.filter((p) => p.isOverBudget).length;

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
    if (!open) {
      setEditingBudget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonMetricCards count={4} className="md:grid-cols-2 xl:grid-cols-4" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Budgeted"
          value={formatCurrency(totalBudgeted)}
          description={`${progress.length} active budget${progress.length !== 1 ? 's' : ''}`}
          icon={Wallet}
          variant="default"
        />

        <MetricCard
          title="Total Spent"
          value={formatCurrency(totalSpent)}
          description={`${totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}% of budget`}
          icon={TrendingDown}
          trend="down"
          variant="default"
        />

        <MetricCard
          title="Remaining"
          value={formatCurrency(totalRemaining)}
          description={totalRemaining >= 0 ? 'Under budget' : 'Over budget'}
          icon={TrendingUp}
          trend={totalRemaining >= 0 ? 'up' : 'down'}
          variant={totalRemaining >= 0 ? 'positive' : 'negative'}
        />

        <MetricCard
          title="Over Budget"
          value={String(overBudgetCount)}
          description={overBudgetCount === 0 ? 'All on track' : 'budgets exceeded'}
          icon={TrendingDown}
          variant={overBudgetCount > 0 ? 'negative' : 'positive'}
        />
      </div>

      <Card variant="premium">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Budgets</CardTitle>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Budget
          </Button>
        </CardHeader>
        <CardContent>
          {progress.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <div className="mx-auto mb-4 w-fit rounded-2xl bg-muted/70 p-4">
                <Wallet className="h-10 w-10 opacity-45" />
              </div>
              <p className="font-medium text-foreground">No budgets yet</p>
              <p className="mt-1 text-sm">Create your first budget to start tracking spending.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {progress.map((p) => (
                <BudgetCard
                  key={p.budget.id}
                  progress={p}
                  onEdit={() => handleEdit(p.budget)}
                  onDelete={() => {
                    setBudgetToDelete(p.budget);
                    setDeleteDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BudgetFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        budget={editingBudget}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{budgetToDelete?.name}&quot;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

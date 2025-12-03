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

  // Calculate summary stats
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
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</div>
            <p className="text-xs text-muted-foreground">
              {progress.length} active budget{progress.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-red-600' : ''}`}>
              {formatCurrency(totalRemaining)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalRemaining >= 0 ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over Budget</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overBudgetCount > 0 ? 'text-red-600' : ''}`}>
              {overBudgetCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {overBudgetCount === 0 ? 'All on track' : 'budget(s) exceeded'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Budgets</CardTitle>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Budget
          </Button>
        </CardHeader>
        <CardContent>
          {progress.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No budgets yet</p>
              <p className="text-sm">Create your first budget to start tracking spending</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Form Dialog */}
      <BudgetFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        budget={editingBudget}
      />

      {/* Delete Confirmation */}
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
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

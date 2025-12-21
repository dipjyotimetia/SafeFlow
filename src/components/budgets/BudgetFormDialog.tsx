'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/hooks/use-categories';
import { useBudgetStore } from '@/stores/budget.store';
import type { Budget, BudgetPeriod } from '@/types';
import { toast } from 'sonner';

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget | null;
}

export function BudgetFormDialog({ open, onOpenChange, budget }: BudgetFormDialogProps) {
  const { categories } = useCategories({ type: 'expense' });
  const { createBudget, updateBudget } = useBudgetStore();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (budget) {
      setName(budget.name);
      setCategoryId(budget.categoryId || '');
      setAmountDisplay((budget.amount / 100).toFixed(2));
      setAmountCents(budget.amount);
      setPeriod(budget.period);
    } else {
      setName('');
      setCategoryId('');
      setAmountDisplay('');
      setAmountCents(0);
      setPeriod('monthly');
    }
  }, [budget, open]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
      setAmountDisplay(value);
      const cents = Math.round(parseFloat(value || '0') * 100);
      setAmountCents(isNaN(cents) ? 0 : cents);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a budget name');
      return;
    }

    if (amountCents <= 0) {
      toast.error('Please enter a budget amount');
      return;
    }

    setIsSubmitting(true);

    try {
      if (budget) {
        await updateBudget(budget.id, {
          name: name.trim(),
          categoryId: categoryId || undefined,
          amount: amountCents,
          period,
        });
        toast.success('Budget updated');
      } else {
        await createBudget({
          name: name.trim(),
          categoryId: categoryId || undefined,
          amount: amountCents,
          period,
        });
        toast.success('Budget created');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(budget ? 'Failed to update budget' : 'Failed to create budget');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{budget ? 'Edit Budget' : 'Create Budget'}</DialogTitle>
            <DialogDescription>
              {budget
                ? 'Update your budget settings.'
                : 'Set a spending limit for a category or overall.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Budget Name</Label>
              <Input
                id="name"
                placeholder="e.g., Monthly Groceries"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="All spending" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All spending</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Budget Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  className="pl-7"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="period">Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as BudgetPeriod)}>
                <SelectTrigger id="period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly (Financial Year)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : budget ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

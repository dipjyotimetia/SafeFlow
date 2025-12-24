'use client';

import { useState } from 'react';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGoalStore } from '@/stores/goal.store';
import type { Goal, GoalType } from '@/types';
import { toast } from 'sonner';

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
}

const goalTypes: { value: GoalType; label: string; description: string }[] = [
  { value: 'savings', label: 'Savings Goal', description: 'Save for a specific purchase or fund' },
  {
    value: 'net-worth',
    label: 'Net Worth Target',
    description: 'Reach a total net worth milestone',
  },
  {
    value: 'investment',
    label: 'Investment Target',
    description: 'Build your investment portfolio',
  },
  {
    value: 'emergency-fund',
    label: 'Emergency Fund',
    description: 'Build a financial safety net',
  },
  { value: 'debt-free', label: 'Debt Free', description: 'Pay off all your debts' },
  {
    value: 'retirement',
    label: 'Retirement',
    description: 'Plan for your retirement savings',
  },
  { value: 'custom', label: 'Custom Goal', description: 'Define your own financial goal' },
];

export function GoalFormDialog({ open, onOpenChange, goal }: GoalFormDialogProps) {
  const { createGoal, updateGoal } = useGoalStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState(goal?.name || '');
  const [type, setType] = useState<GoalType>(goal?.type || 'savings');
  const [targetAmount, setTargetAmount] = useState(
    goal?.targetAmount ? (goal.targetAmount / 100).toFixed(2) : ''
  );
  const [targetDate, setTargetDate] = useState<Date | undefined>(goal?.targetDate);
  const [monthlyContribution, setMonthlyContribution] = useState(
    goal?.monthlyContribution ? (goal.monthlyContribution / 100).toFixed(2) : ''
  );
  const [expectedReturnRate, setExpectedReturnRate] = useState(
    goal?.expectedReturnRate ? (goal.expectedReturnRate * 100).toFixed(1) : '7'
  );
  const [includeSuperannuation, setIncludeSuperannuation] = useState(
    goal?.includeSuperannuation || false
  );

  const isEditing = !!goal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a goal name');
      return;
    }

    const targetAmountCents = Math.round(parseFloat(targetAmount || '0') * 100);
    if (targetAmountCents <= 0) {
      toast.error('Please enter a valid target amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        name: name.trim(),
        type,
        targetAmount: targetAmountCents,
        targetDate,
        monthlyContribution: monthlyContribution
          ? Math.round(parseFloat(monthlyContribution) * 100)
          : undefined,
        expectedReturnRate: expectedReturnRate
          ? (() => {
              const rate = parseFloat(expectedReturnRate);
              if (isNaN(rate)) return undefined;
              // If rate is > 1, assume percentage (e.g., 7 means 7%)
              // If rate is <= 1, assume already decimal (e.g., 0.07 means 7%)
              return rate > 1 ? rate / 100 : rate;
            })()
          : undefined,
        includeSuperannuation: type === 'retirement' ? includeSuperannuation : undefined,
      };

      if (isEditing) {
        await updateGoal(goal.id, data);
        toast.success('Goal updated');
      } else {
        await createGoal(data);
        toast.success('Goal created');
      }

      onOpenChange(false);

      // Reset form
      if (!isEditing) {
        setName('');
        setType('savings');
        setTargetAmount('');
        setTargetDate(undefined);
        setMonthlyContribution('');
        setExpectedReturnRate('7');
        setIncludeSuperannuation(false);
      }
    } catch (error) {
      toast.error('Failed to save goal');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your financial goal details'
              : 'Set a financial goal to track your progress'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., House deposit, Emergency fund"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Goal Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as GoalType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {goalTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex flex-col">
                      <span>{t.label}</span>
                      <span className="text-xs text-muted-foreground">{t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAmount">Target Amount ($)</Label>
            <Input
              id="targetAmount"
              type="number"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="50000"
            />
          </div>

          <div className="space-y-2">
            <Label>Target Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !targetDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, 'PPP') : 'Select a target date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={setTargetDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyContribution">Monthly Contribution ($)</Label>
              <Input
                id="monthlyContribution"
                type="number"
                min="0"
                step="0.01"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                placeholder="500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedReturn">Expected Return (%)</Label>
              <Input
                id="expectedReturn"
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={expectedReturnRate}
                onChange={(e) => setExpectedReturnRate(e.target.value)}
                placeholder="7"
              />
            </div>
          </div>

          {type === 'retirement' && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeSuperannuation"
                checked={includeSuperannuation}
                onChange={(e) => setIncludeSuperannuation(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="includeSuperannuation" className="text-sm font-normal">
                Include superannuation balance in progress
              </Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Goal' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

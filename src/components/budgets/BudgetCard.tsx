'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BudgetProgress } from '@/types';

interface BudgetCardProps {
  progress: BudgetProgress;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function BudgetCard({ progress, onEdit, onDelete }: BudgetCardProps) {
  const { budget, spent, remaining, percentUsed, isOverBudget } = progress;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100);
  };

  const getProgressColorClass = () => {
    if (isOverBudget) return '[&>[data-slot=progress-indicator]]:bg-destructive';
    if (percentUsed >= 90) return '[&>[data-slot=progress-indicator]]:bg-warning';
    if (percentUsed >= 75) return '[&>[data-slot=progress-indicator]]:bg-warning/80';
    return '[&>[data-slot=progress-indicator]]:bg-success';
  };

  return (
    <Card variant="premium" className="group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{budget.name}</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={budget.period === 'monthly' ? 'default' : 'secondary'}>
            {budget.period}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                aria-label={`Open actions for budget ${budget.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatCurrency(spent)} of {formatCurrency(budget.amount)}
            </span>
            <span className={isOverBudget ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
              {Math.round(percentUsed)}%
            </span>
          </div>

          <Progress value={Math.min(percentUsed, 100)} className={`h-2.5 ${getProgressColorClass()}`} />

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {isOverBudget ? 'Over by' : 'Remaining'}
            </span>
            <span
              className={
                isOverBudget
                  ? 'font-semibold text-destructive'
                  : remaining < budget.amount * 0.1
                    ? 'font-semibold text-warning'
                    : 'font-semibold text-success'
              }
            >
              {formatCurrency(Math.abs(remaining))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

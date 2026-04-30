'use client';

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
import { cn } from '@/lib/utils';
import { formatAUD } from '@/lib/utils/currency';

interface BudgetCardProps {
  progress: BudgetProgress;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function BudgetCard({ progress, onEdit, onDelete }: BudgetCardProps) {
  const { budget, spent, remaining, percentUsed, isOverBudget } = progress;

  const barColor = isOverBudget
    ? 'bg-destructive'
    : percentUsed >= 90
      ? 'bg-warning'
      : percentUsed >= 75
        ? 'bg-warning/80'
        : 'bg-primary';

  return (
    <div className="card-trace group relative flex flex-col rounded-lg border border-border/80 fintech-panel p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="eyebrow">{budget.period}</span>
          <p className="mt-1.5 truncate text-[14px] font-medium text-foreground">
            {budget.name}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={isOverBudget ? 'destructive' : 'outline'}>
            {Math.round(percentUsed)}%
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Open actions for budget ${budget.name}`}
              >
                <MoreHorizontal
                  className="h-3.5 w-3.5"
                  strokeWidth={1.5}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil
                    className="mr-2 h-3.5 w-3.5"
                    strokeWidth={1.5}
                  />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2
                    className="mr-2 h-3.5 w-3.5"
                    strokeWidth={1.5}
                  />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between font-mono text-[12px] tabular-nums">
          <span className="text-foreground">{formatAUD(spent)}</span>
          <span className="text-[--text-subtle]">
            / {formatAUD(budget.amount)}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden bg-muted rounded-[1px]">
          <div
            className={cn('h-full transition-all', barColor)}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
          <span>{isOverBudget ? 'Over by' : 'Remaining'}</span>
          <span
            className={cn(
              'tabular-nums',
              isOverBudget
                ? 'text-destructive'
                : remaining < budget.amount * 0.1
                  ? 'text-warning'
                  : 'text-positive',
            )}
          >
            {formatAUD(Math.abs(remaining))}
          </span>
        </div>
      </div>
    </div>
  );
}

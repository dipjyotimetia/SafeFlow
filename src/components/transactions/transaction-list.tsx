'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InstitutionIcon } from '@/components/institution-icon';
import { formatAUD } from '@/lib/utils/currency';
import { isKnownInstitution } from '@/lib/icons/institution-icons';
import { useAccounts, useCategories, useFamilyMembers } from '@/hooks';
import type { Transaction } from '@/types';
import { cn } from '@/lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  density?: 'comfortable' | 'compact';
}

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
  density = 'comfortable',
}: TransactionListProps) {
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { members } = useFamilyMembers();

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );

  const showMemberColumn = members.length > 0;

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return (
          <ArrowUpRight
            className="h-3 w-3 shrink-0 text-positive"
            strokeWidth={1.5}
          />
        );
      case 'expense':
        return (
          <ArrowDownRight
            className="h-3 w-3 shrink-0 text-negative"
            strokeWidth={1.5}
          />
        );
      case 'transfer':
        return (
          <ArrowRightLeft
            className="h-3 w-3 shrink-0 text-[--text-subtle]"
            strokeWidth={1.5}
          />
        );
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>No transactions found</p>
      </div>
    );
  }

  const isCompact = density === 'compact';
  const cellPad = isCompact ? 'py-2' : 'py-3';

  return (
    <Table containerClassName="max-h-[68vh] overflow-auto">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Account</TableHead>
          {showMemberColumn && <TableHead>Member</TableHead>}
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-[48px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => {
          const category = transaction.categoryId
            ? categoryMap.get(transaction.categoryId)
            : null;
          const account = accountMap.get(transaction.accountId);
          const member = transaction.memberId
            ? memberMap.get(transaction.memberId)
            : null;

          const sign =
            transaction.type === 'income'
              ? '+'
              : transaction.type === 'expense'
                ? '−'
                : '';

          const amountColor =
            transaction.type === 'income'
              ? 'text-positive'
              : transaction.type === 'expense'
                ? 'text-negative'
                : 'text-foreground';

          return (
            <TableRow key={transaction.id}>
              <TableCell
                className={cn(
                  'font-mono text-[10.5px] uppercase tracking-[0.14em] text-[--text-subtle]',
                  cellPad,
                )}
              >
                {format(new Date(transaction.date), 'd MMM yy').toUpperCase()}
              </TableCell>

              <TableCell className={cellPad}>
                <div className="flex items-center gap-2">
                  {getTypeIcon(transaction.type)}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {transaction.description}
                    </p>
                    {transaction.merchantName && (
                      <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[--text-subtle]">
                        {transaction.merchantName}
                      </p>
                    )}
                  </div>
                  {transaction.isDeductible && (
                    <Badge variant="accent" className="ml-1">
                      Tax
                    </Badge>
                  )}
                </div>
              </TableCell>

              <TableCell className={cellPad}>
                {category ? (
                  <Badge variant="outline">{category.name}</Badge>
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
                    Uncategorized
                  </span>
                )}
              </TableCell>

              <TableCell className={cellPad}>
                <div className="flex items-center gap-2">
                  {account?.institution &&
                    isKnownInstitution(account.institution) && (
                      <InstitutionIcon
                        institution={account.institution}
                        size="sm"
                      />
                    )}
                  <span className="text-[12px]">
                    {account?.name || 'Unknown'}
                  </span>
                </div>
              </TableCell>

              {showMemberColumn && (
                <TableCell className={cellPad}>
                  {member ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: member.color }}
                      />
                      <span className="text-[12px]">{member.name}</span>
                    </div>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
                      Shared
                    </span>
                  )}
                </TableCell>
              )}

              <TableCell className={cn('text-right', cellPad)}>
                <span
                  className={cn(
                    'font-mono text-[13px] tabular-nums font-medium',
                    amountColor,
                  )}
                >
                  {sign}
                  {formatAUD(transaction.amount)}
                </span>
              </TableCell>

              <TableCell className={cellPad}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Open actions for ${transaction.description}`}
                    >
                      <MoreVertical
                        className="h-3.5 w-3.5"
                        strokeWidth={1.5}
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(transaction)}>
                      <Pencil
                        className="mr-2 h-3.5 w-3.5"
                        strokeWidth={1.5}
                      />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(transaction)}
                    >
                      <Trash2
                        className="mr-2 h-3.5 w-3.5"
                        strokeWidth={1.5}
                      />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

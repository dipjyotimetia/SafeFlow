'use client';

import { format } from 'date-fns';
import {
  ArrowUpCircle,
  ArrowDownCircle,
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

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const showMemberColumn = members.length > 0;

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return <ArrowUpCircle className="h-4 w-4 text-success" />;
      case 'expense':
        return <ArrowDownCircle className="h-4 w-4 text-destructive" />;
      case 'transfer':
        return <ArrowRightLeft className="h-4 w-4 text-primary" />;
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

  return (
    <Table containerClassName="max-h-[68vh] overflow-auto">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[108px]">Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Account</TableHead>
          {showMemberColumn && <TableHead>Member</TableHead>}
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-[56px]" />
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

          return (
            <TableRow key={transaction.id}>
              <TableCell className={cn('font-medium text-muted-foreground', isCompact ? 'py-2' : 'py-3')}>
                {format(new Date(transaction.date), 'dd MMM yy')}
              </TableCell>

              <TableCell className={isCompact ? 'py-2' : 'py-3'}>
                <div className="flex items-center gap-2">
                  {getTypeIcon(transaction.type)}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{transaction.description}</p>
                    {transaction.merchantName && (
                      <p className="truncate text-xs text-muted-foreground">
                        {transaction.merchantName}
                      </p>
                    )}
                  </div>
                  {transaction.isDeductible && (
                    <Badge variant="outline" className="ml-2 text-[11px]">
                      Tax
                    </Badge>
                  )}
                </div>
              </TableCell>

              <TableCell className={isCompact ? 'py-2' : 'py-3'}>
                {category ? (
                  <Badge variant="secondary">{category.name}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Uncategorized</span>
                )}
              </TableCell>

              <TableCell className={isCompact ? 'py-2' : 'py-3'}>
                <div className="flex items-center gap-2">
                  {account?.institution && isKnownInstitution(account.institution) && (
                    <InstitutionIcon institution={account.institution} size="sm" />
                  )}
                  <span className="text-sm">{account?.name || 'Unknown'}</span>
                </div>
              </TableCell>

              {showMemberColumn && (
                <TableCell className={isCompact ? 'py-2' : 'py-3'}>
                  {member ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: member.color }}
                      />
                      <span className="text-sm">{member.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Shared</span>
                  )}
                </TableCell>
              )}

              <TableCell className={cn('text-right', isCompact ? 'py-2' : 'py-3')}>
                <span
                  className={cn(
                    'metric-value font-semibold tabular-nums',
                    transaction.type === 'income' && 'text-success',
                    transaction.type === 'expense' && 'text-destructive',
                  )}
                >
                  {transaction.type === 'income'
                    ? '+'
                    : transaction.type === 'expense'
                      ? '-'
                      : ''}
                  {formatAUD(transaction.amount)}
                </span>
              </TableCell>

              <TableCell className={isCompact ? 'py-2' : 'py-3'}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      aria-label={`Open actions for transaction ${transaction.description}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(transaction)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(transaction)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
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

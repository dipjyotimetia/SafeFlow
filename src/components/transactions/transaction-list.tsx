'use client';

import { format } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, MoreVertical, Pencil, Trash2 } from 'lucide-react';
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
import { formatAUD } from '@/lib/utils/currency';
import type { Transaction, Category, Account } from '@/types';
import { cn } from '@/lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  categories,
  accounts,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case 'expense':
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      case 'transfer':
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No transactions found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => {
          const category = transaction.categoryId
            ? categoryMap.get(transaction.categoryId)
            : null;
          const account = accountMap.get(transaction.accountId);

          return (
            <TableRow key={transaction.id}>
              <TableCell className="font-medium">
                {format(new Date(transaction.date), 'dd/MM/yy')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getTypeIcon(transaction.type)}
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    {transaction.merchantName && (
                      <p className="text-xs text-muted-foreground">
                        {transaction.merchantName}
                      </p>
                    )}
                  </div>
                  {transaction.isDeductible && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Tax
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {category ? (
                  <Badge variant="secondary">{category.name}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">Uncategorized</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm">{account?.name || 'Unknown'}</span>
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    'font-medium',
                    transaction.type === 'income' ? 'text-green-600' : '',
                    transaction.type === 'expense' ? 'text-red-600' : ''
                  )}
                >
                  {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                  {formatAUD(transaction.amount)}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(transaction)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(transaction)}
                      className="text-red-600 focus:text-red-600"
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

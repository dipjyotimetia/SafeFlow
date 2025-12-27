'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatAUD } from '@/lib/utils/currency';
import type { ParsedTransaction } from '@/lib/parsers/types';
import { CheckSquare, Square, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface TransactionPreviewProps {
  transactions: ParsedTransaction[];
  onSelectionChange: (selected: ParsedTransaction[]) => void;
}

export function TransactionPreview({
  transactions,
  onSelectionChange,
}: TransactionPreviewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    // Select all by default
    return new Set(transactions.map((_, i) => i));
  });

  const summary = useMemo(() => {
    let totalCredits = 0;
    let totalDebits = 0;
    let selectedCredits = 0;
    let selectedDebits = 0;

    transactions.forEach((t, i) => {
      if (t.amount > 0) {
        totalCredits += t.amount;
        if (selectedIds.has(i)) selectedCredits += t.amount;
      } else {
        totalDebits += Math.abs(t.amount);
        if (selectedIds.has(i)) selectedDebits += Math.abs(t.amount);
      }
    });

    return {
      totalCount: transactions.length,
      selectedCount: selectedIds.size,
      totalCredits,
      totalDebits,
      selectedCredits,
      selectedDebits,
    };
  }, [transactions, selectedIds]);

  const handleToggle = (index: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      const selected = transactions.filter((_, i) => newSet.has(i));
      onSelectionChange(selected);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
      onSelectionChange([]);
    } else {
      setSelectedIds(new Set(transactions.map((_, i) => i)));
      onSelectionChange(transactions);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1 min-w-[150px]">
          <p className="text-sm text-muted-foreground">Selected</p>
          <p className="text-lg font-semibold">
            {summary.selectedCount} / {summary.totalCount}
          </p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-sm text-muted-foreground">Income</p>
          <p className="text-lg font-semibold text-success">
            {formatAUD(summary.selectedCredits)}
          </p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-sm text-muted-foreground">Expenses</p>
          <p className="text-lg font-semibold text-destructive">
            {formatAUD(summary.selectedDebits)}
          </p>
        </div>
        <div className="flex items-center">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {selectedIds.size === transactions.length ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Deselect All
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Transaction List */}
      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right w-[120px]">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction, index) => {
              const isSelected = selectedIds.has(index);
              const isCredit = transaction.amount > 0;

              return (
                <TableRow
                  key={index}
                  className={isSelected ? '' : 'opacity-50'}
                  onClick={() => handleToggle(index)}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(index)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(transaction.date, 'dd/MM/yy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isCredit ? (
                        <ArrowUpCircle className="h-4 w-4 text-success flex-shrink-0" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      )}
                      <span className="truncate max-w-[300px]">
                        {transaction.description}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={isCredit ? 'text-success' : 'text-destructive'}
                    >
                      {isCredit ? '+' : '-'}
                      {formatAUD(Math.abs(transaction.amount))}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Duplicate Warning */}
      <p className="text-xs text-muted-foreground">
        Tip: Duplicate transactions will be automatically detected and skipped during import.
      </p>
    </div>
  );
}

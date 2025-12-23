'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useTransactionStore } from '@/stores/transaction.store';
import { useAccounts, useCategories } from '@/hooks';
import { parseAUD } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { Transaction, TransactionType } from '@/types';
import { toast } from 'sonner';

const formSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.string()
    .min(1, 'Amount is required')
    .refine((val) => {
      const cleaned = val.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return !isNaN(parsed) && parsed > 0;
    }, { message: 'Must be a valid positive number' }),
  description: z.string().min(1, 'Description is required'),
  categoryId: z.string().optional(),
  date: z.date(),
  notes: z.string().optional(),
  isDeductible: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  defaultAccountId?: string;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  defaultAccountId,
}: TransactionFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createTransaction, updateTransaction } = useTransactionStore();
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: transaction?.accountId ?? defaultAccountId ?? '',
      type: transaction?.type ?? 'expense',
      amount: transaction ? (transaction.amount / 100).toFixed(2) : '',
      description: transaction?.description ?? '',
      categoryId: transaction?.categoryId ?? '',
      date: transaction?.date ? new Date(transaction.date) : new Date(),
      notes: transaction?.notes ?? '',
      isDeductible: transaction?.isDeductible ?? false,
    },
  });

  const selectedType = form.watch('type');

  // Filter categories based on transaction type
  const filteredCategories = categories.filter((c) => {
    if (selectedType === 'transfer') return c.type === 'transfer';
    return c.type === selectedType;
  });

  // Reset form when dialog opens with new transaction
  useEffect(() => {
    if (open) {
      form.reset({
        accountId: transaction?.accountId ?? defaultAccountId ?? '',
        type: transaction?.type ?? 'expense',
        amount: transaction ? (transaction.amount / 100).toFixed(2) : '',
        description: transaction?.description ?? '',
        categoryId: transaction?.categoryId ?? '',
        date: transaction?.date ? new Date(transaction.date) : new Date(),
        notes: transaction?.notes ?? '',
        isDeductible: transaction?.isDeductible ?? false,
      });
    }
  }, [open, transaction, defaultAccountId, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const amount = parseAUD(values.amount);

      if (transaction) {
        await updateTransaction(transaction.id, {
          accountId: values.accountId,
          type: values.type,
          amount,
          description: values.description,
          categoryId: values.categoryId || undefined,
          date: values.date,
          notes: values.notes || undefined,
          isDeductible: values.isDeductible,
        });
        toast.success('Transaction updated');
      } else {
        await createTransaction({
          accountId: values.accountId,
          type: values.type,
          amount,
          description: values.description,
          date: values.date,
          categoryId: values.categoryId || undefined,
          notes: values.notes || undefined,
          isDeductible: values.isDeductible,
        });
        toast.success('Transaction created');
      }

      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save transaction');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          <DialogDescription>
            {transaction ? 'Update transaction details.' : 'Add a new transaction.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <CurrencyInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries at Woolworths" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'dd/MM/yyyy') : 'Pick a date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType === 'expense' && (
              <FormField
                control={form.control}
                name="isDeductible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Tax Deductible</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Mark this expense as tax deductible for ATO reporting
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : transaction ? 'Update' : 'Add Transaction'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

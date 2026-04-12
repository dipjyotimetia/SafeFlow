'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Button } from '@/components/ui/button';
import { useAccountStore } from '@/stores/account.store';
import { useFamilyStore } from '@/stores/family.store';
import { useFamilyMembers } from '@/hooks';
import { parseAUD } from '@/lib/utils/currency';
import type { Account, AccountType, AccountVisibility } from '@/types';
import { toast } from 'sonner';

const accountTypes: { value: AccountType; label: string }[] = [
  { value: 'bank', label: 'Bank Account' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment Account' },
  { value: 'crypto', label: 'Crypto Wallet' },
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
];

const formSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['bank', 'credit', 'cash', 'investment', 'crypto', 'asset', 'liability']),
  institution: z.string().optional(),
  balance: z.string().optional(),
  memberId: z.string().optional(),
  visibility: z.enum(['private', 'shared']),
});

type FormValues = z.infer<typeof formSchema>;

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
}

export function AccountFormDialog({ open, onOpenChange, account }: AccountFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createAccount, updateAccount } = useAccountStore();
  const { selectedMemberId } = useFamilyStore();
  const { members } = useFamilyMembers({ activeOnly: true });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: account?.name ?? '',
      type: account?.type ?? 'bank',
      institution: account?.institution ?? '',
      balance: account ? (account.balance / 100).toFixed(2) : '',
      memberId: account?.memberId ?? selectedMemberId ?? 'shared',
      visibility: account?.visibility ?? 'shared',
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      name: account?.name ?? '',
      type: account?.type ?? 'bank',
      institution: account?.institution ?? '',
      balance: account ? (account.balance / 100).toFixed(2) : '',
      memberId: account?.memberId ?? selectedMemberId ?? 'shared',
      visibility: account?.visibility ?? (selectedMemberId ? 'private' : 'shared'),
    });
  }, [open, account, selectedMemberId, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const balance = values.balance ? (parseAUD(values.balance) ?? 0) : 0;
      const memberId = values.memberId && values.memberId !== 'shared' ? values.memberId : undefined;
      const visibility: AccountVisibility = memberId ? values.visibility : 'shared';

      if (account) {
        await updateAccount(account.id, {
          name: values.name,
          type: values.type,
          institution: values.institution || undefined,
          balance,
          memberId,
          visibility,
        });
        toast.success('Account updated');
      } else {
        await createAccount({
          name: values.name,
          type: values.type,
          institution: values.institution || undefined,
          balance,
          memberId,
          visibility,
        });
        toast.success('Account created');
      }

      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error('Failed to save account');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit Account' : 'Add Account'}</DialogTitle>
          <DialogDescription>
            {account ? 'Update your account details.' : 'Add a new account to track your finances.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ANZ Everyday" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ANZ, Commonwealth Bank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === 'shared') {
                          form.setValue('visibility', 'shared');
                        } else if (form.getValues('visibility') === 'shared') {
                          form.setValue('visibility', 'private');
                        }
                      }}
                      value={field.value || 'shared'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Shared account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="shared">Shared account</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
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
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={form.watch('memberId') === 'shared' ? 'shared' : field.value}
                      disabled={form.watch('memberId') === 'shared'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Balance</FormLabel>
                  <FormControl>
                    <CurrencyInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : account ? 'Update' : 'Add Account'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

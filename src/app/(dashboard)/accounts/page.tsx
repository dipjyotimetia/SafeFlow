'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Wallet } from 'lucide-react';
import { AccountFormDialog, AccountCard } from '@/components/accounts';
import { useAccounts, useAccountsSummary } from '@/hooks';
import { useAccountStore } from '@/stores/account.store';
import { formatAUD } from '@/lib/utils/currency';
import type { Account } from '@/types';
import { toast } from 'sonner';
import { MetricCard } from '@/components/ui/metric-card';
import { SkeletonCard } from '@/components/ui/skeleton';

export default function AccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

  const { accounts, isLoading } = useAccounts();
  const { summary } = useAccountsSummary();
  const { deleteAccount } = useAccountStore();

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingAccount) {
      try {
        await deleteAccount(deletingAccount.id);
        toast.success('Account deleted');
      } catch {
        toast.error('Failed to delete account');
      }
      setDeletingAccount(null);
    }
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingAccount(null);
    }
  };

  return (
    <>
      <Header title="Accounts" />
      <div className="pb-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 sm:px-6 lg:px-8">
          <Card variant="glass-luxury" className="border-primary/15 animate-enter">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle className="text-2xl">Your Accounts</CardTitle>
                <CardDescription>
                  Manage bank accounts, cards, investments, and liabilities.
                </CardDescription>
              </div>
              <Button className="h-9 gap-2" onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Total Assets"
              value={formatAUD(summary.totalAssets)}
              description="All asset accounts"
              variant="positive"
            />
            <MetricCard
              title="Total Liabilities"
              value={formatAUD(summary.totalLiabilities)}
              description="Debt and credit"
              variant="negative"
            />
            <MetricCard
              title="Net Worth"
              value={formatAUD(summary.netWorth)}
              description="Assets minus liabilities"
              variant={summary.netWorth >= 0 ? 'positive' : 'negative'}
            />
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : accounts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={handleEdit}
                  onDelete={setDeletingAccount}
                />
              ))}
            </div>
          ) : (
            <Card variant="premium">
              <CardContent className="py-14">
                <div className="text-center text-muted-foreground">
                  <div className="mx-auto mb-4 w-fit rounded-2xl bg-muted/70 p-4">
                    <Wallet className="h-10 w-10 opacity-45" />
                  </div>
                  <p className="font-medium text-foreground">No accounts yet</p>
                  <p className="mt-1 text-sm">Add your first account to start tracking.</p>
                  <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AccountFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        account={editingAccount}
      />

      <AlertDialog open={!!deletingAccount} onOpenChange={() => setDeletingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Are you sure you want to delete &quot;{deletingAccount?.name}&quot;?
              </span>
              <span className="block font-medium text-destructive">
                All transactions associated with this account will be permanently deleted.
              </span>
              <span className="block">
                This action cannot be undone and your transaction history will be lost.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

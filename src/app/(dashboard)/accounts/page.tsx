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
      } catch (error) {
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Your Accounts</h2>
            <p className="text-sm text-muted-foreground">
              Manage bank accounts, credit cards, and more
            </p>
          </div>
          <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatAUD(summary.totalAssets)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatAUD(summary.totalLiabilities)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${summary.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatAUD(summary.netWorth)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accounts List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        ) : accounts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4" />
                <p>No accounts yet</p>
                <p className="text-sm mt-1">Add your first account to start tracking</p>
                <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Form Dialog */}
      <AccountFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        account={editingAccount}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAccount} onOpenChange={() => setDeletingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingAccount?.name}&quot;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

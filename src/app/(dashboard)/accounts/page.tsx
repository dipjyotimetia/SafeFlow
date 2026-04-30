'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
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
import { useFamilyStore } from '@/stores/family.store';
import { formatAUD } from '@/lib/utils/currency';
import type { Account } from '@/types';
import { toast } from 'sonner';
import { SkeletonCard } from '@/components/ui/skeleton';
import { StatCell } from '@/components/ui/stat-cell';

export default function AccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const { selectedMemberId } = useFamilyStore();
  const memberId = selectedMemberId ?? undefined;

  const { accounts, isLoading } = useAccounts({ memberId });
  const { summary } = useAccountsSummary(memberId);
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
    if (!open) setEditingAccount(null);
  };

  return (
    <>
      <Header title="Accounts" />
      <div className="pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="card-trace relative overflow-hidden rounded-md border border-border bg-card animate-enter">
            <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between md:p-8">
              <div>
                <span className="eyebrow">// Your accounts</span>
                <h1 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
                  Bank, cards, investments, debt
                </h1>
                <p className="mt-2 max-w-prose text-[13px] text-muted-foreground">
                  {accounts.length} account{accounts.length !== 1 ? 's' : ''}{' '}
                  tracked locally.
                </p>
              </div>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Add Account
              </Button>
            </div>
          </section>

          {/* Metric strip */}
          <section className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-md border border-border bg-card sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
            <StatCell
              label="Total Assets"
              value={formatAUD(summary.totalAssets)}
              sublabel="All asset accounts"
              tone="positive"
              delay={0.05}
            />
            <StatCell
              label="Total Liabilities"
              value={formatAUD(summary.totalLiabilities)}
              sublabel="Debt and credit"
              tone="negative"
              delay={0.1}
            />
            <StatCell
              label="Net Worth"
              value={formatAUD(summary.netWorth)}
              sublabel="Assets − Liabilities"
              tone={summary.netWorth >= 0 ? 'positive' : 'negative'}
              delay={0.15}
            />
          </section>

          {/* Accounts grid */}
          <section className="flex items-center gap-3 px-1">
            <span className="eyebrow">Holdings</span>
            <span className="hairline-v h-3" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
              {accounts.length} record{accounts.length !== 1 ? 's' : ''}
            </span>
          </section>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : accounts.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {accounts.map((account, i) => (
                <div
                  key={account.id}
                  className="animate-enter-fast"
                  style={{ animationDelay: `${0.04 * i}s` }}
                >
                  <AccountCard
                    account={account}
                    onEdit={handleEdit}
                    onDelete={setDeletingAccount}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-card px-5 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[2px] border border-border bg-muted/40">
                <Wallet
                  className="h-5 w-5 text-[--text-subtle]"
                  strokeWidth={1.5}
                />
              </div>
              <p className="font-display text-lg tracking-tight">
                No accounts yet
              </p>
              <p className="mx-auto mt-2 max-w-xs text-[13px] text-muted-foreground">
                Add your first account to start tracking.
              </p>
              <Button
                className="mt-5"
                size="sm"
                onClick={() => setIsFormOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                Add Account
              </Button>
            </div>
          )}
        </div>
      </div>

      <AccountFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        account={editingAccount}
      />

      <AlertDialog
        open={!!deletingAccount}
        onOpenChange={() => setDeletingAccount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Are you sure you want to delete &quot;{deletingAccount?.name}
                &quot;?
              </span>
              <span className="block font-medium text-destructive">
                All transactions associated with this account will be
                permanently deleted.
              </span>
              <span className="block">
                This action cannot be undone and your transaction history will
                be lost.
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

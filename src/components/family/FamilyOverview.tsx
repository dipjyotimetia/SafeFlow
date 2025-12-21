'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Wallet } from 'lucide-react';
import { MemberCard } from './MemberCard';
import { MemberFormDialog } from './MemberFormDialog';
import { useFamilyMembers, useFamilySpending, useFamilyAccounts } from '@/hooks/use-family';
import { useFamilyStore } from '@/stores/family.store';
import type { FamilyMember } from '@/types';
import { toast } from 'sonner';
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

export function FamilyOverview() {
  const { members, isLoading: membersLoading } = useFamilyMembers({ activeOnly: false });
  const { spending, isLoading: spendingLoading } = useFamilySpending('month');
  const { accountSummary, isLoading: accountsLoading } = useFamilyAccounts();
  const { deleteMember } = useFamilyStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100);
  };

  const isLoading = membersLoading || spendingLoading || accountsLoading;

  // Create spending map for quick lookup
  const spendingMap = new Map(
    spending.map((s) => [s.member?.id ?? null, { amount: s.amount, count: s.count }])
  );

  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!memberToDelete) return;
    try {
      await deleteMember(memberToDelete.id);
      toast.success('Member removed');
    } catch (error) {
      toast.error('Failed to remove member');
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingMember(null);
    }
  };

  // Calculate totals
  const totalSpending = spending.reduce((sum, s) => sum + s.amount, 0);
  const totalAccounts = accountSummary.reduce((sum, a) => sum + a.accounts.length, 0);
  const totalBalance = accountSummary.reduce((sum, a) => sum + a.totalBalance, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.isActive);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Family Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeMembers.length === 0
                ? 'Add members to track spending'
                : 'active member' + (activeMembers.length !== 1 ? 's' : '')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spending (This Month)</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpending)}</div>
            <p className="text-xs text-muted-foreground">Across all members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">
              {totalAccounts} account{totalAccounts !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Family Members</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Add family members to track individual spending and budgets
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </CardHeader>
        <CardContent>
          {activeMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No family members yet</p>
              <p className="text-sm">Add family members to start tracking individual finances</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeMembers.map((member) => {
                const memberSpending = spendingMap.get(member.id);
                return (
                  <MemberCard
                    key={member.id}
                    member={member}
                    spending={memberSpending?.amount}
                    transactionCount={memberSpending?.count}
                    onEdit={() => handleEdit(member)}
                    onDelete={() => {
                      setMemberToDelete(member);
                      setDeleteDialogOpen(true);
                    }}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Transactions Info */}
      {spending.some((s) => s.member === null && s.count > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unassigned Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You have {spendingMap.get(null)?.count || 0} transactions worth{' '}
              {formatCurrency(spendingMap.get(null)?.amount || 0)} that are not assigned to any
              family member. You can assign transactions to members when editing them.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <MemberFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        member={editingMember}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Family Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{memberToDelete?.name}&quot;? Their
              transactions and accounts will be preserved but no longer associated with them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

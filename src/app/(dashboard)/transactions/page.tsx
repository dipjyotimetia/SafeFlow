"use client";

import { Header } from "@/components/layout/header";
import {
  TransactionFormDialog,
  TransactionList,
} from "@/components/transactions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAccounts,
  useFamilyMembers,
  useMonthlyTotals,
  useTransactions,
} from "@/hooks";
import { formatAUD } from "@/lib/utils/currency";
import { useFamilyStore } from "@/stores/family.store";
import { useTransactionStore } from "@/stores/transaction.store";
import type { Transaction, TransactionType } from "@/types";
import { ArrowRightLeft, Filter, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MetricCard } from "@/components/ui/metric-card";
import { SkeletonTable } from "@/components/ui/skeleton";

export default function TransactionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<Transaction | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [tableDensity, setTableDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const { selectedMemberId: globalMemberId } = useFamilyStore();
  const { members } = useFamilyMembers({ activeOnly: true });

  const effectiveMemberId =
    memberFilter !== "all" ? memberFilter : globalMemberId ?? undefined;

  const { transactions, isLoading } = useTransactions({
    type: typeFilter !== "all" ? (typeFilter as TransactionType) : undefined,
    accountId: accountFilter !== "all" ? accountFilter : undefined,
    memberId: effectiveMemberId,
  });
  const { accounts } = useAccounts();
  const { totals } = useMonthlyTotals();
  const { deleteTransaction } = useTransactionStore();

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingTransaction) {
      try {
        await deleteTransaction(deletingTransaction.id);
        toast.success("Transaction deleted");
      } catch {
        toast.error("Failed to delete transaction");
      }
      setDeletingTransaction(null);
    }
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingTransaction(null);
    }
  };

  return (
    <>
      <Header title="Transactions" />
      <div className="pb-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 sm:px-6 lg:px-8">
          <Card variant="glass-luxury" className="border-primary/15 animate-enter">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle className="text-2xl">All Transactions</CardTitle>
                <CardDescription>
                  Filter, inspect, and manage your financial activity.
                </CardDescription>
              </div>
              <Button className="h-9 gap-2" onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Transaction
              </Button>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="This Month Income"
              value={formatAUD(totals.income)}
              variant="positive"
            />
            <MetricCard
              title="This Month Expenses"
              value={formatAUD(totals.expenses)}
              variant="negative"
            />
            <MetricCard
              title="Net Cashflow"
              value={`${totals.net >= 0 ? "+" : ""}${formatAUD(totals.net)}`}
              variant={totals.net >= 0 ? "positive" : "negative"}
            />
          </div>

          <Card variant="premium">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="mr-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  Filter
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="w-[190px]">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {members.length > 0 && (
                  <Select value={memberFilter} onValueChange={setMemberFilter}>
                    <SelectTrigger className="w-[170px]">
                      <SelectValue>
                        {memberFilter === "all" ? (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>All Members</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  members.find((m) => m.id === memberFilter)
                                    ?.color || "#6b7280",
                              }}
                            />
                            <span>
                              {members.find((m) => m.id === memberFilter)?.name}
                            </span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>All Members</span>
                        </div>
                      </SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: member.color }}
                            />
                            <span>{member.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select
                  value={tableDensity}
                  onValueChange={(value) =>
                    setTableDensity(value as 'comfortable' | 'compact')
                  }
                >
                  <SelectTrigger className="w-[150px]" aria-label="Select table density">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card variant="premium">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4">
                  <SkeletonTable rows={8} />
                </div>
              ) : transactions.length > 0 ? (
                <TransactionList
                  transactions={transactions}
                  onEdit={handleEdit}
                  onDelete={setDeletingTransaction}
                  density={tableDensity}
                />
              ) : (
                <div className="py-14 text-center text-muted-foreground">
                  <div className="mx-auto mb-4 w-fit rounded-2xl bg-muted/70 p-4">
                    <ArrowRightLeft className="h-10 w-10 opacity-45" />
                  </div>
                  <p className="font-medium text-foreground">No transactions found</p>
                  <p className="mt-1 text-sm">
                    Add a transaction or import a bank statement.
                  </p>
                  <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TransactionFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        transaction={editingTransaction}
      />

      <AlertDialog
        open={!!deletingTransaction}
        onOpenChange={() => setDeletingTransaction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action
              cannot be undone.
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

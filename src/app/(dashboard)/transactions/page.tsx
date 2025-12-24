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
import { Card, CardContent } from "@/components/ui/card";
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

export default function TransactionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<Transaction | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");

  // Get global member filter from header
  const { selectedMemberId: globalMemberId } = useFamilyStore();
  const { members } = useFamilyMembers({ activeOnly: true });

  // Use page-level filter if set, otherwise use global filter
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
      } catch (error) {
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">All Transactions</h2>
            <p className="text-sm text-muted-foreground">
              View and manage your transactions
            </p>
          </div>
          <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        {/* Monthly Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">
                This Month Income
              </div>
              <div className="text-2xl font-bold text-success">
                {formatAUD(totals.income)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">
                This Month Expenses
              </div>
              <div className="text-2xl font-bold text-destructive">
                {formatAUD(totals.expenses)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Net Cashflow</div>
              <div
                className={`text-2xl font-bold ${
                  totals.net >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {totals.net >= 0 ? "+" : ""}
                {formatAUD(totals.net)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter:</span>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
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
            <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[160px]">
                <SelectValue>
                  {memberFilter === "all" ? (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>All Members</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            members.find((m) => m.id === memberFilter)?.color ||
                            "#6b7280",
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
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: member.color }}
                      />
                      <span>{member.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Transactions List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : transactions.length > 0 ? (
              <TransactionList
                transactions={transactions}
                onEdit={handleEdit}
                onDelete={setDeletingTransaction}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowRightLeft className="h-12 w-12 mx-auto mb-4" />
                <p>No transactions found</p>
                <p className="text-sm mt-1">
                  Add a transaction or import a bank statement
                </p>
                <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <TransactionFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        transaction={editingTransaction}
      />

      {/* Delete Confirmation */}
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

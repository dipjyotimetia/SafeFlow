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
import { ArrowRightLeft, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SkeletonTable } from "@/components/ui/skeleton";
import { StatCell } from "@/components/ui/stat-cell";

export default function TransactionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<Transaction | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [tableDensity, setTableDensity] = useState<
    "comfortable" | "compact"
  >("compact");

  const { selectedMemberId: globalMemberId } = useFamilyStore();
  const { members } = useFamilyMembers({ activeOnly: true });

  const effectiveMemberId =
    memberFilter !== "all" ? memberFilter : globalMemberId ?? undefined;

  const { transactions, isLoading } = useTransactions({
    type: typeFilter !== "all" ? (typeFilter as TransactionType) : undefined,
    accountId: accountFilter !== "all" ? accountFilter : undefined,
    memberId: effectiveMemberId,
  });
  const { accounts } = useAccounts({ memberId: effectiveMemberId });
  const { totals } = useMonthlyTotals(effectiveMemberId);
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
    if (!open) setEditingTransaction(null);
  };

  return (
    <>
      <Header title="Transactions" />
      <div className="pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="card-trace relative overflow-hidden rounded-md border border-border bg-card animate-enter">
            <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between md:p-8">
              <div>
                <span className="eyebrow">// All transactions</span>
                <h1 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
                  Filter, inspect, manage
                </h1>
                <p className="mt-2 max-w-prose text-[13px] text-muted-foreground">
                  {transactions.length} record
                  {transactions.length !== 1 ? "s" : ""} matching current
                  filters.
                </p>
              </div>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Add Transaction
              </Button>
            </div>
          </section>

          {/* Metric strip */}
          <section className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-md border border-border bg-card sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
            <StatCell
              label="Income · MTD"
              value={formatAUD(totals.income)}
              tone="positive"
              delay={0.05}
            />
            <StatCell
              label="Expenses · MTD"
              value={formatAUD(totals.expenses)}
              tone="negative"
              delay={0.1}
            />
            <StatCell
              label="Net · MTD"
              value={`${totals.net >= 0 ? "+" : ""}${formatAUD(totals.net)}`}
              tone={totals.net >= 0 ? "positive" : "negative"}
              delay={0.15}
            />
          </section>

          {/* Filters bar */}
          <section className="rounded-md border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border px-5 py-2.5">
              <span className="eyebrow">Filters</span>
              <span className="hairline-v h-3" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                {transactions.length} matched
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 p-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-[140px] rounded-sm border border-border bg-transparent font-mono text-[11px] uppercase tracking-[0.1em] shadow-none">
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
                <SelectTrigger className="h-8 w-[180px] rounded-sm border border-border bg-transparent font-mono text-[11px] uppercase tracking-[0.1em] shadow-none">
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
                  <SelectTrigger className="h-8 w-[160px] rounded-sm border border-border bg-transparent font-mono text-[11px] uppercase tracking-[0.1em] shadow-none">
                    <SelectValue>
                      {memberFilter === "all" ? (
                        <div className="flex items-center gap-2">
                          <Users
                            className="h-3 w-3"
                            strokeWidth={1.5}
                          />
                          <span>All Members</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor:
                                members.find((m) => m.id === memberFilter)
                                  ?.color || "#6b7280",
                            }}
                          />
                          <span>
                            {
                              members.find((m) => m.id === memberFilter)
                                ?.name
                            }
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: member.color }}
                          />
                          <span>{member.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <span className="ml-auto" />

              <Select
                value={tableDensity}
                onValueChange={(v) =>
                  setTableDensity(v as "comfortable" | "compact")
                }
              >
                <SelectTrigger
                  className="h-8 w-[140px] rounded-sm border border-border bg-transparent font-mono text-[11px] uppercase tracking-[0.1em] shadow-none"
                  aria-label="Select table density"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Ledger */}
          <section className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
              <div className="flex items-center gap-3">
                <span className="eyebrow">Ledger</span>
                <span className="hairline-v h-3" aria-hidden />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                  Sorted · Newest
                </span>
              </div>
            </div>

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
              <div className="px-5 py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[2px] border border-border bg-muted/40">
                  <ArrowRightLeft
                    className="h-5 w-5 text-[--text-subtle]"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="font-display text-lg tracking-tight">
                  No transactions found
                </p>
                <p className="mx-auto mt-2 max-w-xs text-[13px] text-muted-foreground">
                  Add a transaction or import a bank statement.
                </p>
                <Button
                  className="mt-5"
                  size="sm"
                  onClick={() => setIsFormOpen(true)}
                >
                  <Plus
                    className="mr-1.5 h-3.5 w-3.5"
                    strokeWidth={1.5}
                  />
                  Add Transaction
                </Button>
              </div>
            )}
          </section>
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

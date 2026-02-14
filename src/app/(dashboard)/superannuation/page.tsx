'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  Landmark,
  Loader2,
  MoreHorizontal,
  Trash2,
  Shield,
  PiggyBank,
  Receipt,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useSuperAccounts,
  useSuperSummary,
  useSuperTransactions,
  useContributionSummary,
  useSuperFinancialYears,
} from '@/hooks';
import { useSuperannuationStore } from '@/stores/superannuation.store';
import { formatAUD, parseAUD } from '@/lib/utils/currency';
import { getCurrentFinancialYear, formatFinancialYear } from '@/lib/utils/financial-year';
import { cn } from '@/lib/utils';
import type { SuperProvider, SuperannuationAccount, SuperTransactionType } from '@/types';
import { toast } from 'sonner';

const PROVIDERS: Array<{ value: SuperProvider; label: string }> = [
  { value: 'unisuper', label: 'UniSuper' },
  { value: 'australian-super', label: 'Australian Super' },
  { value: 'other', label: 'Other' },
];

const TRANSACTION_TYPE_LABELS: Record<SuperTransactionType, string> = {
  'employer-sg': 'Employer SG',
  'employer-additional': 'Employer Additional',
  'salary-sacrifice': 'Salary Sacrifice',
  'personal-concessional': 'Personal Concessional',
  'personal-non-concessional': 'Personal Non-Concessional',
  'government-co-contribution': 'Govt Co-Contribution',
  'spouse-contribution': 'Spouse',
  'earnings': 'Earnings',
  'fees': 'Fees',
  'insurance': 'Insurance',
  'withdrawal': 'Withdrawal',
  'rollover-in': 'Rollover In',
  'rollover-out': 'Rollover Out',
};

export default function SuperannuationPage() {
  const [selectedFY, setSelectedFY] = useState(getCurrentFinancialYear());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    provider: 'unisuper' as SuperProvider,
    providerName: 'UniSuper',
    memberNumber: '',
    accountName: '',
    investmentOption: '',
    employerName: '',
    totalBalance: '',
  });

  const { accounts, isLoading: accountsLoading } = useSuperAccounts();
  const { summary, isLoading: summaryLoading } = useSuperSummary();
  const { years } = useSuperFinancialYears();
  const { summary: contributionSummary } = useContributionSummary(selectedFY);
  const { transactions } = useSuperTransactions(undefined, selectedFY);
  const { createAccount, deleteAccount } = useSuperannuationStore();

  const isLoading = accountsLoading || summaryLoading;

  const handleProviderChange = (provider: SuperProvider) => {
    const providerInfo = PROVIDERS.find((p) => p.value === provider);
    setNewAccount({
      ...newAccount,
      provider,
      providerName: providerInfo?.label || provider,
    });
  };

  const handleAddAccount = async () => {
    if (!newAccount.memberNumber) {
      toast.error('Please enter a member number');
      return;
    }

    try {
      await createAccount({
        provider: newAccount.provider,
        providerName: newAccount.providerName,
        memberNumber: newAccount.memberNumber,
        accountName: newAccount.accountName || undefined,
        investmentOption: newAccount.investmentOption || undefined,
        employerName: newAccount.employerName || undefined,
        totalBalance: parseAUD(newAccount.totalBalance) ?? 0,
      });

      toast.success('Super account added');
      setIsAddDialogOpen(false);
      setNewAccount({
        provider: 'unisuper',
        providerName: 'UniSuper',
        memberNumber: '',
        accountName: '',
        investmentOption: '',
        employerName: '',
        totalBalance: '',
      });
    } catch {
      toast.error('Failed to add account');
    }
  };

  const handleDeleteAccount = async (account: SuperannuationAccount) => {
    try {
      await deleteAccount(account.id);
      toast.success('Account deleted');
    } catch {
      toast.error('Failed to delete account');
    }
  };

  const concessionalPercent = contributionSummary.concessionalCap > 0
    ? (contributionSummary.totalConcessional / contributionSummary.concessionalCap) * 100
    : 0;

  const nonConcessionalPercent = contributionSummary.nonConcessionalCap > 0
    ? (contributionSummary.totalNonConcessional / contributionSummary.nonConcessionalCap) * 100
    : 0;

  return (
    <>
      <Header title="Superannuation" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Super Overview</h2>
            <p className="text-sm text-muted-foreground">
              Track your retirement savings
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedFY} onValueChange={setSelectedFY}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((fy) => (
                  <SelectItem key={fy} value={fy}>
                    FY {fy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contributions">Contributions</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">
                      {formatAUD(summary.totalBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {summary.accountCount} account{summary.accountCount !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">YTD Contributions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatAUD(summary.ytdContributions)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFinancialYear(summary.financialYear)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">YTD Earnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={cn(
                      'text-2xl font-bold',
                      summary.ytdEarnings >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {summary.ytdEarnings >= 0 ? '+' : ''}{formatAUD(summary.ytdEarnings)}
                    </div>
                    <p className="text-xs text-muted-foreground">Investment returns</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">YTD Fees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      -{formatAUD(summary.ytdFees)}
                    </div>
                    <p className="text-xs text-muted-foreground">Admin & insurance</p>
                  </CardContent>
                </Card>
              </div>

              {/* Accounts List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="h-5 w-5" />
                    Super Accounts
                  </CardTitle>
                  <CardDescription>Your superannuation fund accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  {accounts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead>Member Number</TableHead>
                          <TableHead>Investment</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Landmark className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{account.providerName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {account.accountName || 'Accumulation'}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {account.provider.toUpperCase()}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {account.memberNumber}
                            </TableCell>
                            <TableCell>
                              {account.investmentOption || '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatAUD(account.totalBalance)}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteAccount(account)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Landmark className="h-12 w-12 mx-auto mb-4" />
                      <p>No super accounts yet</p>
                      <p className="text-sm mt-1">Add your first super account to get started</p>
                      <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Account
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contributions" className="space-y-6">
              {/* Contribution Caps */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <PiggyBank className="h-4 w-4" />
                      Concessional Contributions
                    </CardTitle>
                    <CardDescription>
                      Pre-tax contributions (cap: {formatAUD(contributionSummary.concessionalCap)})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Used: {formatAUD(contributionSummary.totalConcessional)}</span>
                      <span>Remaining: {formatAUD(contributionSummary.concessionalRemaining)}</span>
                    </div>
                    <Progress value={Math.min(concessionalPercent, 100)} className="h-2" />
                    {contributionSummary.carryForwardAvailable ? (
                      <p className="text-xs text-muted-foreground">
                        Includes carry-forward amount of {formatAUD(contributionSummary.carryForwardAvailable)}
                      </p>
                    ) : null}
                    {contributionSummary.carryForwardReason ? (
                      <p className="text-xs text-amber-600">{contributionSummary.carryForwardReason}</p>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Employer SG:</span>
                        <span>{formatAUD(contributionSummary.employerSG)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Salary Sacrifice:</span>
                        <span>{formatAUD(contributionSummary.salarySacrifice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Employer Add:</span>
                        <span>{formatAUD(contributionSummary.employerAdditional)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Personal:</span>
                        <span>{formatAUD(contributionSummary.personalConcessional)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Non-Concessional Contributions
                    </CardTitle>
                    <CardDescription>
                      After-tax contributions (cap: {formatAUD(contributionSummary.nonConcessionalCap)})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Used: {formatAUD(contributionSummary.totalNonConcessional)}</span>
                      <span>Remaining: {formatAUD(contributionSummary.nonConcessionalRemaining)}</span>
                    </div>
                    <Progress value={Math.min(nonConcessionalPercent, 100)} className="h-2" />
                    {contributionSummary.bringForwardYearsAvailable ? (
                      <p className="text-xs text-muted-foreground">
                        Bring-forward window: {contributionSummary.bringForwardYearsAvailable} year
                        {contributionSummary.bringForwardYearsAvailable !== 1 ? 's' : ''}
                      </p>
                    ) : null}
                    {contributionSummary.bringForwardReason ? (
                      <p className="text-xs text-amber-600">{contributionSummary.bringForwardReason}</p>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Personal:</span>
                        <span>{formatAUD(contributionSummary.personalNonConcessional)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Spouse:</span>
                        <span>{formatAUD(contributionSummary.spouseContribution)}</span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span className="text-muted-foreground">Govt Co-Contribution:</span>
                        <span>{formatAUD(contributionSummary.governmentCoContribution)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contribution Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Contribution Caps {formatFinancialYear(selectedFY)}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong>Concessional (pre-tax):</strong> Base cap {formatAUD(contributionSummary.baseConcessionalCap || contributionSummary.concessionalCap)}.
                    Current usable cap {formatAUD(contributionSummary.concessionalCap)} including any carry-forward.
                  </p>
                  <p>
                    <strong>Non-concessional (after-tax):</strong> Base cap {formatAUD(contributionSummary.baseNonConcessionalCap || contributionSummary.nonConcessionalCap)}.
                    Current usable cap {formatAUD(contributionSummary.nonConcessionalCap)} based on bring-forward eligibility.
                  </p>
                  <p>
                    <strong>Super Guarantee:</strong> {contributionSummary.superGuaranteeRate || 12}% of ordinary time earnings for {formatFinancialYear(selectedFY)}.
                  </p>
                  <p>
                    <strong>Cap test balance (30 June prior year proxy):</strong>{' '}
                    {formatAUD(contributionSummary.totalSuperBalanceForCapTests || 0)} against transfer balance cap{' '}
                    {formatAUD(contributionSummary.transferBalanceCap || 0)}.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Transaction History
                  </CardTitle>
                  <CardDescription>
                    {formatFinancialYear(selectedFY)} transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((t) => {
                          const date = t.date instanceof Date ? t.date : new Date(t.date);
                          return (
                            <TableRow key={t.id}>
                              <TableCell className="text-sm">
                                {date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </TableCell>
                              <TableCell>
                                <Badge variant={t.amount >= 0 ? 'default' : 'secondary'}>
                                  {TRANSACTION_TYPE_LABELS[t.type] || t.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {t.description || '-'}
                              </TableCell>
                              <TableCell className={cn(
                                'text-right font-medium',
                                t.amount >= 0 ? 'text-success' : 'text-destructive'
                              )}>
                                {t.amount >= 0 ? '+' : ''}{formatAUD(t.amount)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-4" />
                      <p>No transactions for {formatFinancialYear(selectedFY)}</p>
                      <p className="text-sm mt-1">Import a super statement to see transactions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Super Account</DialogTitle>
            <DialogDescription>
              Add a superannuation account to track
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider *</label>
              <Select value={newAccount.provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Member Number *</label>
              <Input
                placeholder="e.g., 12345678"
                value={newAccount.memberNumber}
                onChange={(e) => setNewAccount({ ...newAccount, memberNumber: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Name</label>
                <Input
                  placeholder="e.g., Accumulation"
                  value={newAccount.accountName}
                  onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Investment Option</label>
                <Input
                  placeholder="e.g., Balanced"
                  value={newAccount.investmentOption}
                  onChange={(e) => setNewAccount({ ...newAccount, investmentOption: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Employer Name</label>
              <Input
                placeholder="e.g., ACME Corporation"
                value={newAccount.employerName}
                onChange={(e) => setNewAccount({ ...newAccount, employerName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Current Balance ($)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newAccount.totalBalance}
                onChange={(e) => setNewAccount({ ...newAccount, totalBalance: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAccount}>Add Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

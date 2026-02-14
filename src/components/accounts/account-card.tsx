'use client';

import {
  Building2,
  CreditCard,
  Wallet,
  TrendingUp,
  Bitcoin,
  Home,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { InstitutionIcon } from '@/components/institution-icon';
import { formatAUD } from '@/lib/utils/currency';
import { isKnownInstitution } from '@/lib/icons/institution-icons';
import type { Account, AccountType } from '@/types';
import { cn } from '@/lib/utils';

const accountIcons: Record<AccountType, typeof Building2> = {
  bank: Building2,
  credit: CreditCard,
  cash: Wallet,
  investment: TrendingUp,
  crypto: Bitcoin,
  asset: Home,
  liability: FileText,
};

const accountColors: Record<AccountType, string> = {
  bank: 'text-primary bg-primary/15',
  credit: 'text-warning bg-warning/15',
  cash: 'text-success bg-success/15',
  investment: 'text-primary bg-primary/12',
  crypto: 'text-warning bg-warning/15',
  asset: 'text-primary bg-accent/30',
  liability: 'text-destructive bg-destructive/12',
};

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const Icon = accountIcons[account.type];
  const colorClass = accountColors[account.type];
  const isNegative =
    account.balance < 0 || account.type === 'liability' || account.type === 'credit';
  const hasInstitutionIcon =
    account.institution && isKnownInstitution(account.institution);

  return (
    <Card variant="premium" className="group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex min-w-0 items-center gap-3">
          {hasInstitutionIcon ? (
            <InstitutionIcon institution={account.institution!} size="lg" />
          ) : (
            <div className={cn('rounded-xl p-2.5', colorClass)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <CardTitle className="truncate text-base font-medium">{account.name}</CardTitle>
            {account.institution && (
              <p className="truncate text-xs text-muted-foreground">{account.institution}</p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              aria-label={`Open actions for account ${account.name}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(account)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <div
          className={cn(
            'metric-value text-2xl font-semibold tabular-nums',
            isNegative ? 'text-destructive' : 'text-foreground',
          )}
        >
          {formatAUD(Math.abs(account.balance))}
          {isNegative && account.balance !== 0 && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">owed</span>
          )}
        </div>
        <p className="mt-1 text-xs capitalize text-muted-foreground">
          {account.type.replace('-', ' ')} account
        </p>
      </CardContent>
    </Card>
  );
}

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
import { formatAUD } from '@/lib/utils/currency';
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
  bank: 'text-blue-600 bg-blue-100',
  credit: 'text-orange-600 bg-orange-100',
  cash: 'text-green-600 bg-green-100',
  investment: 'text-purple-600 bg-purple-100',
  crypto: 'text-yellow-600 bg-yellow-100',
  asset: 'text-teal-600 bg-teal-100',
  liability: 'text-red-600 bg-red-100',
};

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const Icon = accountIcons[account.type];
  const colorClass = accountColors[account.type];
  const isNegative = account.balance < 0 || account.type === 'liability' || account.type === 'credit';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', colorClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-medium">{account.name}</CardTitle>
            {account.institution && (
              <p className="text-xs text-muted-foreground">{account.institution}</p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(account)}
              className="text-red-600 focus:text-red-600"
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
            'text-2xl font-bold',
            isNegative ? 'text-red-600' : 'text-foreground'
          )}
        >
          {formatAUD(Math.abs(account.balance))}
          {isNegative && account.balance !== 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-1">owed</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground capitalize mt-1">
          {account.type.replace('-', ' ')} Account
        </p>
      </CardContent>
    </Card>
  );
}

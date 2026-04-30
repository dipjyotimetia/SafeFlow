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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { InstitutionIcon } from '@/components/institution-icon';
import { formatAUD, splitAUD } from '@/lib/utils/currency';
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

const accountTone: Record<AccountType, string> = {
  bank: 'text-primary',
  credit: 'text-warning',
  cash: 'text-success',
  investment: 'text-primary',
  crypto: 'text-warning',
  asset: 'text-foreground',
  liability: 'text-destructive',
};

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const Icon = accountIcons[account.type];
  const tone = accountTone[account.type];
  const isNegative =
    account.balance < 0 ||
    account.type === 'liability' ||
    account.type === 'credit';
  const hasInstitutionIcon =
    account.institution && isKnownInstitution(account.institution);

  const split = splitAUD(Math.abs(account.balance));

  return (
    <div className="card-trace group relative flex flex-col rounded-lg border border-border/80 fintech-panel p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {hasInstitutionIcon ? (
            <InstitutionIcon institution={account.institution!} size="md" />
          ) : (
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/40',
                tone,
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            </div>
          )}
          <div className="min-w-0">
            <p className="eyebrow">{account.type.replace('-', ' ')}</p>
            <p className="mt-1.5 truncate text-[14px] font-medium text-foreground">
              {account.name}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Open actions for ${account.name}`}
            >
              <MoreVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <Pencil className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(account)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-5">
        <p
          className={cn(
            'metric-value animate-wipe-in tabular-nums text-[28px]',
            isNegative ? 'text-negative' : 'text-foreground',
          )}
        >
          <span>{split.whole}</span>
          {split.cents && (
            <span className="mono-num text-[14px] text-[--text-subtle]">
              {split.cents}
            </span>
          )}
        </p>
        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
          {isNegative && account.balance !== 0 ? (
            <span className="rounded-lg border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-destructive">
              Owed
            </span>
          ) : null}
          <span>
            {account.institution || account.type.replace('-', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}

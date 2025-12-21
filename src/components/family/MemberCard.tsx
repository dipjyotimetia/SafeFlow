'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FamilyMember } from '@/types';

interface MemberCardProps {
  member: FamilyMember;
  spending?: number;
  transactionCount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function MemberCard({ member, spending = 0, transactionCount = 0, onEdit, onDelete }: MemberCardProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: member.color }}
          >
            <User className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-lg font-medium">{member.name}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {!member.isActive && (
            <Badge variant="secondary">Inactive</Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">This Month</p>
            <p className="text-xl font-semibold">{formatCurrency(spending)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Transactions</p>
            <p className="text-xl font-semibold">{transactionCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { Cloud, CloudOff, RefreshCw, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getCurrentFinancialYear, formatFinancialYear } from '@/lib/utils/financial-year';
import { useSyncStore } from '@/stores/sync.store';
import { useFamilyStore } from '@/stores/family.store';
import { useFamilyMembers } from '@/hooks/use-family';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const currentFY = getCurrentFinancialYear();

  // Get sync status from store
  const { status: syncStatus, isConnected } = useSyncStore();

  // Family member filtering
  const { members } = useFamilyMembers({ activeOnly: true });
  const { selectedMemberId, setSelectedMemberId } = useFamilyStore();
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
      case 'synced':
        return <Cloud className="h-4 w-4 text-success" />;
      case 'error':
        return <CloudOff className="h-4 w-4 text-destructive" />;
      case 'offline':
        return <CloudOff className="h-4 w-4 text-warning" />;
      default:
        return <Cloud className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSyncText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return 'Synced';
      case 'error':
        return 'Sync error';
      case 'offline':
        return 'Offline';
      default:
        return isConnected ? 'Not synced' : 'Local only';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-background/95 backdrop-blur-md px-6 supports-[backdrop-filter]:bg-background/80">
      {/* Page title - with spacing for mobile menu */}
      <div className="flex-1 md:pl-0 pl-10">
        {title && <h1 className="text-xl font-semibold tracking-tight">{title}</h1>}
      </div>

      {/* Family Member Filter */}
      {members.length > 0 && (
        <Select
          value={selectedMemberId ?? 'all'}
          onValueChange={(value) => setSelectedMemberId(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[140px] sm:w-[160px] h-9">
            <SelectValue>
              {selectedMember ? (
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedMember.color }}
                  />
                  <span className="truncate">{selectedMember.name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span>All Members</span>
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

      {/* Financial Year Badge */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-primary text-sm font-medium">
        {formatFinancialYear(currentFY)}
      </div>

      {/* Sync Status */}
      <Button variant="ghost" size="sm" className="gap-2 hover:bg-accent/50">
        {getSyncIcon()}
        <span className="hidden sm:inline text-sm">{getSyncText()}</span>
      </Button>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isConnected ? (
            <>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Sync Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Disconnect</DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem>
              <Cloud className="mr-2 h-4 w-4" />
              Connect Cloud Sync
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

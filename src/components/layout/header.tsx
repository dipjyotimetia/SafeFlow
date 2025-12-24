'use client';

import { Cloud, CloudOff, RefreshCw, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/80 backdrop-blur-xl px-6 supports-[backdrop-filter]:bg-background/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Page title - with spacing for mobile menu */}
      <div className="flex-1 md:pl-0 pl-10">
        {title && (
          <h1 className="text-xl font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text animate-enter-fast">
            {title}
          </h1>
        )}
      </div>

      {/* Family Member Filter */}
      {members.length > 0 && (
        <Select
          value={selectedMemberId ?? 'all'}
          onValueChange={(value) => setSelectedMemberId(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[140px] sm:w-[160px] h-9 bg-background/50 border-border/60 shadow-sm">
            <SelectValue>
              {selectedMember ? (
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[0_0_4px_rgba(0,0,0,0.2)]"
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
      <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/15 text-primary text-sm font-semibold shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-subtle" />
        {formatFinancialYear(currentFY)}
      </div>

      {/* Sync Status */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "gap-2 rounded-full px-3 transition-all duration-300",
          syncStatus === 'syncing' && "bg-primary/10 text-primary",
          syncStatus === 'synced' && "bg-success/10 text-success",
          syncStatus === 'error' && "bg-destructive/10 text-destructive",
          syncStatus === 'offline' && "bg-warning/10 text-warning",
          !syncStatus && "hover:bg-accent/50"
        )}
      >
        {getSyncIcon()}
        <span className="hidden sm:inline text-sm font-medium">{getSyncText()}</span>
      </Button>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-muted/50 hover:bg-muted transition-all duration-200 hover:scale-105"
          >
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 shadow-lg border-border/60">
          <DropdownMenuLabel className="font-semibold">My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isConnected ? (
            <>
              <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">Sync Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer focus:text-destructive">Disconnect</DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem className="cursor-pointer">
              <Cloud className="mr-2 h-4 w-4" />
              Connect Cloud Sync
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

'use client';

import { Cloud, CloudOff, RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCurrentFinancialYear, formatFinancialYear } from '@/lib/utils/financial-year';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const currentFY = getCurrentFinancialYear();

  // TODO: Replace with actual sync status from store
  const syncStatus = 'idle' as 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  const isAuthenticated = false;

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'synced':
        return <Cloud className="h-4 w-4 text-green-500" />;
      case 'error':
        return <CloudOff className="h-4 w-4 text-red-500" />;
      case 'offline':
        return <CloudOff className="h-4 w-4 text-yellow-500" />;
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
        return isAuthenticated ? 'Not synced' : 'Local only';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-6">
      {/* Page title - with spacing for mobile menu */}
      <div className="flex-1 md:pl-0 pl-10">
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
      </div>

      {/* Financial Year Badge */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-sm">
        {formatFinancialYear(currentFY)}
      </div>

      {/* Sync Status */}
      <Button variant="ghost" size="sm" className="gap-2">
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
          {isAuthenticated ? (
            <>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Sync Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Sign Out</DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem>
              <Cloud className="mr-2 h-4 w-4" />
              Connect Google Drive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

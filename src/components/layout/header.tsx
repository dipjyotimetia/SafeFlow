"use client";

import { format } from "date-fns";
import { Cloud, CloudOff, RefreshCw, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCurrentFinancialYear,
  formatFinancialYear,
} from "@/lib/utils/financial-year";
import { useSyncStore } from "@/stores/sync.store";
import { useFamilyStore } from "@/stores/family.store";
import { useFamilyMembers } from "@/hooks/use-family";

interface HeaderProps {
  title?: string;
  className?: string;
}

export function Header({ title, className }: HeaderProps) {
  const currentFY = getCurrentFinancialYear();
  const { status: syncStatus, isConnected } = useSyncStore();

  const { members } = useFamilyMembers({ activeOnly: true });
  const { selectedMemberId, setSelectedMemberId } = useFamilyStore();
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const getSyncIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case "synced":
        return <Cloud className="h-4 w-4" />;
      case "error":
        return <CloudOff className="h-4 w-4" />;
      case "offline":
        return <CloudOff className="h-4 w-4" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };

  const getSyncText = () => {
    switch (syncStatus) {
      case "syncing":
        return "Syncing";
      case "synced":
        return "Synced";
      case "error":
        return "Sync error";
      case "offline":
        return "Offline";
      default:
        return isConnected ? "Not synced" : "Local only";
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/60 px-5 py-3",
        "glass-luxury supports-backdrop-filter:bg-background/70",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        <div className="min-w-0 flex-1 pl-10 md:pl-0">
          {title && (
            <h1 className="animate-enter-fast truncate text-xl font-semibold tracking-tight md:text-2xl">
              {title}
            </h1>
          )}
          <p className="hidden text-xs text-muted-foreground sm:block">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>

        {members.length > 0 && (
          <Select
            value={selectedMemberId ?? "all"}
            onValueChange={(value) =>
              setSelectedMemberId(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="h-9 w-[150px] border-border/70 bg-card/60 shadow-none sm:w-[190px]">
              <SelectValue>
                {selectedMember ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: selectedMember.color }}
                    />
                    <span className="truncate">{selectedMember.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
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
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                    <span>{member.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-sm font-medium text-primary sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-primary" />
          {formatFinancialYear(currentFY)}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 rounded-full border border-border/70 bg-card/70 px-3 text-xs",
            syncStatus === "syncing" && "text-primary",
            syncStatus === "synced" && "text-success",
            syncStatus === "error" && "text-destructive",
            syncStatus === "offline" && "text-warning",
          )}
        >
          {getSyncIcon()}
          <span className="hidden sm:inline">{getSyncText()}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-border/70 bg-card/70"
              aria-label="Open user menu"
            >
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-semibold">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isConnected ? (
              <>
                <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Sync Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                  Disconnect
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem className="cursor-pointer">
                <Cloud className="mr-2 h-4 w-4" />
                Connect Cloud Sync
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

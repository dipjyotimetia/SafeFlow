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
import { FinancialYear } from "@/domain/value-objects/financial-year";
import { useSyncStore } from "@/stores/sync.store";
import { useFamilyStore } from "@/stores/family.store";
import { useFamilyMembers } from "@/hooks/use-family";

interface HeaderProps {
  title?: string;
  className?: string;
}

// Evaluated at module load. The FY only changes once a year on 1 July; a
// session that survives that boundary will need a refresh to pick up the
// rollover anyway.
const CURRENT_FY = FinancialYear.current();

export function Header({ title, className }: HeaderProps) {
  const currentFY = CURRENT_FY;
  const { status: syncStatus, isConnected } = useSyncStore();

  const { members } = useFamilyMembers({ activeOnly: true });
  const { selectedMemberId, setSelectedMemberId } = useFamilyStore();
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const getSyncIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return <RefreshCw className="h-3 w-3 animate-spin" strokeWidth={1.5} />;
      case "synced":
        return <Cloud className="h-3 w-3" strokeWidth={1.5} />;
      case "error":
      case "offline":
        return <CloudOff className="h-3 w-3" strokeWidth={1.5} />;
      default:
        return <Cloud className="h-3 w-3" strokeWidth={1.5} />;
    }
  };

  const syncLabel = (() => {
    switch (syncStatus) {
      case "syncing":
        return "SYNCING";
      case "synced":
        return "SYNCED";
      case "error":
        return "ERROR";
      case "offline":
        return "OFFLINE";
      default:
        return isConnected ? "PENDING" : "LOCAL";
    }
  })();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/80 bg-background/88 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/78",
        className,
      )}
    >
      {/* Ticker bar */}
      <div className="flex items-center gap-5 overflow-x-auto border-b border-border/70 px-5 py-2">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
          <span className="live-dot" />
          <span>FY · {currentFY.format()}</span>
        </div>
        <span aria-hidden className="hidden h-3 w-px bg-border sm:block" />
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-[--text-subtle] sm:block">
          {format(new Date(), "EEE · d MMM yyyy")}
        </span>
        <span aria-hidden className="hidden h-3 w-px bg-border md:block" />
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] md:flex",
            syncStatus === "synced" && "text-primary",
            syncStatus === "error" && "text-destructive",
            syncStatus === "offline" && "text-warning",
            (syncStatus === "syncing" || !syncStatus) && "text-[--text-subtle]",
          )}
        >
          {getSyncIcon()} <span>SYNC · {syncLabel}</span>
        </span>
        <span className="ml-auto rounded-full border border-border/70 bg-card/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[--text-subtle]">
          AUD
        </span>
      </div>

      {/* Main row */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 md:gap-4">
        <div className="min-w-0 flex-1 pl-10 md:pl-0">
          {title && (
            <h1 className="animate-enter-fast truncate font-display text-2xl tracking-tight md:text-[30px]">
              {title}
            </h1>
          )}
        </div>

        {members.length > 0 && (
          <Select
            value={selectedMemberId ?? "all"}
            onValueChange={(value) =>
              setSelectedMemberId(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="h-9 w-[160px] rounded-lg border border-border/80 bg-card/70 font-mono text-[11px] uppercase tracking-[0.1em] shadow-sm sm:w-[190px]">
              <SelectValue>
                {selectedMember ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: selectedMember.color }}
                    />
                    <span className="truncate">{selectedMember.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" strokeWidth={1.5} />
                    <span>ALL · MEMBERS</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>All Members</span>
                </div>
              </SelectItem>
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Open user menu"
            >
              <User className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-medium">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isConnected ? (
              <>
                <DropdownMenuItem className="cursor-pointer">
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  Sync Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                  Disconnect
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem className="cursor-pointer">
                <Cloud className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Connect Cloud Sync
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

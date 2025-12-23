'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  FileUp,
  TrendingUp,
  Landmark,
  Calculator,
  Settings,
  Shield,
  Menu,
  X,
  PiggyBank,
  Users,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navSections = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', href: '/overview', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Finance',
    items: [
      { title: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
      { title: 'Accounts', href: '/accounts', icon: Wallet },
      { title: 'Budgets', href: '/budgets', icon: PiggyBank },
      { title: 'Import', href: '/import', icon: FileUp },
    ],
  },
  {
    title: 'Wealth',
    items: [
      { title: 'Investments', href: '/investments', icon: TrendingUp },
      { title: 'Property', href: '/property', icon: Building2 },
      { title: 'Superannuation', href: '/superannuation', icon: Landmark },
    ],
  },
  {
    title: 'Reports',
    items: [
      { title: 'Tax', href: '/tax', icon: Calculator },
      { title: 'Family', href: '/family', icon: Users },
    ],
  },
  {
    title: 'System',
    items: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden shadow-lg bg-background/80 backdrop-blur-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-card border-r border-border/50 transition-all duration-300 md:translate-x-0',
          'shadow-[4px_0_24px_rgba(0,0,0,0.04)]',
          'dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border/50 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">SafeFlow</h1>
              <p className="text-[11px] text-muted-foreground font-medium">Australian Finance</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
            {navSections.map((section, sectionIndex) => (
              <div key={section.title} className="animate-enter" style={{ animationDelay: `${sectionIndex * 0.05}s` }}>
                {sectionIndex > 0 && (
                  <div className="mb-3 px-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        {section.title}
                      </p>
                      <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
                    </div>
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]'
                            : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground'
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary-foreground/40" />
                        )}
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200',
                            isActive
                              ? 'bg-primary-foreground/15'
                              : 'bg-muted/50 group-hover:bg-accent group-hover:scale-105'
                          )}
                        >
                          <item.icon className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            !isActive && "group-hover:scale-110"
                          )} />
                        </span>
                        <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                          {item.title}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/50 bg-gradient-to-t from-muted/20 to-transparent">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
              </span>
              <span className="font-medium">Data stored locally</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

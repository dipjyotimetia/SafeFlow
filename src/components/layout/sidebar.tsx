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
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';

const navSections = [
  {
    title: 'Overview',
    items: [{ title: 'Dashboard', href: '/overview', icon: LayoutDashboard }],
  },
  {
    title: 'Money',
    items: [
      { title: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
      { title: 'Accounts', href: '/accounts', icon: Wallet },
      { title: 'Budgets', href: '/budgets', icon: PiggyBank },
      { title: 'Import', href: '/import', icon: FileUp },
    ],
  },
  {
    title: 'Growth',
    items: [
      { title: 'Investments', href: '/investments', icon: TrendingUp },
      { title: 'Property', href: '/property', icon: Building2 },
      { title: 'Superannuation', href: '/superannuation', icon: Landmark },
    ],
  },
  {
    title: 'Insights',
    items: [
      { title: 'Tax', href: '/tax', icon: Calculator },
      { title: 'Family', href: '/family', icon: Users },
    ],
  },
  {
    title: 'System',
    items: [{ title: 'Settings', href: '/settings', icon: Settings }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const activePath = useMemo(() => pathname ?? '', [pathname]);

  return (
    <>
      <Button
        variant="glass"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden shadow-premium"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Toggle navigation"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-72 border-r border-sidebar-border/70 bg-sidebar/95 backdrop-blur-xl transition-transform duration-300',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="relative border-b border-sidebar-border/80 px-6 py-5">
            <div className="absolute inset-0 bg-linear-to-r from-primary/12 via-transparent to-accent/20" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-[0_12px_26px_-14px_var(--primary)]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">SafeFlow</h1>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  AU Finance OS
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
            {navSections.map((section, sectionIndex) => (
              <section
                key={section.title}
                className="animate-enter"
                style={{ animationDelay: `${sectionIndex * 0.06}s` }}
              >
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      activePath === item.href ||
                      activePath.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-premium'
                            : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground',
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary-foreground/75" />
                        )}
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
                            isActive
                              ? 'bg-sidebar-primary-foreground/15'
                              : 'bg-muted/60 group-hover:bg-sidebar-accent',
                          )}
                        >
                          <item.icon
                            className={cn(
                              'h-4 w-4 transition-transform duration-200',
                              !isActive && 'group-hover:scale-110',
                            )}
                          />
                        </span>
                        <span className="truncate">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>

          <div className="border-t border-sidebar-border/80 p-4">
            <div className="rounded-2xl border border-sidebar-border/70 bg-card/65 p-3 shadow-premium">
              <p className="text-xs font-semibold text-foreground">Private Mode Active</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Data never leaves your device.
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-success">
                <Lock className="h-3 w-3" />
                Local encrypted storage
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

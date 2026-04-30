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
  Menu,
  X,
  PiggyBank,
  Target,
  Users,
  Building2,
  Lock,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

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
      { title: 'Cash Flow', href: '/cashflow', icon: Activity },
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
      { title: 'Goals', href: '/goals', icon: Target },
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
  const activePath = pathname ?? '';

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Toggle navigation"
      >
        {isOpen ? (
          <X className="h-5 w-5" strokeWidth={1.5} />
        ) : (
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        )}
      </Button>

      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-background/85 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-[252px] border-r border-sidebar-border bg-sidebar/92 shadow-premium backdrop-blur-xl transition-transform duration-300',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="border-b border-sidebar-border px-5 py-5">
            <Link
              href="/overview"
              className="group flex items-center gap-3"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/14 text-primary shadow-[0_10px_24px_color-mix(in_oklab,var(--primary)_18%,transparent)] transition-colors group-hover:bg-primary/20">
                <span className="font-mono text-[11px] font-bold tracking-[0.06em]">
                  SF
                </span>
              </div>
              <div className="leading-none">
                <div className="font-display text-[21px] tracking-tight text-foreground">
                  SafeFlow
                </div>
                <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[--text-subtle]">
                  Private Wealth OS
                </div>
              </div>
            </Link>
          </div>

          {/* Status row */}
          <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.15em] text-[--text-subtle]">
                Local vault
              </span>
            </div>
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
              v0.1
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-2 py-4">
            {navSections.map((section, sectionIndex) => (
              <section
                key={section.title}
                className="mb-5 animate-enter-fast"
                style={{ animationDelay: `${sectionIndex * 0.05}s` }}
              >
                <p className="eyebrow mb-2 px-3">{section.title}</p>
                <div>
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
                          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-150',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                            : 'text-sidebar-foreground/72 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
                        )}
                      >
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary animate-rail"
                          />
                        )}
                        <span
                          className={cn(
                            'absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-foreground/30 opacity-0 transition-opacity duration-150',
                            !isActive && 'group-hover:opacity-100',
                          )}
                          aria-hidden
                        />
                        <item.icon
                          className="h-3.5 w-3.5 shrink-0"
                          strokeWidth={1.5}
                        />
                        <span className="truncate font-medium">
                          {item.title}
                        </span>
                        {isActive && (
                          <ChevronRight
                            className="ml-auto h-3 w-3 opacity-60"
                            strokeWidth={1.5}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border px-5 py-4">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/45 p-3">
              <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[--text-subtle]">
              <Lock className="h-3 w-3" strokeWidth={1.5} />
              <span>Local · Encrypted</span>
              </div>
              <div className="hairline mt-3" />
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Finance data stays on this device.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

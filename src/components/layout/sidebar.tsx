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
          'fixed left-0 top-0 z-40 h-screen w-[240px] border-r border-border bg-sidebar transition-transform duration-300',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="border-b border-border px-5 py-5">
            <Link
              href="/overview"
              className="group flex items-center gap-3"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-primary bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <span className="font-mono text-[10.5px] font-semibold tracking-[0.06em]">
                  SF
                </span>
              </div>
              <div className="leading-none">
                <div className="font-display text-[19px] tracking-tight text-foreground">
                  SafeFlow
                </div>
                <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-[--text-subtle]">
                  AU · Finance OS
                </div>
              </div>
            </Link>
          </div>

          {/* Status row */}
          <div className="flex items-center justify-between border-b border-border px-5 py-2">
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[--text-subtle]">
                Live
              </span>
            </div>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[--text-subtle]">
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
                          'group relative flex items-center gap-3 px-3 py-[7px] text-[13px] transition-colors duration-150',
                          isActive
                            ? 'text-primary'
                            : 'text-foreground/75 hover:bg-muted/40 hover:text-foreground',
                        )}
                      >
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1 bottom-1 w-[2px] bg-primary animate-rail"
                          />
                        )}
                        <span
                          className={cn(
                            'absolute left-0 top-1 bottom-1 w-[2px] bg-foreground/30 opacity-0 transition-opacity duration-150',
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
          <div className="border-t border-border px-5 py-4">
            <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-[--text-subtle]">
              <Lock className="h-3 w-3" strokeWidth={1.5} />
              <span>Local · Encrypted</span>
            </div>
            <div className="hairline mt-3" />
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Your data never leaves this device.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

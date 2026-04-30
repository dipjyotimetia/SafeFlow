'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Bot,
  Database,
  FileUp,
  PiggyBank,
  Shield,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Reveal } from '@/components/ui/reveal';

type GuideCard = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  details: string[];
  actionLabel?: string;
  actionHref?: string;
};

const guideCards: GuideCard[] = [
  {
    id: 'accounts',
    title: 'Create or review your accounts',
    description:
      'Go to Accounts, add your bank/credit/investment accounts, and verify opening balances.',
    icon: Wallet,
    details: [
      'Open Accounts and add each account you actively use.',
      'Pick the correct account type so reports and totals classify correctly.',
      'Set opening balances before importing transactions to avoid incorrect net worth.',
      'Edit account labels and institutions so imports and filters are easier to use.',
    ],
    actionLabel: 'Open Accounts',
    actionHref: '/accounts',
  },
  {
    id: 'import',
    title: 'Import transactions',
    description:
      'Use Import to parse statement PDFs. Review mappings and confirm transactions before save.',
    icon: FileUp,
    details: [
      'Upload a supported statement PDF from your bank or provider.',
      'Review parsed rows and account mapping before confirming the import.',
      'Fix any uncategorized or malformed rows before saving.',
      'After import, check Transactions for duplicates and transfer accuracy.',
    ],
    actionLabel: 'Open Import',
    actionHref: '/import',
  },
  {
    id: 'budgets-goals',
    title: 'Set budgets and goals',
    description:
      'Create monthly/yearly budgets and financial goals to monitor spending and progress.',
    icon: PiggyBank,
    details: [
      'Create category budgets for recurring spending areas.',
      'Use monthly budgets for short-term control and yearly budgets for larger planning.',
      'Track goal progress and adjust targets as income/expenses change.',
      'Review Budget and Goals pages weekly to catch drift early.',
    ],
    actionLabel: 'Open Budgets',
    actionHref: '/budgets',
  },
  {
    id: 'investments-property',
    title: 'Track investments and property',
    description:
      'Add holdings, refresh prices, and analyze allocation, performance, and property cashflow.',
    icon: TrendingUp,
    details: [
      'In Investments, add holdings with symbol, units, and cost basis.',
      'Refresh prices regularly to keep gain/loss and allocation accurate.',
      'Use Property tools for yield, affordability, projections, and scenario testing.',
      'Use compact density mode in tables when working with many positions.',
    ],
    actionLabel: 'Open Investments',
    actionHref: '/investments',
  },
  {
    id: 'family',
    title: 'Enable family filters',
    description:
      'Add family members and tag transactions so each person can be filtered and reported clearly.',
    icon: Users,
    details: [
      'Add members in Family with distinct colors and labels.',
      'Assign member ownership during import or transaction editing.',
      'Use the member filter in the top header to switch views quickly.',
      'Keep shared expenses unassigned if they should appear in household totals.',
    ],
    actionLabel: 'Open Family',
    actionHref: '/family',
  },
  {
    id: 'backup',
    title: 'Back up your data',
    description:
      'Use Settings to export a backup, or enable encrypted cloud sync if you want off-device copies.',
    icon: Database,
    details: [
      'Export a local backup at least weekly and before major changes.',
      'If using cloud sync, configure provider credentials and encryption settings.',
      'Store your encryption password in a password manager.',
      'Test restore from a backup periodically so recovery is predictable.',
    ],
    actionLabel: 'Open Settings',
    actionHref: '/settings',
  },
  {
    id: 'ai-setup',
    title: 'Set up local AI chat',
    description:
      'Run Ollama locally, connect SafeFlow, and enable private on-device AI assistance.',
    icon: Bot,
    details: [
      'Install Ollama from https://ollama.com/download and start the Ollama service.',
      'Pull a model in terminal: `ollama pull llama3.1:8b`.',
      'In SafeFlow Settings > AI Assistant, set host to `http://127.0.0.1:11434`.',
      'Pick the model, click Test, then Save AI Settings.',
      'Optional: enable auto-categorization for imported transactions.',
      'If connection fails, verify Ollama is running and host/model values are correct.',
    ],
    actionLabel: 'Configure AI in Settings',
    actionHref: '/settings',
  },
];

export default function LearnMorePage() {
  const [activeGuide, setActiveGuide] = useState<GuideCard | null>(null);

  return (
    <div className="relative min-h-screen overflow-hidden pb-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-fade-bottom opacity-25" />

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-10 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-primary bg-primary/10 text-primary">
              <span className="font-mono text-[10.5px] font-semibold tracking-[0.06em]">
                SF
              </span>
            </div>
            <div className="leading-none">
              <div className="font-display text-[19px] tracking-tight">
                SafeFlow
              </div>
              <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-[--text-subtle]">
                AU · Finance OS
              </div>
            </div>
          </Link>
          <Link href="/overview">
            <Button variant="outline" size="sm">
              Open Dashboard
            </Button>
          </Link>
        </header>

        <Reveal>
          <section className="card-trace relative overflow-hidden rounded-md border border-border bg-card animate-enter">
            <div className="scan-line" aria-hidden />
            <div className="p-8 md:p-10">
              <span className="eyebrow">// SafeFlow guide</span>
              <h1 className="mt-4 max-w-3xl font-display text-[clamp(36px,5.4vw,60px)] tracking-tight leading-[0.95] text-balance">
                How to use SafeFlow,{' '}
                <span className="italic text-primary">end to end.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
                Click any card below to open a detailed walkthrough. Includes
                full local AI chat setup.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link href="/overview">
                  <Button>
                    Open Dashboard
                    <ArrowRight
                      className="ml-1 h-3.5 w-3.5"
                      strokeWidth={1.5}
                    />
                  </Button>
                </Link>
                <a
                  href="https://github.com/dipjyotimetia/SafeFlow/blob/main/docs/USER_GUIDE.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline">Open User Guide (Repo)</Button>
                </a>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={70}>
          <div className="mb-3 flex items-center gap-3">
            <span className="eyebrow">Walkthroughs</span>
            <span className="hairline-v h-3" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
              {guideCards.length} guides
            </span>
          </div>
          <div className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-md border border-border bg-card sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-3 lg:divide-x">
            {guideCards.map((step, i) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveGuide(step)}
                className={`card-trace relative p-6 text-left transition-colors hover:bg-muted/30 ${
                  i >= 3 ? 'border-t border-border lg:border-t' : ''
                }`}
                aria-label={`Open guide details for ${step.title}`}
              >
                <div className="flex items-center justify-between">
                  <step.icon
                    className="h-4 w-4 text-primary"
                    strokeWidth={1.5}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--text-subtle]">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                  // Open details →
                </p>
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delayMs={90}>
          <section className="card-trace overflow-hidden rounded-md border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border px-5 py-3">
              <Shield
                className="h-3.5 w-3.5 text-primary"
                strokeWidth={1.5}
              />
              <span className="eyebrow">Privacy & data ownership</span>
            </div>
            <div className="p-5 space-y-2.5 text-[13px] text-muted-foreground">
              <p>
                <span className="text-primary">// </span>
                Export backups regularly from Settings before major changes.
              </p>
              <p>
                <span className="text-primary">// </span>
                If using cloud sync, set a strong encryption password and store
                it safely.
              </p>
              <p>
                <span className="text-primary">// </span>
                Review imported transactions before saving to maintain clean
                data quality.
              </p>
            </div>
          </section>
        </Reveal>
      </main>

      <Dialog open={!!activeGuide} onOpenChange={(open) => !open && setActiveGuide(null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{activeGuide?.title}</DialogTitle>
            <DialogDescription>{activeGuide?.description}</DialogDescription>
          </DialogHeader>

          <div className="divide-y divide-border rounded-[2px] border border-border">
            {activeGuide?.details.map((detail, index) => (
              <div
                key={`${activeGuide.id}-${index}`}
                className="flex items-start gap-3 px-3 py-2"
              >
                <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                  0{index + 1}
                </span>
                <span className="flex-1 text-[13px] leading-relaxed text-muted-foreground">
                  {detail}
                </span>
              </div>
            ))}
          </div>

          <DialogFooter>
            {activeGuide?.actionHref && activeGuide?.actionLabel && (
              <Link href={activeGuide.actionHref}>
                <Button className="gap-2" onClick={() => setActiveGuide(null)}>
                  {activeGuide.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

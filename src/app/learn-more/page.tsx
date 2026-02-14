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
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-12%] h-[26rem] w-[26rem] rounded-full bg-primary/14 blur-3xl" />
        <div className="absolute right-[-12%] top-[16%] h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-10 sm:px-6 lg:px-8">
        <Reveal className="space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            SafeFlow Guide
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            How to use SafeFlow, end to end
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
            Click any card below to open a detailed walkthrough. Includes full local AI chat setup.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/overview">
              <Button variant="premium" className="gap-2">
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a
              href="https://github.com/dipjyotimetia/SafeFlow/blob/main/docs/USER_GUIDE.md"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline">Open Full User Guide (Repo)</Button>
            </a>
          </div>
        </Reveal>

        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" delayMs={70}>
          {guideCards.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveGuide(step)}
              className="text-left"
              aria-label={`Open guide details for ${step.title}`}
            >
              <Card
                variant="premium"
                className="h-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-premium-lg"
              >
                <CardHeader className="pb-2">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-6">
                    {step.description}
                  </CardDescription>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                    Click for details
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </Reveal>

        <Reveal delayMs={90}>
          <Card variant="glass-luxury" className="border-primary/15">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-5 w-5 text-primary" />
              Privacy and data ownership
            </CardTitle>
            <CardDescription>
              Your data stays local by default. Backups and sync are optional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Export backups regularly from Settings before major changes.</p>
            <p>2. If using cloud sync, set a strong encryption password and store it safely.</p>
            <p>3. Review imported transactions before saving to maintain clean data quality.</p>
          </CardContent>
          </Card>
        </Reveal>
      </main>

      <Dialog open={!!activeGuide} onOpenChange={(open) => !open && setActiveGuide(null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{activeGuide?.title}</DialogTitle>
            <DialogDescription>{activeGuide?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {activeGuide?.details.map((detail, index) => (
              <div
                key={`${activeGuide.id}-${index}`}
                className="rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm"
              >
                <span className="mr-2 font-semibold text-primary">{index + 1}.</span>
                <span className="text-muted-foreground">{detail}</span>
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

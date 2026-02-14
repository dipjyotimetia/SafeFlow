import Link from 'next/link';
import {
  ArrowRight,
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

const quickStartSteps = [
  {
    title: 'Create or review your accounts',
    description:
      'Go to Accounts, add your bank/credit/investment accounts, and verify opening balances.',
    icon: Wallet,
  },
  {
    title: 'Import transactions',
    description:
      'Use Import to parse statement PDFs. Review mappings and confirm transactions before save.',
    icon: FileUp,
  },
  {
    title: 'Set budgets and goals',
    description:
      'Create monthly/yearly budgets and financial goals to monitor spending and progress.',
    icon: PiggyBank,
  },
  {
    title: 'Track investments and property',
    description:
      'Add holdings, refresh prices, and analyze allocation, performance, and property cashflow.',
    icon: TrendingUp,
  },
  {
    title: 'Enable family filters',
    description:
      'Add family members and tag transactions so each person can be filtered and reported clearly.',
    icon: Users,
  },
  {
    title: 'Back up your data',
    description:
      'Use Settings to export a backup, or enable encrypted cloud sync if you want off-device copies.',
    icon: Database,
  },
];

export default function LearnMorePage() {
  return (
    <div className="relative min-h-screen overflow-hidden pb-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-12%] h-[26rem] w-[26rem] rounded-full bg-primary/14 blur-3xl" />
        <div className="absolute right-[-12%] top-[16%] h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-10 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            SafeFlow Guide
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            How to use SafeFlow, end to end
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
            SafeFlow is local-first. Start with accounts and imports, then move into
            budgets, investments, tax, and long-term planning.
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
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickStartSteps.map((step) => (
            <Card key={step.title} variant="premium" className="h-full">
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
              </CardContent>
            </Card>
          ))}
        </section>

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
      </main>
    </div>
  );
}

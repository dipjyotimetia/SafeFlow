import Link from 'next/link';
import {
  Lock,
  Smartphone,
  ChevronRight,
  Database,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';

const features = [
  {
    icon: Lock,
    title: '100% Private',
    description:
      'Finance data stays on your device with zero third-party tracking.',
  },
  {
    icon: Database,
    title: 'Local-First Engine',
    description:
      'Fast offline performance, encrypted at rest in your browser.',
  },
  {
    icon: Wallet,
    title: 'AU-Ready Toolkit',
    description:
      'Built for Australian tax years, categories, and family planning.',
  },
  {
    icon: Smartphone,
    title: 'Works Anywhere',
    description: 'Desktop and mobile, with no internet dependency.',
  },
];

const ledgerRows = [
  { ticker: 'SAFEFLOW', label: 'Local DB', value: 'IDXDB · v0.1', tone: 'mute' },
  { ticker: 'AUD · LIVE', label: 'Currency', value: 'AUD', tone: 'mute' },
  { ticker: 'CRYPTO', label: 'Sync', value: 'AES-GCM 256', tone: 'accent' },
  { ticker: 'DATA', label: 'Egress', value: 'NONE', tone: 'accent' },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-fade-bottom opacity-25" />

      <main className="relative mx-auto flex w-full max-w-[1180px] flex-col gap-14 px-5 pb-16 pt-8 sm:px-6 lg:pt-12">
        {/* Top bar */}
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
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 sm:flex">
              <span className="live-dot" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[--text-subtle]">
                Local · Online
              </span>
            </span>
            <Link href="/overview">
              <Button variant="outline" size="sm">
                Open Dashboard
                <ArrowUpRight
                  className="ml-1 h-3.5 w-3.5"
                  strokeWidth={1.5}
                />
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="card-trace relative overflow-hidden rounded-md border border-border bg-card animate-enter">
          <div className="scan-line" aria-hidden />

          <div className="grid gap-8 p-8 md:grid-cols-12 md:p-10 lg:p-14">
            <div className="md:col-span-7">
              <span className="eyebrow">// Privacy-first · Family finance</span>

              <h1 className="mt-5 max-w-[14ch] font-display text-[clamp(40px,6.4vw,76px)] tracking-tight leading-[0.95] text-balance">
                Beautiful personal finance,{' '}
                <span className="italic text-primary">fully on your device.</span>
              </h1>

              <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
                Plan budgets, manage accounts, and track investments with a
                modern, local-first experience built for Australian households.
                Your data never leaves this device.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-2">
                <Link href="/overview">
                  <Button size="lg">
                    Get Started
                    <ChevronRight
                      className="ml-1 h-4 w-4"
                      strokeWidth={1.5}
                    />
                  </Button>
                </Link>
                <Link href="/learn-more">
                  <Button size="lg" variant="outline">
                    Learn More
                  </Button>
                </Link>
              </div>

              <div className="mt-8 hairline" />

              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <Stat label="Egress" value="0 KB" />
                <Stat label="Encryption" value="AES-256" />
                <Stat label="Storage" value="Local" />
                <Stat label="Tracking" value="None" />
              </div>
            </div>

            <div className="md:col-span-5 md:border-l md:border-border md:pl-8">
              <span className="eyebrow">// Manifest</span>
              <div className="mt-4 hairline" />

              <ul className="divide-y divide-border">
                {ledgerRows.map((row, i) => (
                  <li
                    key={row.ticker}
                    className="flex items-center justify-between gap-4 py-2.5 animate-enter-fast"
                    style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[--text-subtle] w-20">
                        {row.ticker}
                      </span>
                      <span className="text-[13px] text-foreground/80 truncate">
                        {row.label}
                      </span>
                    </div>
                    <span
                      className={
                        row.tone === 'accent'
                          ? 'font-mono text-[12px] uppercase tracking-[0.16em] text-primary'
                          : 'font-mono text-[12px] uppercase tracking-[0.16em] text-foreground'
                      }
                    >
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="hairline mt-2" />

              <p className="mt-5 font-mono text-[11px] leading-relaxed text-[--text-subtle]">
                <span className="text-primary">// </span>
                Your data. Your rules. No cloud lock-in. Export and control
                everything.
              </p>
            </div>
          </div>
        </section>

        {/* Feature ledger */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <span className="eyebrow">Capabilities</span>
            <span className="hairline-v h-3" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
              Why SafeFlow
            </span>
          </div>

          <Reveal
            className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-md border border-border bg-card sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4"
            delayMs={80}
          >
            {features.map((feature, index) => (
              <FeatureCell
                key={feature.title}
                index={index}
                feature={feature}
              />
            ))}
          </Reveal>
        </section>

        {/* Footer ticker */}
        <footer className="hairline-strong opacity-60" aria-hidden />
        <div className="-mt-12 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[--text-subtle]">
          <span>© SafeFlow · {new Date().getFullYear()}</span>
          <div className="flex items-center gap-4">
            <span>Build · 0.1</span>
            <span className="hidden sm:inline">·</span>
            <Link href="/learn-more" className="hover:text-foreground">
              Learn More
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--text-subtle]">
        {label}
      </div>
      <div className="mt-1 font-mono text-[14px] tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function FeatureCell({
  index,
  feature,
}: {
  index: number;
  feature: { icon: typeof Lock; title: string; description: string };
}) {
  const Icon = feature.icon;
  return (
    <div
      className="card-trace relative p-6 transition-colors hover:bg-muted/30 animate-enter-fast"
      style={{ animationDelay: `${0.06 + index * 0.05}s` }}
    >
      <div className="flex items-center justify-between">
        <Icon
          className="h-4 w-4 text-primary"
          strokeWidth={1.5}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[--text-subtle]">
          0{index + 1}
        </span>
      </div>
      <h3 className="mt-5 font-display text-xl tracking-tight">
        {feature.title}
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        {feature.description}
      </p>
    </div>
  );
}

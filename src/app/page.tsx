import Link from 'next/link';
import {
  Shield,
  Lock,
  Smartphone,
  ChevronRight,
  Sparkles,
  Database,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Lock,
    title: '100% Private',
    description:
      'All finance data is stored locally with zero third-party tracking.',
  },
  {
    icon: Database,
    title: 'Local-First Engine',
    description:
      'Fast offline performance with your own encrypted financial workspace.',
  },
  {
    icon: Wallet,
    title: 'AU-Ready Toolkit',
    description:
      'Purpose-built for Australian tax years, categories, and family planning.',
  },
  {
    icon: Smartphone,
    title: 'Works Anywhere',
    description:
      'Use it on desktop and mobile with no internet dependency.',
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-primary/14 blur-3xl" />
        <div className="absolute right-[-12%] top-[12%] h-[30rem] w-[30rem] rounded-full bg-accent/30 blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-premium">
              <Shield className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">SafeFlow AU</span>
          </div>
          <Link href="/overview">
            <Button variant="outline" size="sm">
              Open Dashboard
            </Button>
          </Link>
        </header>

        <section className="animate-enter grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Privacy-first family finance
            </p>

            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Beautiful personal finance,
              <span className="block text-primary">fully on your device.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Plan budgets, manage accounts, and track investments with a modern,
              local-first experience built for Australian households.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/overview">
                <Button size="lg" variant="premium" className="h-11 px-6">
                  Get Started
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/learn-more">
                <Button size="lg" variant="outline" className="h-11 px-6">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>

          <Card variant="glass-luxury" className="animate-enter stagger-2 overflow-hidden border-primary/15">
            <CardContent className="space-y-4 p-6">
              <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  SafeFlow Promise
                </p>
                <p className="mt-2 text-xl font-semibold">Your data. Your rules.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No cloud lock-in required. Export and control everything.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <p className="text-sm font-medium">Local storage</p>
                  <p className="mt-1 text-xs text-muted-foreground">Encrypted browser database</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <p className="text-sm font-medium">Family-ready</p>
                  <p className="mt-1 text-xs text-muted-foreground">Multi-member filtering</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              variant="premium"
              className="animate-enter"
              style={{ animationDelay: `${0.12 + index * 0.05}s` }}
            >
              <CardContent className="p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}

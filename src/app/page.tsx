import Link from 'next/link';
import { Shield, Lock, Smartphone, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Shield className="h-4 w-4" />
              Privacy-First Finance
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Take Control of Your{' '}
            <span className="text-primary">Family Finances</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Track expenses, manage cashflow, and monitor investments with complete privacy.
            Your financial data never leaves your device.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/overview">
              <Button size="lg" className="gap-2">
                Get Started
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">100% Private</h3>
            <p className="text-muted-foreground">
              All data stays on your device. No servers, no tracking, no data sales.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Australian Tax Ready</h3>
            <p className="text-muted-foreground">
              Built for Australian financial year (July-June) with ATO deduction categories.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
              <Smartphone className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Works Offline</h3>
            <p className="text-muted-foreground">
              Access your finances anywhere, anytime. No internet required.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">SafeFlow AU</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your data. Your device. Your privacy.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

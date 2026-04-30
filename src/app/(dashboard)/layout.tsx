'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { initializeDatabase } from '@/lib/db';

const FloatingChatWidget = dynamic(
  () => import('@/components/ai').then((mod) => mod.FloatingChatWidget),
  { ssr: false }
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDbReady, setIsDbReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsDbReady(true))
      .catch(console.error);
  }, []);

  if (!isDbReady) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-fade-bottom opacity-30" />
        <div className="animate-enter relative w-full max-w-sm rounded-md border border-border bg-card p-8 text-center">
          <div className="eyebrow mb-4">// initializing</div>
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border border-border border-t-primary" />
          <p className="font-display text-xl tracking-tight">
            Preparing your workspace
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
            Local finance database
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid-fade-bottom opacity-25" />

      <Sidebar />

      <main className="min-h-screen md:pl-[240px]">
        <div key={pathname} className="relative animate-route-in">
          {children}
        </div>
      </main>

      <FloatingChatWidget />
    </div>
  );
}

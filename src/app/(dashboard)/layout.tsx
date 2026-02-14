'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsDbReady(true))
      .catch(console.error);
  }, []);

  if (!isDbReady) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="animate-enter relative rounded-2xl border border-border/70 bg-card/75 p-8 text-center shadow-premium-lg backdrop-blur-xl">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="font-medium">Preparing your workspace</p>
          <p className="mt-1 text-sm text-muted-foreground">Initializing local finance database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-10%] top-[-18%] h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-12%] top-[10%] h-[32rem] w-[32rem] rounded-full bg-accent/20 blur-3xl" />
      </div>

      <Sidebar />

      <main className="min-h-screen md:pl-72">
        <div className="relative">{children}</div>
      </main>

      <FloatingChatWidget />
    </div>
  );
}

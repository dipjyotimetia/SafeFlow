'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { initializeDatabase } from '@/lib/db';

// Lazy load FloatingChatWidget - it's not needed for initial render
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
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64">
        {children}
      </main>
      <FloatingChatWidget />
    </div>
  );
}

'use client';

import { FamilyOverview } from '@/components/family';
import { Header } from '@/components/layout/header';

export default function FamilyPage() {
  return (
    <>
      <Header title="Family" />
      <div className="pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 sm:px-6 lg:px-8">
          <section className="card-trace relative overflow-hidden rounded-md border border-border bg-card animate-enter">
            <div className="p-6 md:p-8">
              <span className="eyebrow">// Family members</span>
              <h1 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
                Track individual spending
              </h1>
              <p className="mt-2 max-w-prose text-[13px] text-muted-foreground">
                Tag transactions per member, filter views, manage shared
                accounts.
              </p>
            </div>
          </section>

          <FamilyOverview />
        </div>
      </div>
    </>
  );
}

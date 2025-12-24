'use client';

import { FamilyOverview } from '@/components/family';
import { Header } from '@/components/layout/header';

export default function FamilyPage() {
  return (
    <>
      <Header title="Family" />
      <div className="p-6 space-y-6">
        <div>
          <p className="text-muted-foreground">
            Manage family members and track individual spending
          </p>
        </div>

        <FamilyOverview />
      </div>
    </>
  );
}

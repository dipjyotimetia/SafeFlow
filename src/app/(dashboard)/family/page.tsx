import { FamilyOverview } from '@/components/family';

export default function FamilyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Family</h2>
        <p className="text-muted-foreground">
          Manage family members and track individual spending
        </p>
      </div>

      <FamilyOverview />
    </div>
  );
}

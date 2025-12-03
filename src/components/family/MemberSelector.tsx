'use client';

import { User, Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFamilyMembers } from '@/hooks/use-family';
import { useFamilyStore } from '@/stores/family.store';

interface MemberSelectorProps {
  className?: string;
  showAllOption?: boolean;
  label?: string;
}

export function MemberSelector({
  className,
  showAllOption = true,
  label = 'Family member',
}: MemberSelectorProps) {
  const { members, isLoading } = useFamilyMembers();
  const { selectedMemberId, setSelectedMemberId } = useFamilyStore();

  if (isLoading) {
    return null;
  }

  // Don't show selector if there are no family members
  if (members.length === 0) {
    return null;
  }

  return (
    <Select
      value={selectedMemberId || 'all'}
      onValueChange={(value) => setSelectedMemberId(value === 'all' ? null : value)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>All Members</span>
            </div>
          </SelectItem>
        )}
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            <div className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: member.color }}
              >
                <User className="h-2.5 w-2.5 text-white" />
              </div>
              <span>{member.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { User, UserPlus, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFamilyMembers } from '@/hooks/use-family';
import { useFamilyStore } from '@/stores/family.store';
import { parseAccountNameForMember } from '@/lib/utils/account-name-parser';

interface MemberSelectorProps {
  accountName?: string;
  selectedMemberId: string | null;
  onMemberChange: (memberId: string | null) => void;
  className?: string;
}

type SelectionType = 'suggested' | 'existing' | 'new' | 'shared';

export function MemberSelector({
  accountName,
  selectedMemberId,
  onMemberChange,
  className,
}: MemberSelectorProps) {
  const { members } = useFamilyMembers({ activeOnly: true });
  const { createMember } = useFamilyStore();

  const [showNewMemberDialog, setShowNewMemberDialog] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectionType, setSelectionType] = useState<SelectionType>('shared');

  // Parse account name to suggest a member
  const parseResult = parseAccountNameForMember(accountName, members);

  // Set initial selection based on suggestion
  useEffect(() => {
    if (parseResult.suggestedMemberId && parseResult.confidence >= 0.6) {
      // High-confidence match found
      setSelectionType('suggested');
      onMemberChange(parseResult.suggestedMemberId);
    } else if (parseResult.isNewMember && parseResult.suggestedMemberName) {
      // Suggest creating a new member
      setSelectionType('new');
      setNewMemberName(parseResult.suggestedMemberName);
    }
    // Only run on initial mount or when accountName changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountName]);

  const handleSelectionChange = (value: string) => {
    if (value === 'shared') {
      setSelectionType('shared');
      onMemberChange(null);
    } else if (value === 'new') {
      setSelectionType('new');
      setShowNewMemberDialog(true);
    } else {
      setSelectionType('existing');
      onMemberChange(value);
    }
  };

  const handleCreateMember = async () => {
    if (!newMemberName.trim()) return;

    setIsCreating(true);
    try {
      const memberId = await createMember(newMemberName.trim());
      onMemberChange(memberId);
      setShowNewMemberDialog(false);
      setNewMemberName('');
      setSelectionType('existing');
    } finally {
      setIsCreating(false);
    }
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <div className={className}>
      <Label className="text-sm font-medium mb-2 block">Account Owner</Label>

      {/* Suggestion banner */}
      {parseResult.detectedName && parseResult.confidence >= 0.5 && (
        <div className="mb-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Detected: {parseResult.detectedName}
              </p>
              {parseResult.suggestedMemberId && parseResult.suggestedMemberName ? (
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  Matched to existing member: {parseResult.suggestedMemberName}
                </p>
              ) : (
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  No matching member found - create new?
                </p>
              )}
            </div>
            {parseResult.suggestedMemberId && selectionType === 'suggested' && (
              <Badge variant="secondary" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Auto-selected
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Member selector */}
      <Select
        value={selectedMemberId ?? 'shared'}
        onValueChange={handleSelectionChange}
      >
        <SelectTrigger className="w-full sm:w-[300px]">
          <SelectValue placeholder="Select account owner">
            {selectedMemberId ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedMember?.color || '#6b7280' }}
                />
                <span>{selectedMember?.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Shared Account</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="shared">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Shared Account</span>
            </div>
          </SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: member.color }}
                />
                <span>{member.name}</span>
              </div>
            </SelectItem>
          ))}
          <SelectItem value="new">
            <div className="flex items-center gap-2 text-primary">
              <UserPlus className="h-4 w-4" />
              <span>Add New Member...</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <p className="text-xs text-muted-foreground mt-2">
        Assign this account to a family member for easier filtering and reports
      </p>

      {/* Create new member dialog */}
      <Dialog open={showNewMemberDialog} onOpenChange={setShowNewMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
            <DialogDescription>
              Create a new family member to assign accounts and transactions to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Enter name"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewMemberDialog(false);
                setNewMemberName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateMember}
              disabled={!newMemberName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

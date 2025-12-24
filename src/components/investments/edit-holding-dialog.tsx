'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHoldingStore } from '@/stores/holding.store';
import { formatAUD, parseAUD } from '@/lib/utils/currency';
import type { Holding, HoldingType } from '@/types';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, BarChart3, Building2, Bitcoin, Landmark } from 'lucide-react';

interface EditHoldingDialogProps {
  holding: Holding | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const HOLDING_TYPES: { value: HoldingType; label: string; icon: React.ReactNode }[] = [
  { value: 'etf', label: 'ETF', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'stock', label: 'Stock', icon: <Building2 className="h-4 w-4" /> },
  { value: 'crypto', label: 'Crypto', icon: <Bitcoin className="h-4 w-4" /> },
  { value: 'managed-fund', label: 'Managed Fund', icon: <Landmark className="h-4 w-4" /> },
];

export function EditHoldingDialog({ holding, open, onOpenChange, onSuccess }: EditHoldingDialogProps) {
  const { updateHolding } = useHoldingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<HoldingType>('etf');
  const [units, setUnits] = useState('');
  const [costBasis, setCostBasis] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Track if units or cost basis changed
  const [hasUnitsChanged, setHasUnitsChanged] = useState(false);
  const [hasCostBasisChanged, setHasCostBasisChanged] = useState(false);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open && holding) {
      setSymbol(holding.symbol);
      setName(holding.name);
      setType(holding.type);
      setUnits(holding.units.toString());
      setCostBasis((holding.costBasis / 100).toFixed(2));
      setCurrentPrice(holding.currentPrice ? (holding.currentPrice / 100).toFixed(2) : '');
      setAdjustmentReason('');
      setHasUnitsChanged(false);
      setHasCostBasisChanged(false);
    }
  }, [open, holding]);

  if (!holding) return null;

  const parsedUnits = parseFloat(units) || 0;
  const parsedCostBasis = parseAUD(costBasis) || 0;
  const parsedCurrentPrice = parseAUD(currentPrice);

  // Check if values changed
  const unitsChanged = parsedUnits !== holding.units;
  const costBasisChanged = parsedCostBasis !== holding.costBasis;
  const requiresReason = unitsChanged || costBasisChanged;

  const handleSubmit = async () => {
    // Validation
    if (!symbol.trim()) {
      toast.error('Symbol is required');
      return;
    }

    if (parsedUnits < 0) {
      toast.error('Units cannot be negative');
      return;
    }

    if (parsedCostBasis < 0) {
      toast.error('Cost basis cannot be negative');
      return;
    }

    if (requiresReason && !adjustmentReason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }

    setIsSubmitting(true);

    try {
      const updates: Partial<Holding> = {
        symbol: symbol.toUpperCase(),
        name: name || symbol.toUpperCase(),
        type,
        units: parsedUnits,
        costBasis: parsedCostBasis,
      };

      // Update current price if changed
      if (parsedCurrentPrice !== null && parsedCurrentPrice !== holding.currentPrice) {
        updates.currentPrice = parsedCurrentPrice;
        updates.currentValue = Math.round(parsedUnits * parsedCurrentPrice);
      } else if (holding.currentPrice) {
        // Recalculate current value if units changed
        updates.currentValue = Math.round(parsedUnits * holding.currentPrice);
      }

      await updateHolding(holding.id, updates);

      toast.success('Holding updated');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update holding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Holding</DialogTitle>
          <DialogDescription>
            Update the details for {holding.symbol}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Symbol and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., VAS, BTC"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(value: HoldingType) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOLDING_TYPES.map((holdingType) => (
                    <SelectItem key={holdingType.value} value={holdingType.value}>
                      <div className="flex items-center gap-2">
                        {holdingType.icon}
                        {holdingType.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Vanguard Australian Shares"
            />
          </div>

          <Separator />

          {/* Units and Cost Basis */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Units</Label>
              <Input
                type="number"
                step="any"
                value={units}
                onChange={(e) => {
                  setUnits(e.target.value);
                  setHasUnitsChanged(true);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Original: {holding.units.toLocaleString(undefined, { maximumFractionDigits: 8 })}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Cost Basis ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={costBasis}
                onChange={(e) => {
                  setCostBasis(e.target.value);
                  setHasCostBasisChanged(true);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Original: {formatAUD(holding.costBasis)}
              </p>
            </div>
          </div>

          {/* Warning if changing units or cost basis */}
          {requiresReason && (
            <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                Manually adjusting units or cost basis can affect your tax calculations.
                This should only be done to correct errors, not to record buy/sell transactions.
              </AlertDescription>
            </Alert>
          )}

          {/* Current Price (manual override) */}
          <div className="space-y-2">
            <Label>Current Price ($) (optional)</Label>
            <Input
              type="number"
              step="0.01"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="Leave blank to use API price"
            />
            {holding.currentPrice && (
              <p className="text-xs text-muted-foreground">
                Last fetched: {formatAUD(holding.currentPrice)}
              </p>
            )}
          </div>

          {/* Reason for adjustment */}
          {requiresReason && (
            <div className="space-y-2">
              <Label>Reason for Adjustment *</Label>
              <Textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="e.g., Correcting initial data entry error, Corporate action adjustment, etc."
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

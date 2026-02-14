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
import { useHoldingStore } from '@/stores/holding.store';
import { formatAUD } from '@/lib/utils/currency';
import type { Holding, InvestmentTransactionType, CompanyTaxRate } from '@/types';
import { toast } from 'sonner';
import { Loader2, TrendingUp, TrendingDown, Banknote, DollarSign, Percent } from 'lucide-react';

interface TransactionFormProps {
  holding: Holding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const TRANSACTION_TYPES: { value: InvestmentTransactionType; label: string; icon: React.ReactNode }[] = [
  { value: 'buy', label: 'Buy', icon: <TrendingUp className="h-4 w-4 text-success" /> },
  { value: 'sell', label: 'Sell', icon: <TrendingDown className="h-4 w-4 text-destructive" /> },
  { value: 'dividend', label: 'Dividend', icon: <DollarSign className="h-4 w-4 text-primary" /> },
  { value: 'distribution', label: 'Distribution', icon: <Banknote className="h-4 w-4 text-primary" /> },
  { value: 'fee', label: 'Fee', icon: <Percent className="h-4 w-4 text-muted-foreground" /> },
];

const COMPANY_TAX_RATES: { value: CompanyTaxRate; label: string }[] = [
  { value: 30, label: '30% (Standard rate)' },
  { value: 25, label: '25% (Base rate entity)' },
];

export function TransactionForm({ holding, open, onOpenChange, onSuccess }: TransactionFormProps) {
  const { addTransaction } = useHoldingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [transactionType, setTransactionType] = useState<InvestmentTransactionType>('buy');
  const [units, setUnits] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [fees, setFees] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Franking credit fields (for dividends/distributions)
  const [frankingPercentage, setFrankingPercentage] = useState('100');
  const [companyTaxRate, setCompanyTaxRate] = useState<CompanyTaxRate>(30);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setTransactionType('buy');
      setUnits('');
      setPricePerUnit(holding.currentPrice ? (holding.currentPrice / 100).toFixed(2) : '');
      setFees('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setFrankingPercentage('100');
      setCompanyTaxRate(30);
    }
  }, [open, holding.currentPrice]);

  // Calculate total amount
  const parsedUnits = parseFloat(units) || 0;
  const parsedPrice = parseFloat(pricePerUnit) || 0;
  const parsedFees = parseFloat(fees) || 0;
  const totalAmount = parsedUnits * parsedPrice + parsedFees;

  // Calculate franking credit preview for dividends
  const parsedFranking = parseFloat(frankingPercentage) || 0;
  const frankingCredit = transactionType === 'dividend' || transactionType === 'distribution'
    ? (totalAmount * (parsedFranking / 100) * (companyTaxRate / (100 - companyTaxRate)))
    : 0;

  const showFrankingFields = transactionType === 'dividend' || transactionType === 'distribution';
  const showUnitsField = transactionType === 'buy' || transactionType === 'sell';

  const handleSubmit = async () => {
    // Validation
    if (showUnitsField && parsedUnits <= 0) {
      toast.error('Please enter a valid number of units');
      return;
    }

    if (transactionType === 'sell' && parsedUnits > holding.units) {
      toast.error(`Cannot sell more than ${holding.units} units`);
      return;
    }

    if (parsedPrice <= 0 && transactionType !== 'fee') {
      toast.error('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);

    try {
      await addTransaction({
        holdingId: holding.id,
        type: transactionType,
        units: showUnitsField ? parsedUnits : 0,
        pricePerUnit: Math.round(parsedPrice * 100), // Convert to cents
        fees: Math.round(parsedFees * 100), // Convert to cents
        date: new Date(date),
        notes: notes || undefined,
        frankingPercentage: showFrankingFields ? parsedFranking : undefined,
        companyTaxRate: showFrankingFields ? companyTaxRate : undefined,
      });

      toast.success(`${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} recorded`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Transaction</DialogTitle>
          <DialogDescription>
            Record a transaction for {holding.symbol}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select
              value={transactionType}
              onValueChange={(value) => setTransactionType(value as InvestmentTransactionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      {type.icon}
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Units (for buy/sell) */}
          {showUnitsField && (
            <div className="space-y-2">
              <Label>Units</Label>
              <Input
                type="number"
                step="any"
                placeholder="0"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
              />
              {transactionType === 'sell' && (
                <p className="text-xs text-muted-foreground">
                  Available: {holding.units.toLocaleString(undefined, { maximumFractionDigits: 8 })} units
                </p>
              )}
            </div>
          )}

          {/* Price per unit (or amount for dividends) */}
          <div className="space-y-2">
            <Label>{showUnitsField ? 'Price per Unit ($)' : 'Amount ($)'}</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
            />
            {showUnitsField && holding.currentPrice && (
              <p className="text-xs text-muted-foreground">
                Current price: {formatAUD(holding.currentPrice)}
              </p>
            )}
          </div>

          {/* Fees */}
          {transactionType !== 'fee' && (
            <div className="space-y-2">
              <Label>Fees ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
              />
            </div>
          )}

          {/* Franking Credit Fields */}
          {showFrankingFields && (
            <>
              <Separator />
              <p className="text-sm font-medium">Franking Credits</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Franking %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="100"
                    value={frankingPercentage}
                    onChange={(e) => setFrankingPercentage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Tax Rate</Label>
                  <Select
                    value={companyTaxRate.toString()}
                    onValueChange={(value) => setCompanyTaxRate(parseInt(value) as CompanyTaxRate)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_TAX_RATES.map((rate) => (
                        <SelectItem key={rate.value} value={rate.value.toString()}>
                          {rate.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {frankingCredit > 0 && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="text-muted-foreground">Franking Credit:</p>
                  <p className="font-medium text-success">{formatAUD(Math.round(frankingCredit * 100))}</p>
                </div>
              )}
            </>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Total Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Amount</span>
              <span className="text-xl font-bold">
                {formatAUD(Math.round(totalAmount * 100))}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Record Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

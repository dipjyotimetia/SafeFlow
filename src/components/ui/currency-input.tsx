'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Currency symbol to display (default: $) */
  currencySymbol?: string;
  /** Position of the currency symbol (default: left) */
  symbolPosition?: 'left' | 'right';
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, currencySymbol = '$', symbolPosition = 'left', ...props }, ref) => {
    const isLeft = symbolPosition === 'left';

    return (
      <div className="relative">
        <span
          className={cn(
            'absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none',
            isLeft ? 'left-3' : 'right-3'
          )}
        >
          {currencySymbol}
        </span>
        <Input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          className={cn(isLeft ? 'pl-7' : 'pr-7', className)}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };

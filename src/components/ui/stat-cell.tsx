'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { splitAUD } from '@/lib/utils/currency';

export type Tone = 'positive' | 'negative' | 'warning' | 'neutral';

export interface StatCellProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: Tone;
  delay?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TONE_COLOR: Record<Tone, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  warning: 'text-warning',
  neutral: 'text-foreground',
};

const SIZE_VALUE: Record<NonNullable<StatCellProps['size']>, string> = {
  sm: 'text-[24px] sm:text-[28px]',
  md: 'text-[28px] sm:text-[32px]',
  lg: 'text-[30px] sm:text-[34px]',
};

const SIZE_CENTS: Record<NonNullable<StatCellProps['size']>, string> = {
  sm: 'text-[12px]',
  md: 'text-[14px]',
  lg: 'text-[15px]',
};

export function StatCell({
  label,
  value,
  sublabel,
  tone = 'neutral',
  delay = 0,
  size = 'md',
  className,
}: StatCellProps) {
  const split = React.useMemo(() => splitAUD(value), [value]);

  return (
    <div
      className={cn(
        'card-trace relative p-5 animate-enter-fast transition-colors hover:bg-muted/35',
        className,
      )}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      <span className="eyebrow">{label}</span>
      <p
        className={cn(
          'mt-3 metric-value animate-wipe-in tabular-nums',
          SIZE_VALUE[size],
          TONE_COLOR[tone],
        )}
      >
        <span>{split.whole}</span>
        {split.cents && (
          <span
            className={cn('mono-num text-[--text-subtle]', SIZE_CENTS[size])}
          >
            {split.cents}
          </span>
        )}
      </p>
      {sublabel && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[--text-subtle]">
          {sublabel}
        </p>
      )}
    </div>
  );
}

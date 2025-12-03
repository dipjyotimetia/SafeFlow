'use client';

import { getInstitutionIcon } from '@/lib/icons/institution-icons';
import { cn } from '@/lib/utils';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface InstitutionIconProps {
  /** Institution name or code (e.g., 'Commonwealth Bank' or 'cba') */
  institution: string;
  /** Icon size - xs: 12px, sm: 16px, md: 24px, lg: 32px, xl: 40px */
  size?: IconSize;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses: Record<IconSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
};

export function InstitutionIcon({
  institution,
  size = 'md',
  className,
}: InstitutionIconProps) {
  const Icon = getInstitutionIcon(institution);

  return <Icon className={cn(sizeClasses[size], 'rounded shrink-0', className)} />;
}

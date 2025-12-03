import type { ComponentType } from 'react';
import {
  CBAIcon,
  ANZIcon,
  WestpacIcon,
  NABIcon,
  UpIcon,
  INGIcon,
  MacquarieIcon,
  BendigoIcon,
  RaizIcon,
  CoinSpotIcon,
  SwyftxIcon,
  UniSuperIcon,
  AustralianSuperIcon,
  RESTIcon,
  HostplusIcon,
  DefaultBankIcon,
} from '@/components/icons/institutions';

export interface IconProps {
  className?: string;
}

// Map bank codes to icon components
export const institutionIcons: Record<string, ComponentType<IconProps>> = {
  // Banks
  cba: CBAIcon,
  anz: ANZIcon,
  westpac: WestpacIcon,
  nab: NABIcon,
  up: UpIcon,
  ing: INGIcon,
  macquarie: MacquarieIcon,
  bendigo: BendigoIcon,
  // Investment Platforms
  raiz: RaizIcon,
  // Crypto Exchanges
  coinspot: CoinSpotIcon,
  swyftx: SwyftxIcon,
  // Superannuation
  unisuper: UniSuperIcon,
  'australian-super': AustralianSuperIcon,
  rest: RESTIcon,
  hostplus: HostplusIcon,
};

// Map institution names to codes (case-insensitive)
const nameToCodeMap: Record<string, string> = {
  // Commonwealth Bank variations
  'commonwealth bank': 'cba',
  'commbank': 'cba',
  'cba': 'cba',
  'comm bank': 'cba',
  // ANZ variations
  'anz': 'anz',
  'anz bank': 'anz',
  'australia and new zealand banking group': 'anz',
  // Westpac variations
  'westpac': 'westpac',
  'westpac bank': 'westpac',
  'westpac banking corporation': 'westpac',
  // NAB variations
  'nab': 'nab',
  'national australia bank': 'nab',
  // Up Bank variations
  'up': 'up',
  'up bank': 'up',
  // ING variations
  'ing': 'ing',
  'ing australia': 'ing',
  'ing bank': 'ing',
  'ing direct': 'ing',
  // Macquarie variations
  'macquarie': 'macquarie',
  'macquarie bank': 'macquarie',
  'mqg': 'macquarie',
  // Bendigo variations
  'bendigo': 'bendigo',
  'bendigo bank': 'bendigo',
  'bendigo and adelaide bank': 'bendigo',
  // Raiz variations
  'raiz': 'raiz',
  'raiz invest': 'raiz',
  // CoinSpot variations
  'coinspot': 'coinspot',
  'coin spot': 'coinspot',
  // Swyftx variations
  'swyftx': 'swyftx',
  // UniSuper variations
  'unisuper': 'unisuper',
  'uni super': 'unisuper',
  // Australian Super variations
  'australian super': 'australian-super',
  'australiansuper': 'australian-super',
  'aus super': 'australian-super',
  // REST variations
  'rest': 'rest',
  'rest super': 'rest',
  'rest superannuation': 'rest',
  // Hostplus variations
  'hostplus': 'hostplus',
  'host plus': 'hostplus',
};

/**
 * Get the institution code from a display name
 * Returns null if the institution is not recognized
 */
export function getInstitutionCode(name: string): string | null {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();
  return nameToCodeMap[normalized] ?? null;
}

/**
 * Get the icon component for an institution
 * Accepts either a code (e.g., 'cba') or a display name (e.g., 'Commonwealth Bank')
 * Returns DefaultBankIcon if not found
 */
export function getInstitutionIcon(institution: string): ComponentType<IconProps> {
  if (!institution) return DefaultBankIcon;

  const normalized = institution.toLowerCase().trim();

  // First try direct code lookup
  if (institutionIcons[normalized]) {
    return institutionIcons[normalized];
  }

  // Then try name-to-code mapping
  const code = nameToCodeMap[normalized];
  if (code && institutionIcons[code]) {
    return institutionIcons[code];
  }

  return DefaultBankIcon;
}

/**
 * Check if an institution is recognized
 */
export function isKnownInstitution(institution: string): boolean {
  if (!institution) return false;
  const normalized = institution.toLowerCase().trim();
  return !!(institutionIcons[normalized] || nameToCodeMap[normalized]);
}

/**
 * Get all supported institution codes
 */
export function getSupportedInstitutions(): string[] {
  return Object.keys(institutionIcons);
}

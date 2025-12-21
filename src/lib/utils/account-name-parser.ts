/**
 * Account Name Parser Utility
 *
 * Extracts person names from bank account names and matches them against
 * existing family members for automatic assignment during import.
 */

import type { FamilyMember } from '@/types';

export interface NameParseResult {
  detectedName: string | null;
  confidence: number; // 0-1
  suggestedMemberId: string | null;
  suggestedMemberName: string | null;
  isNewMember: boolean;
}

// Common bank account type suffixes to strip
const ACCOUNT_TYPE_PATTERNS = [
  /\b(savings?|saver|transaction|everyday|complete|access|smart|netbank|streamline|cash|cheque|offset|loan|credit|card)\b/gi,
  /\b(account|acc|acct|a\/c)\b/gi,
  /\b(personal|joint|individual|business)\b/gi,
];

// Common bank identifiers to strip
const BANK_PATTERNS = [
  /\b(anz|cba|westpac|nab|ing|macquarie|up|bendigo|commbank|commonwealth)\b/gi,
];

// Patterns to detect name format
const NAME_PATTERNS = [
  // "LASTNAME, FIRSTNAME" format
  /^([A-Z][A-Za-z'-]+),\s*([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)/,
  // "FIRSTNAME LASTNAME" format (2-3 words starting with capitals)
  /^([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,2})/,
  // Name followed by separator
  /^([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)\s*[-–—]\s*/,
  // Name after separator
  /[-–—]\s*([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?)\s*$/,
];

/**
 * Normalize a name for comparison (lowercase, trimmed, no extra spaces)
 */
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Convert "LASTNAME, FIRSTNAME" to "Firstname Lastname"
 */
function formatReversedName(match: RegExpMatchArray): string {
  const [, lastName, firstName] = match;
  return `${capitalize(firstName)} ${capitalize(lastName)}`;
}

/**
 * Capitalize first letter of each word
 */
function capitalize(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses Levenshtein distance normalized by max length
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Check for substring match first
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9;
  }

  // Check if first names match
  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  if (words1[0] === words2[0]) {
    return 0.8;
  }

  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

/**
 * Extract a person's name from an account name string
 */
export function extractNameFromAccountName(accountName: string): {
  name: string | null;
  confidence: number;
} {
  if (!accountName || accountName.trim().length === 0) {
    return { name: null, confidence: 0 };
  }

  let cleaned = accountName.trim();

  // Strip bank identifiers
  for (const pattern of BANK_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Strip account type patterns
  for (const pattern of ACCOUNT_TYPE_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Clean up extra spaces and separators
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/^[-–—\s]+|[-–—\s]+$/g, '')
    .trim();

  if (cleaned.length === 0) {
    return { name: null, confidence: 0 };
  }

  // Try each name pattern
  for (const pattern of NAME_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      // Check if it's "LASTNAME, FIRSTNAME" format
      if (match[2]) {
        return {
          name: formatReversedName(match),
          confidence: 0.9,
        };
      }
      // Standard format
      const name = capitalize(match[1].trim());
      // Higher confidence for multi-word names
      const wordCount = name.split(' ').length;
      return {
        name,
        confidence: wordCount >= 2 ? 0.85 : 0.6,
      };
    }
  }

  // If nothing matched but we have text that looks like a name
  const words = cleaned.split(' ').filter((w) => w.length > 1);
  if (words.length >= 1 && words.length <= 3) {
    const potentialName = words.map(capitalize).join(' ');
    // Check if it looks like a name (starts with capital, reasonable length)
    if (/^[A-Z][a-z]+/.test(potentialName) && potentialName.length >= 3) {
      return {
        name: potentialName,
        confidence: words.length >= 2 ? 0.5 : 0.3,
      };
    }
  }

  return { name: null, confidence: 0 };
}

/**
 * Find the best matching family member for a detected name
 */
export function findMatchingMember(
  detectedName: string,
  members: FamilyMember[]
): { member: FamilyMember | null; similarity: number } {
  if (!detectedName || members.length === 0) {
    return { member: null, similarity: 0 };
  }

  let bestMatch: FamilyMember | null = null;
  let bestSimilarity = 0;

  for (const member of members) {
    if (!member.isActive) continue;

    const similarity = calculateSimilarity(detectedName, member.name);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = member;
    }
  }

  // Only return a match if similarity is above threshold
  if (bestSimilarity >= 0.6) {
    return { member: bestMatch, similarity: bestSimilarity };
  }

  return { member: null, similarity: 0 };
}

/**
 * Parse an account name and find or suggest a family member
 */
export function parseAccountNameForMember(
  accountName: string | undefined | null,
  existingMembers: FamilyMember[]
): NameParseResult {
  if (!accountName) {
    return {
      detectedName: null,
      confidence: 0,
      suggestedMemberId: null,
      suggestedMemberName: null,
      isNewMember: false,
    };
  }

  const { name: detectedName, confidence } = extractNameFromAccountName(accountName);

  if (!detectedName || confidence < 0.3) {
    return {
      detectedName: null,
      confidence: 0,
      suggestedMemberId: null,
      suggestedMemberName: null,
      isNewMember: false,
    };
  }

  // Try to find matching member
  const { member, similarity } = findMatchingMember(detectedName, existingMembers);

  if (member && similarity >= 0.6) {
    return {
      detectedName,
      confidence: confidence * similarity,
      suggestedMemberId: member.id,
      suggestedMemberName: member.name,
      isNewMember: false,
    };
  }

  // Suggest creating a new member
  return {
    detectedName,
    confidence,
    suggestedMemberId: null,
    suggestedMemberName: detectedName,
    isNewMember: true,
  };
}

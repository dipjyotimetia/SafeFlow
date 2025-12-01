// Merchant Name Normalizer
// Normalizes transaction descriptions to extract consistent merchant names

// Common suffixes to remove
const SUFFIXES_TO_REMOVE = [
  // Business types
  'pty ltd', 'pty. ltd.', 'pty. ltd', 'ptyltd',
  'ltd', 'limited',
  'inc', 'incorporated',
  'co', 'corp', 'corporation',
  'llc', 'llp',
  'trust',
  'holdings',
  'group',
  'services',
  'australia', 'aus', 'au',
  'nsw', 'vic', 'qld', 'wa', 'sa', 'tas', 'nt', 'act',

  // Location indicators
  'store', 'shop', 'outlet', 'branch',
  'cbd', 'city', 'town', 'village', 'centre', 'center', 'plaza',
  'mall', 'shopping',
  'north', 'south', 'east', 'west',
  'nth', 'sth', 'est', 'wst',
  'st', 'street', 'rd', 'road', 'ave', 'avenue', 'ln', 'lane', 'dr', 'drive',
];

// Common prefixes to remove
const PREFIXES_TO_REMOVE = [
  'sp ', 'sq ', // Square/PayPal markers
  'visa purchase ', 'visa ', 'mastercard ', 'eftpos ',
  'debit card purchase ',
  'card purchase ',
  'direct debit ',
  'direct credit ',
  'internet banking ',
  'mobile banking ',
  'pay anyone ',
  'osko ',
  'payid ',
  'bpay ',
];

// Patterns to remove (regex)
const PATTERNS_TO_REMOVE = [
  // Reference numbers and transaction IDs
  /\b[a-z0-9]{6,}\b/gi, // Long alphanumeric codes
  /\b\d{4,}\b/g, // Numbers with 4+ digits
  /\b[A-Z]{2}\d{4,}\b/gi, // Codes like AU1234
  /\b\d{2}\/\d{2}\/\d{2,4}\b/g, // Dates
  /\b\d{2}-\d{2}-\d{2,4}\b/g, // Dates with dashes

  // Terminal/Store IDs
  /\bterm[inal]*\s*[:\s]*\d+/gi,
  /\bstore\s*[:\s]*\d+/gi,
  /\bloc[ation]*\s*[:\s]*\d+/gi,
  /\bsite\s*[:\s]*\d+/gi,
  /\bpos\s*[:\s]*\d+/gi,
  /\btxn\s*[:\s]*\d+/gi,
  /\bref[erence]*\s*[:\s]*\d+/gi,

  // Card indicators
  /\bcard\s*\d+/gi,
  /\bxx+\d{4}/gi, // Masked card numbers like xxxx1234
  /\*{4,}\d{4}/gi, // Masked card numbers like ****1234

  // Time stamps
  /\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\b/gi,

  // Website indicators
  /\.com\.au\b/gi,
  /\.com\b/gi,
  /\.net\.au\b/gi,
  /\.net\b/gi,
  /\.org\.au\b/gi,
  /\.org\b/gi,
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,

  // Help/Contact indicators
  /\bhelp\.[^\s]+/gi,

  // Special markers
  /\*[a-z]+/gi, // Uber *TRIP type markers
  /\+\d+/g, // Phone numbers
];

// Special merchant name mappings (handle variations)
const MERCHANT_ALIASES: Record<string, string> = {
  'maccas': 'mcdonalds',
  'macca': 'mcdonalds',
  'hjs': 'hungry jacks',
  'ww': 'woolworths',
  'woolies': 'woolworths',
  'wwmetro': 'woolworths',
  'colesexp': 'coles express',
  'colesexpress': 'coles express',
  'bpfuel': 'bp',
  'shellfuel': 'shell',
  'caltexfuel': 'caltex',
  'ampolfuel': 'ampol',
  'opalcard': 'opal',
  'mykicard': 'myki',
  'ubereats': 'uber eats',
  'deliveroo': 'deliveroo',
  'dd': 'doordash',
  'jbhifi': 'jb hi-fi',
  'jb hifi': 'jb hi-fi',
  'harvey': 'harvey norman',
  'harveynorman': 'harvey norman',
  'officew': 'officeworks',
  'officewks': 'officeworks',
  'chemistw': 'chemist warehouse',
  'cwh': 'chemist warehouse',
  'terryw': 'terry white',
  'amcalpharma': 'amcal',
  'danmurphy': 'dan murphy',
  'danmurphys': 'dan murphys',
  'fc liquor': 'first choice',
  'firstchoice': 'first choice',
  'originenergy': 'origin energy',
  'energyaust': 'energy australia',
  'sydneywater': 'sydney water',
  'melbournewater': 'melbourne water',
  'aussiebroadband': 'aussie broadband',
  'abb': 'aussie broadband',
  'budgetdirect': 'budget direct',
  'nrmainsurance': 'nrma insurance',
  'aamiinsurance': 'aami',
  'suncorpins': 'suncorp insurance',
  'hcfhealth': 'hcf',
  'nibhealth': 'nib',
  'medibankprivate': 'medibank',
  'bupahealth': 'bupa',
  'qantasairways': 'qantas',
  'virginaust': 'virgin australia',
  'jetstarairways': 'jetstar',
  'flightc': 'flight centre',
  'flightcentre': 'flight centre',
  'bookingcom': 'booking.com',
  'amazonprime': 'amazon prime',
  'amazonau': 'amazon',
  'ebayau': 'ebay',
  'catchau': 'catch',
  'koganau': 'kogan',
  'netflixcom': 'netflix',
  'spotifyau': 'spotify',
  'disneyplus': 'disney plus',
  'applemusic': 'apple music',
  'appletv': 'apple tv',
  'youtubeprem': 'youtube premium',
  'kayosports': 'kayo',
  'stanentertainment': 'stan',
  'bingestreaming': 'binge',
  'paramountplus': 'paramount',
  'primevideo': 'prime video',
  'googleone': 'google one',
  'microsoft365': 'microsoft 365',
  'office365': 'office 365',
  'adobecc': 'adobe',
  'canvapro': 'canva',
  'dropboxplus': 'dropbox',
  'centrelinkpay': 'centrelink',
  'servicesaus': 'services australia',
  'taxrefund': 'tax refund',
  'atorefund': 'tax refund',
  'salarydeposit': 'salary',
  'wagedeposit': 'wages',
  'payslip': 'salary',
  'sportsbetcom': 'sportsbet',
  'bet365au': 'bet365',
  'pointsbetau': 'pointsbet',
  'nedsau': 'neds',
  'unibetau': 'unibet',
  'ladbrokesau': 'ladbrokes',
  'tabcorp': 'tab',
  'lottoland': 'lotto',
  'thelott': 'lotto',
  'ozlotteries': 'lotto',
  'crowncasino': 'crown',
  'starcasino': 'star casino',
};

/**
 * Normalize a transaction description to extract a consistent merchant name
 * @param description Raw transaction description
 * @returns Normalized merchant name (lowercase, cleaned)
 */
export function normalizeMerchantName(description: string): string {
  if (!description) return '';

  // Start with lowercase
  let normalized = description.toLowerCase().trim();

  // Remove prefixes
  for (const prefix of PREFIXES_TO_REMOVE) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length).trim();
    }
  }

  // Remove patterns (regex)
  for (const pattern of PATTERNS_TO_REMOVE) {
    normalized = normalized.replace(pattern, ' ');
  }

  // Remove suffixes
  for (const suffix of SUFFIXES_TO_REMOVE) {
    // Match suffix at end or followed by non-letter
    const suffixPattern = new RegExp(`\\b${suffix}\\b`, 'gi');
    normalized = normalized.replace(suffixPattern, ' ');
  }

  // Clean up whitespace and special characters
  normalized = normalized
    .replace(/[^\w\s-]/g, ' ') // Keep only alphanumeric, space, hyphen
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();

  // Remove any remaining single characters (except 'a' which might be valid)
  normalized = normalized
    .split(' ')
    .filter(word => word.length > 1 || word === 'a')
    .join(' ');

  // Check for known aliases
  const aliasKey = normalized.replace(/\s+/g, '');
  if (MERCHANT_ALIASES[aliasKey]) {
    return MERCHANT_ALIASES[aliasKey];
  }

  // Check if any alias pattern matches
  for (const [alias, canonical] of Object.entries(MERCHANT_ALIASES)) {
    if (normalized.includes(alias)) {
      return canonical;
    }
  }

  // Return first 2-3 meaningful words (merchant name)
  const words = normalized.split(' ').filter(w => w.length > 0);
  if (words.length > 3) {
    return words.slice(0, 3).join(' ');
  }

  return normalized;
}

/**
 * Extract multiple potential merchant names from a description
 * Useful for fuzzy matching
 */
export function extractMerchantVariations(description: string): string[] {
  const normalized = normalizeMerchantName(description);
  const variations = new Set<string>();

  // Add full normalized name
  variations.add(normalized);

  // Add individual words (for partial matching)
  const words = normalized.split(' ');
  for (const word of words) {
    if (word.length >= 3) {
      variations.add(word);
    }
  }

  // Add first two words combined
  if (words.length >= 2) {
    variations.add(`${words[0]} ${words[1]}`);
  }

  // Add without spaces (for alias matching)
  variations.add(normalized.replace(/\s+/g, ''));

  return Array.from(variations);
}

/**
 * Check if two merchant names are likely the same
 */
export function isSameMerchant(name1: string, name2: string): boolean {
  const n1 = normalizeMerchantName(name1);
  const n2 = normalizeMerchantName(name2);

  // Exact match
  if (n1 === n2) return true;

  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Without spaces
  const n1NoSpace = n1.replace(/\s+/g, '');
  const n2NoSpace = n2.replace(/\s+/g, '');
  if (n1NoSpace === n2NoSpace) return true;

  // First word match (common for chain stores)
  const n1FirstWord = n1.split(' ')[0];
  const n2FirstWord = n2.split(' ')[0];
  if (n1FirstWord.length >= 4 && n1FirstWord === n2FirstWord) return true;

  return false;
}

/**
 * Group transactions by normalized merchant name
 */
export function groupByMerchant<T extends { description: string }>(
  items: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const normalized = normalizeMerchantName(item.description);
    const existing = groups.get(normalized) || [];
    existing.push(item);
    groups.set(normalized, existing);
  }

  return groups;
}

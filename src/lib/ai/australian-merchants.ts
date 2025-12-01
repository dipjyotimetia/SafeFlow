// Australian Merchant Database
// Pre-built mapping of common Australian merchants to categories for instant categorization

export interface MerchantMapping {
  category: string;
  confidence: number;
}

// Map of normalized merchant names to category mappings
export const AUSTRALIAN_MERCHANTS: Record<string, MerchantMapping> = {
  // ============================================
  // SUPERMARKETS & GROCERIES
  // ============================================
  'woolworths': { category: 'Groceries', confidence: 0.95 },
  'woolies': { category: 'Groceries', confidence: 0.95 },
  'coles': { category: 'Groceries', confidence: 0.95 },
  'aldi': { category: 'Groceries', confidence: 0.95 },
  'iga': { category: 'Groceries', confidence: 0.90 },
  'harris farm': { category: 'Groceries', confidence: 0.90 },
  'costco': { category: 'Groceries', confidence: 0.85 },
  'foodworks': { category: 'Groceries', confidence: 0.90 },
  'drakes': { category: 'Groceries', confidence: 0.90 },
  'foodland': { category: 'Groceries', confidence: 0.90 },
  'spudshed': { category: 'Groceries', confidence: 0.90 },
  'ritchies': { category: 'Groceries', confidence: 0.90 },

  // ============================================
  // FUEL & PETROL STATIONS
  // ============================================
  'bp': { category: 'Fuel', confidence: 0.95 },
  'shell': { category: 'Fuel', confidence: 0.95 },
  'caltex': { category: 'Fuel', confidence: 0.95 },
  'ampol': { category: 'Fuel', confidence: 0.95 },
  '7-eleven': { category: 'Fuel', confidence: 0.80 }, // Could be convenience
  '7eleven': { category: 'Fuel', confidence: 0.80 },
  'seven eleven': { category: 'Fuel', confidence: 0.80 },
  'united petroleum': { category: 'Fuel', confidence: 0.95 },
  'puma': { category: 'Fuel', confidence: 0.95 },
  'liberty': { category: 'Fuel', confidence: 0.90 },
  'coles express': { category: 'Fuel', confidence: 0.90 },
  'woolworths metro petrol': { category: 'Fuel', confidence: 0.90 },

  // ============================================
  // TRANSPORT & RIDESHARE
  // ============================================
  'uber': { category: 'Transport', confidence: 0.90 },
  'uber trip': { category: 'Transport', confidence: 0.95 },
  'didi': { category: 'Transport', confidence: 0.90 },
  'ola': { category: 'Transport', confidence: 0.90 },
  'opal': { category: 'Transport', confidence: 0.95 },
  'opal top up': { category: 'Transport', confidence: 0.95 },
  'myki': { category: 'Transport', confidence: 0.95 },
  'go card': { category: 'Transport', confidence: 0.95 },
  'metrocard': { category: 'Transport', confidence: 0.95 },
  'translink': { category: 'Transport', confidence: 0.95 },
  'transperth': { category: 'Transport', confidence: 0.95 },
  'sydney trains': { category: 'Transport', confidence: 0.95 },
  'metro trains': { category: 'Transport', confidence: 0.95 },
  'nsw trains': { category: 'Transport', confidence: 0.95 },
  'lime': { category: 'Transport', confidence: 0.90 },
  'neuron': { category: 'Transport', confidence: 0.90 },
  'beam': { category: 'Transport', confidence: 0.90 },
  'carshare': { category: 'Transport', confidence: 0.90 },
  'goget': { category: 'Transport', confidence: 0.90 },
  'toll': { category: 'Transport', confidence: 0.90 },
  'linkt': { category: 'Transport', confidence: 0.90 },
  'etoll': { category: 'Transport', confidence: 0.90 },
  'citylink': { category: 'Transport', confidence: 0.90 },
  'eastlink': { category: 'Transport', confidence: 0.90 },
  'roam': { category: 'Transport', confidence: 0.90 },

  // ============================================
  // UTILITIES
  // ============================================
  'origin energy': { category: 'Utilities', confidence: 0.95 },
  'origin': { category: 'Utilities', confidence: 0.85 },
  'agl': { category: 'Utilities', confidence: 0.95 },
  'energy australia': { category: 'Utilities', confidence: 0.95 },
  'energyaustralia': { category: 'Utilities', confidence: 0.95 },
  'red energy': { category: 'Utilities', confidence: 0.95 },
  'simply energy': { category: 'Utilities', confidence: 0.95 },
  'alinta energy': { category: 'Utilities', confidence: 0.95 },
  'lumo energy': { category: 'Utilities', confidence: 0.95 },
  'powershop': { category: 'Utilities', confidence: 0.95 },
  'sydney water': { category: 'Utilities', confidence: 0.95 },
  'melbourne water': { category: 'Utilities', confidence: 0.95 },
  'sa water': { category: 'Utilities', confidence: 0.95 },
  'yarra valley water': { category: 'Utilities', confidence: 0.95 },
  'south east water': { category: 'Utilities', confidence: 0.95 },
  'telstra': { category: 'Utilities', confidence: 0.95 },
  'optus': { category: 'Utilities', confidence: 0.95 },
  'vodafone': { category: 'Utilities', confidence: 0.95 },
  'tpg': { category: 'Utilities', confidence: 0.95 },
  'iinet': { category: 'Utilities', confidence: 0.95 },
  'aussie broadband': { category: 'Utilities', confidence: 0.95 },
  'nbn': { category: 'Utilities', confidence: 0.95 },
  'foxtel': { category: 'Utilities', confidence: 0.90 },
  'boost mobile': { category: 'Utilities', confidence: 0.95 },
  'amaysim': { category: 'Utilities', confidence: 0.95 },
  'belong': { category: 'Utilities', confidence: 0.95 },
  'felix mobile': { category: 'Utilities', confidence: 0.95 },

  // ============================================
  // SUBSCRIPTIONS & STREAMING
  // ============================================
  'netflix': { category: 'Subscriptions', confidence: 0.95 },
  'spotify': { category: 'Subscriptions', confidence: 0.95 },
  'disney': { category: 'Subscriptions', confidence: 0.95 },
  'disney plus': { category: 'Subscriptions', confidence: 0.95 },
  'stan': { category: 'Subscriptions', confidence: 0.95 },
  'binge': { category: 'Subscriptions', confidence: 0.95 },
  'paramount': { category: 'Subscriptions', confidence: 0.95 },
  'amazon prime': { category: 'Subscriptions', confidence: 0.90 },
  'prime video': { category: 'Subscriptions', confidence: 0.95 },
  'apple music': { category: 'Subscriptions', confidence: 0.95 },
  'apple tv': { category: 'Subscriptions', confidence: 0.95 },
  'youtube premium': { category: 'Subscriptions', confidence: 0.95 },
  'youtube music': { category: 'Subscriptions', confidence: 0.95 },
  'kayo': { category: 'Subscriptions', confidence: 0.95 },
  'audible': { category: 'Subscriptions', confidence: 0.95 },
  'canva': { category: 'Subscriptions', confidence: 0.90 },
  'adobe': { category: 'Subscriptions', confidence: 0.90 },
  'microsoft 365': { category: 'Subscriptions', confidence: 0.90 },
  'office 365': { category: 'Subscriptions', confidence: 0.90 },
  'dropbox': { category: 'Subscriptions', confidence: 0.90 },
  'icloud': { category: 'Subscriptions', confidence: 0.90 },
  'google one': { category: 'Subscriptions', confidence: 0.90 },
  'chatgpt': { category: 'Subscriptions', confidence: 0.90 },
  'openai': { category: 'Subscriptions', confidence: 0.90 },

  // ============================================
  // INSURANCE
  // ============================================
  'nrma': { category: 'Insurance', confidence: 0.90 },
  'nrma insurance': { category: 'Insurance', confidence: 0.95 },
  'allianz': { category: 'Insurance', confidence: 0.90 },
  'aami': { category: 'Insurance', confidence: 0.90 },
  'suncorp': { category: 'Insurance', confidence: 0.85 },
  'suncorp insurance': { category: 'Insurance', confidence: 0.95 },
  'gio': { category: 'Insurance', confidence: 0.90 },
  'youi': { category: 'Insurance', confidence: 0.90 },
  'budget direct': { category: 'Insurance', confidence: 0.90 },
  'real insurance': { category: 'Insurance', confidence: 0.90 },
  'bingle': { category: 'Insurance', confidence: 0.90 },
  'medibank': { category: 'Insurance', confidence: 0.90 },
  'bupa': { category: 'Insurance', confidence: 0.90 },
  'hcf': { category: 'Insurance', confidence: 0.90 },
  'hbf': { category: 'Insurance', confidence: 0.90 },
  'nib': { category: 'Insurance', confidence: 0.90 },
  'ahm': { category: 'Insurance', confidence: 0.90 },
  'ract': { category: 'Insurance', confidence: 0.85 },
  'racv': { category: 'Insurance', confidence: 0.85 },
  'racq': { category: 'Insurance', confidence: 0.85 },
  'rac': { category: 'Insurance', confidence: 0.85 },

  // ============================================
  // FAST FOOD & DINING
  // ============================================
  'mcdonald': { category: 'Dining Out', confidence: 0.95 },
  'mcdonalds': { category: 'Dining Out', confidence: 0.95 },
  'kfc': { category: 'Dining Out', confidence: 0.95 },
  'hungry jack': { category: 'Dining Out', confidence: 0.95 },
  'hungry jacks': { category: 'Dining Out', confidence: 0.95 },
  'subway': { category: 'Dining Out', confidence: 0.95 },
  'domino': { category: 'Dining Out', confidence: 0.95 },
  'dominos': { category: 'Dining Out', confidence: 0.95 },
  'pizza hut': { category: 'Dining Out', confidence: 0.95 },
  'guzman': { category: 'Dining Out', confidence: 0.95 },
  'guzman y gomez': { category: 'Dining Out', confidence: 0.95 },
  'gyg': { category: 'Dining Out', confidence: 0.95 },
  'oporto': { category: 'Dining Out', confidence: 0.95 },
  'nandos': { category: 'Dining Out', confidence: 0.95 },
  'nando': { category: 'Dining Out', confidence: 0.95 },
  'grill': { category: 'Dining Out', confidence: 0.80 },
  'grillld': { category: 'Dining Out', confidence: 0.95 },
  'betty': { category: 'Dining Out', confidence: 0.80 },
  'bettys burgers': { category: 'Dining Out', confidence: 0.95 },
  'boost juice': { category: 'Dining Out', confidence: 0.90 },
  'chatime': { category: 'Dining Out', confidence: 0.90 },
  'gong cha': { category: 'Dining Out', confidence: 0.90 },
  'starbucks': { category: 'Dining Out', confidence: 0.90 },
  'gloria jeans': { category: 'Dining Out', confidence: 0.90 },
  'muffin break': { category: 'Dining Out', confidence: 0.90 },
  'donut king': { category: 'Dining Out', confidence: 0.90 },
  'sushi': { category: 'Dining Out', confidence: 0.85 },
  'cafe': { category: 'Dining Out', confidence: 0.80 },
  'restaurant': { category: 'Dining Out', confidence: 0.90 },
  'bistro': { category: 'Dining Out', confidence: 0.90 },
  'pub': { category: 'Dining Out', confidence: 0.80 },
  'bar': { category: 'Dining Out', confidence: 0.75 },
  'tavern': { category: 'Dining Out', confidence: 0.85 },

  // Food Delivery
  'menulog': { category: 'Dining Out', confidence: 0.90 },
  'uber eats': { category: 'Dining Out', confidence: 0.95 },
  'ubereats': { category: 'Dining Out', confidence: 0.95 },
  'doordash': { category: 'Dining Out', confidence: 0.90 },
  'deliveroo': { category: 'Dining Out', confidence: 0.90 },

  // ============================================
  // SHOPPING & RETAIL
  // ============================================
  'kmart': { category: 'Shopping', confidence: 0.90 },
  'target': { category: 'Shopping', confidence: 0.90 },
  'big w': { category: 'Shopping', confidence: 0.90 },
  'bigw': { category: 'Shopping', confidence: 0.90 },
  'jb hi-fi': { category: 'Shopping', confidence: 0.90 },
  'jb hifi': { category: 'Shopping', confidence: 0.90 },
  'harvey norman': { category: 'Shopping', confidence: 0.90 },
  'the good guys': { category: 'Shopping', confidence: 0.90 },
  'bunnings': { category: 'Shopping', confidence: 0.90 },
  'officeworks': { category: 'Shopping', confidence: 0.90 },
  'ikea': { category: 'Shopping', confidence: 0.90 },
  'fantastic furniture': { category: 'Shopping', confidence: 0.90 },
  'amart': { category: 'Shopping', confidence: 0.90 },
  'freedom': { category: 'Shopping', confidence: 0.85 },
  'myer': { category: 'Shopping', confidence: 0.90 },
  'david jones': { category: 'Shopping', confidence: 0.90 },
  'uniqlo': { category: 'Shopping', confidence: 0.90 },
  'h&m': { category: 'Shopping', confidence: 0.90 },
  'zara': { category: 'Shopping', confidence: 0.90 },
  'cotton on': { category: 'Shopping', confidence: 0.90 },
  'rebel': { category: 'Shopping', confidence: 0.85 },
  'rebel sport': { category: 'Shopping', confidence: 0.90 },
  'anaconda': { category: 'Shopping', confidence: 0.90 },
  'bcf': { category: 'Shopping', confidence: 0.90 },
  'supercheap auto': { category: 'Shopping', confidence: 0.90 },
  'autobarn': { category: 'Shopping', confidence: 0.90 },
  'repco': { category: 'Shopping', confidence: 0.90 },
  'apple store': { category: 'Shopping', confidence: 0.90 },
  'apple': { category: 'Shopping', confidence: 0.80 },
  'amazon': { category: 'Shopping', confidence: 0.85 },
  'ebay': { category: 'Shopping', confidence: 0.85 },
  'catch': { category: 'Shopping', confidence: 0.85 },
  'kogan': { category: 'Shopping', confidence: 0.85 },
  'marketplace': { category: 'Shopping', confidence: 0.80 },
  'dan murphy': { category: 'Shopping', confidence: 0.90 },
  'dan murphys': { category: 'Shopping', confidence: 0.90 },
  'bws': { category: 'Shopping', confidence: 0.90 },
  'liquorland': { category: 'Shopping', confidence: 0.90 },
  'first choice': { category: 'Shopping', confidence: 0.85 },
  'vintage cellar': { category: 'Shopping', confidence: 0.90 },

  // ============================================
  // HEALTHCARE & PHARMACY
  // ============================================
  'chemist warehouse': { category: 'Healthcare', confidence: 0.90 },
  'priceline pharmacy': { category: 'Healthcare', confidence: 0.90 },
  'priceline': { category: 'Healthcare', confidence: 0.85 },
  'terry white': { category: 'Healthcare', confidence: 0.90 },
  'terry white chemmart': { category: 'Healthcare', confidence: 0.90 },
  'amcal': { category: 'Healthcare', confidence: 0.90 },
  'blooms': { category: 'Healthcare', confidence: 0.85 },
  'pharmacy': { category: 'Healthcare', confidence: 0.85 },
  'medicare': { category: 'Healthcare', confidence: 0.95 },
  'specsavers': { category: 'Healthcare', confidence: 0.90 },
  'opsm': { category: 'Healthcare', confidence: 0.90 },
  'laubman': { category: 'Healthcare', confidence: 0.90 },
  'dentist': { category: 'Healthcare', confidence: 0.90 },
  'dental': { category: 'Healthcare', confidence: 0.90 },
  'doctor': { category: 'Healthcare', confidence: 0.90 },
  'medical': { category: 'Healthcare', confidence: 0.85 },
  'hospital': { category: 'Healthcare', confidence: 0.90 },
  'pathology': { category: 'Healthcare', confidence: 0.90 },
  'laverty': { category: 'Healthcare', confidence: 0.90 },
  'sonic': { category: 'Healthcare', confidence: 0.80 },
  'qml': { category: 'Healthcare', confidence: 0.90 },
  'sullivan nicolaides': { category: 'Healthcare', confidence: 0.90 },

  // ============================================
  // INCOME PATTERNS
  // ============================================
  'salary': { category: 'Salary', confidence: 0.95 },
  'wages': { category: 'Salary', confidence: 0.95 },
  'wage': { category: 'Salary', confidence: 0.95 },
  'payroll': { category: 'Salary', confidence: 0.95 },
  'pay': { category: 'Salary', confidence: 0.70 },
  'centrelink': { category: 'Government Payments', confidence: 0.95 },
  'services australia': { category: 'Government Payments', confidence: 0.95 },
  'ato': { category: 'Government Payments', confidence: 0.90 },
  'tax refund': { category: 'Government Payments', confidence: 0.95 },
  'interest': { category: 'Interest Income', confidence: 0.85 },
  'dividend': { category: 'Dividends', confidence: 0.95 },
  'distribution': { category: 'Dividends', confidence: 0.90 },

  // ============================================
  // TRANSFERS
  // ============================================
  'transfer': { category: 'Transfer', confidence: 0.90 },
  'bpay': { category: 'Transfer', confidence: 0.80 },
  'pay anyone': { category: 'Transfer', confidence: 0.85 },
  'osko': { category: 'Transfer', confidence: 0.85 },
  'payid': { category: 'Transfer', confidence: 0.85 },
  'direct debit': { category: 'Transfer', confidence: 0.80 },
  'direct credit': { category: 'Transfer', confidence: 0.80 },

  // ============================================
  // FEES & CHARGES
  // ============================================
  'atm fee': { category: 'Fees & Charges', confidence: 0.95 },
  'atm withdrawal': { category: 'Cash Withdrawal', confidence: 0.95 },
  'cash withdrawal': { category: 'Cash Withdrawal', confidence: 0.95 },
  'account fee': { category: 'Fees & Charges', confidence: 0.95 },
  'monthly fee': { category: 'Fees & Charges', confidence: 0.95 },
  'service fee': { category: 'Fees & Charges', confidence: 0.90 },
  'overdrawn fee': { category: 'Fees & Charges', confidence: 0.95 },
  'overdraft fee': { category: 'Fees & Charges', confidence: 0.95 },
  'dishonour fee': { category: 'Fees & Charges', confidence: 0.95 },
  'late fee': { category: 'Fees & Charges', confidence: 0.95 },
  'annual fee': { category: 'Fees & Charges', confidence: 0.95 },
  'foreign exchange fee': { category: 'Fees & Charges', confidence: 0.95 },
  'international fee': { category: 'Fees & Charges', confidence: 0.95 },

  // ============================================
  // ENTERTAINMENT & LEISURE
  // ============================================
  'hoyts': { category: 'Entertainment', confidence: 0.95 },
  'event cinemas': { category: 'Entertainment', confidence: 0.95 },
  'palace cinemas': { category: 'Entertainment', confidence: 0.95 },
  'village cinemas': { category: 'Entertainment', confidence: 0.95 },
  'dendy': { category: 'Entertainment', confidence: 0.95 },
  'cinema': { category: 'Entertainment', confidence: 0.90 },
  'ticketek': { category: 'Entertainment', confidence: 0.90 },
  'ticketmaster': { category: 'Entertainment', confidence: 0.90 },
  'moshtix': { category: 'Entertainment', confidence: 0.90 },
  'eventbrite': { category: 'Entertainment', confidence: 0.90 },
  'bowling': { category: 'Entertainment', confidence: 0.90 },
  'golf': { category: 'Entertainment', confidence: 0.85 },
  'gym': { category: 'Entertainment', confidence: 0.85 },
  'fitness first': { category: 'Entertainment', confidence: 0.90 },
  'anytime fitness': { category: 'Entertainment', confidence: 0.90 },
  'f45': { category: 'Entertainment', confidence: 0.90 },
  'crossfit': { category: 'Entertainment', confidence: 0.90 },
  'aquatic': { category: 'Entertainment', confidence: 0.85 },
  'zoo': { category: 'Entertainment', confidence: 0.90 },
  'museum': { category: 'Entertainment', confidence: 0.90 },
  'gallery': { category: 'Entertainment', confidence: 0.85 },

  // ============================================
  // TRAVEL
  // ============================================
  'qantas': { category: 'Travel', confidence: 0.95 },
  'virgin australia': { category: 'Travel', confidence: 0.95 },
  'jetstar': { category: 'Travel', confidence: 0.95 },
  'rex airlines': { category: 'Travel', confidence: 0.95 },
  'bonza': { category: 'Travel', confidence: 0.95 },
  'flight centre': { category: 'Travel', confidence: 0.95 },
  'webjet': { category: 'Travel', confidence: 0.95 },
  'expedia': { category: 'Travel', confidence: 0.95 },
  'booking.com': { category: 'Travel', confidence: 0.95 },
  'booking': { category: 'Travel', confidence: 0.90 },
  'airbnb': { category: 'Travel', confidence: 0.95 },
  'hotel': { category: 'Travel', confidence: 0.80 },
  'hilton': { category: 'Travel', confidence: 0.95 },
  'marriott': { category: 'Travel', confidence: 0.95 },
  'accor': { category: 'Travel', confidence: 0.95 },
  'ibis': { category: 'Travel', confidence: 0.95 },
  'novotel': { category: 'Travel', confidence: 0.95 },
  'quest': { category: 'Travel', confidence: 0.90 },
  'meriton': { category: 'Travel', confidence: 0.90 },

  // ============================================
  // PERSONAL CARE
  // ============================================
  'hairdresser': { category: 'Personal Care', confidence: 0.90 },
  'hair salon': { category: 'Personal Care', confidence: 0.90 },
  'barber': { category: 'Personal Care', confidence: 0.90 },
  'beauty': { category: 'Personal Care', confidence: 0.85 },
  'nail': { category: 'Personal Care', confidence: 0.85 },
  'spa': { category: 'Personal Care', confidence: 0.85 },
  'massage': { category: 'Personal Care', confidence: 0.85 },
  'wax': { category: 'Personal Care', confidence: 0.80 },
  'laser clinic': { category: 'Personal Care', confidence: 0.90 },
  'mecca': { category: 'Personal Care', confidence: 0.90 },
  'sephora': { category: 'Personal Care', confidence: 0.90 },

  // ============================================
  // EDUCATION
  // ============================================
  'tafe': { category: 'Education', confidence: 0.95 },
  'university': { category: 'Education', confidence: 0.95 },
  'uni': { category: 'Education', confidence: 0.85 },
  'school': { category: 'Education', confidence: 0.85 },
  'college': { category: 'Education', confidence: 0.85 },
  'hecs': { category: 'Education', confidence: 0.95 },
  'help': { category: 'Education', confidence: 0.75 },
  'childcare': { category: 'Education', confidence: 0.90 },
  'kindy': { category: 'Education', confidence: 0.90 },
  'kindergarten': { category: 'Education', confidence: 0.90 },

  // ============================================
  // RENT & MORTGAGE
  // ============================================
  'rent': { category: 'Rent', confidence: 0.90 },
  'rental': { category: 'Rent', confidence: 0.85 },
  'bond': { category: 'Rent', confidence: 0.80 },
  'mortgage': { category: 'Mortgage', confidence: 0.95 },
  'home loan': { category: 'Mortgage', confidence: 0.95 },
  'loan repayment': { category: 'Mortgage', confidence: 0.90 },
  'strata': { category: 'Housing', confidence: 0.90 },
  'body corporate': { category: 'Housing', confidence: 0.90 },
  'council rates': { category: 'Housing', confidence: 0.95 },
  'rates': { category: 'Housing', confidence: 0.80 },

  // ============================================
  // PETS
  // ============================================
  'petbarn': { category: 'Pets', confidence: 0.95 },
  'pet stock': { category: 'Pets', confidence: 0.95 },
  'petstock': { category: 'Pets', confidence: 0.95 },
  'pet circle': { category: 'Pets', confidence: 0.95 },
  'vet': { category: 'Pets', confidence: 0.90 },
  'veterinary': { category: 'Pets', confidence: 0.95 },
  'greencross': { category: 'Pets', confidence: 0.95 },

  // ============================================
  // GAMBLING (Flag for tracking)
  // ============================================
  'tab': { category: 'Gambling', confidence: 0.85 },
  'sportsbet': { category: 'Gambling', confidence: 0.95 },
  'bet365': { category: 'Gambling', confidence: 0.95 },
  'ladbrokes': { category: 'Gambling', confidence: 0.95 },
  'betfair': { category: 'Gambling', confidence: 0.95 },
  'pointsbet': { category: 'Gambling', confidence: 0.95 },
  'neds': { category: 'Gambling', confidence: 0.95 },
  'unibet': { category: 'Gambling', confidence: 0.95 },
  'lotto': { category: 'Gambling', confidence: 0.90 },
  'lottery': { category: 'Gambling', confidence: 0.90 },
  'pokies': { category: 'Gambling', confidence: 0.95 },
  'casino': { category: 'Gambling', confidence: 0.95 },
  'crown': { category: 'Gambling', confidence: 0.80 },
  'star casino': { category: 'Gambling', confidence: 0.95 },
};

// Get all unique category names from the merchant database
export function getAllCategories(): string[] {
  const categories = new Set<string>();
  for (const mapping of Object.values(AUSTRALIAN_MERCHANTS)) {
    categories.add(mapping.category);
  }
  return Array.from(categories).sort();
}

// Find matching merchant by normalized name
export function findMerchantMapping(normalizedName: string): MerchantMapping | null {
  // Direct match
  if (AUSTRALIAN_MERCHANTS[normalizedName]) {
    return AUSTRALIAN_MERCHANTS[normalizedName];
  }

  // Partial match - check if any key is contained in the normalized name
  for (const [key, mapping] of Object.entries(AUSTRALIAN_MERCHANTS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return { ...mapping, confidence: mapping.confidence * 0.9 }; // Slightly lower confidence for partial match
    }
  }

  return null;
}

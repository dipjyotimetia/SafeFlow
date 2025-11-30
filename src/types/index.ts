// SafeFlow AU - TypeScript Types

// Account types
export type AccountType = 'bank' | 'credit' | 'investment' | 'crypto' | 'cash' | 'asset' | 'liability';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  balance: number; // cents
  currency: 'AUD';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

// Category types
export type CategoryType = 'income' | 'expense' | 'transfer';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  parentId?: string;
  atoCode?: string; // D1-D10 for tax deductions
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction types
export type TransactionType = 'income' | 'expense' | 'transfer';
export type ImportSource = 'manual' | 'pdf' | 'anz-pdf' | 'cba-pdf' | 'raiz-pdf' | 'coinspot-pdf' | 'swyftx-pdf';

export interface Transaction {
  id: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number; // cents (positive)
  description: string;
  merchantName?: string;
  date: Date;

  // Transfer-specific
  transferToAccountId?: string;

  // Import metadata
  importSource?: ImportSource;
  importBatchId?: string;
  importedAt?: Date;
  originalDescription?: string;

  // Tax (Phase 3)
  isDeductible?: boolean;
  gstAmount?: number; // cents
  atoCategory?: string;

  // Metadata
  notes?: string;
  tags?: string[];
  isReconciled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Investment types (Phase 2)
export type HoldingType = 'etf' | 'stock' | 'crypto' | 'managed-fund';

export interface Holding {
  id: string;
  accountId: string;
  symbol: string;
  name: string;
  type: HoldingType;
  units: number;
  costBasis: number; // cents
  currentPrice?: number; // cents per unit
  currentValue?: number; // cents
  lastPriceUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type InvestmentTransactionType = 'buy' | 'sell' | 'dividend' | 'distribution' | 'fee';

export interface InvestmentTransaction {
  id: string;
  holdingId: string;
  type: InvestmentTransactionType;
  units: number;
  pricePerUnit: number; // cents
  totalAmount: number; // cents
  fees?: number;
  date: Date;
  notes?: string;

  // Tax (Phase 3)
  capitalGain?: number;
  holdingPeriod?: number; // days

  createdAt: Date;
  updatedAt: Date;
}

// Tax types (Phase 3)
export interface TaxItem {
  id: string;
  transactionId?: string;
  investmentTransactionId?: string;
  financialYear: string; // "2024-25"
  atoCategory: string;
  amount: number; // cents
  description: string;
  isDeduction: boolean;
  gstClaimed?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Sync types
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'conflict' | 'offline';

export interface SyncMetadata {
  id: string;
  lastSyncAt?: Date;
  lastSyncVersion: number;
  driveFileId?: string;
  conflictState?: 'none' | 'pending' | 'resolved';
  encryptionKeyHash?: string;
}

// Import types
export type ImportStatus = 'pending' | 'completed' | 'partial' | 'failed';

export interface ImportBatch {
  id: string;
  source: string;
  fileName: string;
  transactionCount: number;
  importedAt: Date;
  status: ImportStatus;
  errors?: string[];
}

// Parser types
export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number; // cents (positive)
  type: 'income' | 'expense';
  balance?: number;
  reference?: string;
  merchantName?: string;
  category?: string;
  rawText?: string;
}

export interface ParserResult {
  success: boolean;
  transactions: ParsedTransaction[];
  accountInfo?: {
    name?: string;
    bsb?: string;
    accountNumber?: string;
    statementPeriod?: { start: Date; end: Date };
  };
  warnings?: string[];
  errors?: string[];
}

// Price types
export interface PriceData {
  symbol: string;
  price: number; // cents
  change24h?: number;
  lastUpdated: Date;
}

// Superannuation types
export type SuperProvider = 'unisuper' | 'australian-super' | 'other';

export type SuperContributionType =
  | 'employer-sg'              // Super Guarantee (11.5% mandatory)
  | 'employer-additional'      // Employer voluntary contributions
  | 'salary-sacrifice'         // Pre-tax employee contributions
  | 'personal-concessional'    // Personal deductible contributions
  | 'personal-non-concessional' // After-tax contributions
  | 'government-co-contribution'
  | 'spouse-contribution';

export type SuperTransactionType =
  | SuperContributionType
  | 'earnings'                 // Investment returns
  | 'fees'                     // Admin and investment fees
  | 'insurance'                // Insurance premiums
  | 'withdrawal'               // Lump sum or pension
  | 'rollover-in'              // Transfer from another fund
  | 'rollover-out';            // Transfer to another fund

export interface SuperannuationAccount {
  id: string;
  provider: SuperProvider;
  providerName: string;        // "UniSuper", "Australian Super"
  memberNumber: string;
  accountName?: string;        // "Accumulation Account", "Pension Account"
  investmentOption?: string;   // "Balanced", "High Growth", etc.
  employerName?: string;

  // Balances (cents)
  totalBalance: number;
  preservedBalance: number;
  restrictedNonPreserved: number;
  unrestrictedNonPreserved: number;

  // Insurance
  hasLifeInsurance: boolean;
  hasTpdInsurance: boolean;
  hasIncomeProtection: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface SuperTransaction {
  id: string;
  superAccountId: string;
  type: SuperTransactionType;
  amount: number;              // cents (positive for contributions, negative for fees)
  date: Date;
  description?: string;
  financialYear: string;       // "2024-25"

  // Contribution-specific
  employerName?: string;       // For employer contributions
  isConcessional?: boolean;    // Tax-deductible contribution

  importSource?: ImportSource;
  importBatchId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Contribution summary for tax and reporting
export interface ContributionSummary {
  financialYear: string;
  employerSG: number;
  employerAdditional: number;
  salarySacrifice: number;
  personalConcessional: number;
  personalNonConcessional: number;
  governmentCoContribution: number;
  spouseContribution: number;
  totalConcessional: number;
  totalNonConcessional: number;
  concessionalCap: number;      // $30,000 for 2024-25
  nonConcessionalCap: number;   // $120,000 for 2024-25
  concessionalRemaining: number;
  nonConcessionalRemaining: number;
}

// UI types
export interface DateRange {
  from: Date;
  to: Date;
}

export interface FilterOptions {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  dateRange?: DateRange;
  searchQuery?: string;
  isDeductible?: boolean;
}

// SafeFlow AU - TypeScript Types

// ============ Sync Versioning ============

/**
 * Interface for entities that support incremental sync.
 * All syncable entities should extend this interface.
 */
export interface Versionable {
  /** Timestamp of last modification */
  updatedAt: Date;
  /** Sync version number - incremented on each change */
  syncVersion?: number;
  /** Soft delete flag for sync */
  isDeleted?: boolean;
}

/**
 * Sync backend configuration types
 */
export type SyncBackendType = "google-drive" | "webdav" | "s3" | "local-file";

export interface SyncBackendConfig {
  type: SyncBackendType;
  displayName: string;
  isConfigured: boolean;
  lastSyncAt?: Date;
}

// ============ Account types ============
export type AccountType =
  | "bank"
  | "credit"
  | "investment"
  | "crypto"
  | "cash"
  | "asset"
  | "liability";

export interface Account extends Versionable {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  balance: number; // cents
  currency: "AUD";
  isActive: boolean;
  memberId?: string; // Optional - for family member ownership
  visibility?: "private" | "shared"; // Account visibility in family
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// Category types
export type CategoryType = "income" | "expense" | "transfer";

export interface Category extends Versionable {
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
}

// Transaction types
export type TransactionType = "income" | "expense" | "transfer";
export type ImportSource =
  | "manual"
  | "pdf"
  // Big 4 Banks
  | "anz-pdf"
  | "cba-pdf"
  | "westpac-pdf"
  | "nab-pdf"
  // Digital Banks
  | "ing-pdf"
  | "macquarie-pdf"
  | "up-pdf"
  | "bendigo-pdf"
  // Investment/Crypto
  | "raiz-pdf"
  | "coinspot-pdf"
  | "swyftx-pdf";

export interface Transaction extends Versionable {
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

  // Family member tracking
  memberId?: string; // Who made this transaction

  // Metadata
  notes?: string;
  tags?: string[];
  isReconciled: boolean;
  createdAt: Date;
}

// Investment types (Phase 2)
export type HoldingType = "etf" | "stock" | "crypto" | "managed-fund";

export interface Holding extends Versionable {
  id: string;
  accountId: string;
  symbol: string;
  name: string;
  type: HoldingType;
  units: number;
  costBasis: number; // cents
  currentPrice?: number; // cents per unit
  currentValue?: number; // cents
  change24hPercent?: number; // 24h price change percentage
  lastPriceUpdate?: Date;
  createdAt: Date;
}

// Price history for charts and analytics
export type PriceHistorySource = 'api' | 'manual';

export interface PriceHistoryEntry {
  id: string;
  holdingId: string;
  date: Date; // Date only (no time component)
  price: number; // cents per unit
  source: PriceHistorySource;
  createdAt: Date;
}

export type InvestmentTransactionType =
  | "buy"
  | "sell"
  | "dividend"
  | "distribution"
  | "fee";

export interface InvestmentTransaction extends Versionable {
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

  // Franking credits (for dividends/distributions)
  frankingPercentage?: number; // 0-100 (100 = fully franked)
  companyTaxRate?: CompanyTaxRate; // 30 or 25
  frankingCreditAmount?: number; // cents - calculated franking credit
  grossedUpAmount?: number; // cents - cash dividend + franking credit

  createdAt: Date;
}

// Company tax rate for franking credit calculations
export type CompanyTaxRate = 30 | 25;

// Tax types (Phase 3)
export interface TaxItem extends Versionable {
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
}

// Sync types
export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "error"
  | "conflict"
  | "offline";

export interface SyncMetadata {
  id: string;
  lastSyncAt?: Date;
  lastSyncVersion: number;
  driveFileId?: string;
  conflictState?: "none" | "pending" | "resolved";
  encryptionKeyHash?: string;
}

// Import types
export type ImportStatus = "pending" | "completed" | "partial" | "failed";

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
  type: "income" | "expense";
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
export type SuperProvider = "unisuper" | "australian-super" | "other";

export type SuperContributionType =
  | "employer-sg" // Super Guarantee (11.5% mandatory)
  | "employer-additional" // Employer voluntary contributions
  | "salary-sacrifice" // Pre-tax employee contributions
  | "personal-concessional" // Personal deductible contributions
  | "personal-non-concessional" // After-tax contributions
  | "government-co-contribution"
  | "spouse-contribution";

export type SuperTransactionType =
  | SuperContributionType
  | "earnings" // Investment returns
  | "fees" // Admin and investment fees
  | "insurance" // Insurance premiums
  | "withdrawal" // Lump sum or pension
  | "rollover-in" // Transfer from another fund
  | "rollover-out"; // Transfer to another fund

export interface SuperannuationAccount extends Versionable {
  id: string;
  provider: SuperProvider;
  providerName: string; // "UniSuper", "Australian Super"
  memberNumber: string;
  accountName?: string; // "Accumulation Account", "Pension Account"
  investmentOption?: string; // "Balanced", "High Growth", etc.
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
}

export interface SuperTransaction extends Versionable {
  id: string;
  superAccountId: string;
  type: SuperTransactionType;
  amount: number; // cents (positive for contributions, negative for fees)
  date: Date;
  description?: string;
  financialYear: string; // "2024-25"

  // Contribution-specific
  employerName?: string; // For employer contributions
  isConcessional?: boolean; // Tax-deductible contribution

  importSource?: ImportSource;
  importBatchId?: string;
  createdAt: Date;
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
  concessionalCap: number; // $30,000 for 2024-25
  nonConcessionalCap: number; // $120,000 for 2024-25
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
  memberId?: string; // Filter by family member
}

// AI types
export type AIConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type ChatMessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
}

export interface ChatConversation extends Versionable {
  id: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: Date;
}

export type CategorizationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface CategorizationQueueItem {
  id: string;
  transactionId: string;
  status: CategorizationStatus;
  suggestedCategoryId?: string;
  confidence?: number;
  reasoning?: string;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface AISettings {
  ollamaHost: string;
  model: string;
  autoCategorize: boolean;
}

export interface CategorizationResult {
  categoryId: string;
  confidence: number;
  reasoning: string;
}

export interface FinancialContext {
  accountsSummary: string;
  recentSpending: string;
  topCategories: string;
  portfolioSummary?: string;
  taxSummary?: string;
  recentTransactions?: string;
  merchantPatterns?: string;
}

// Merchant Pattern Learning types
export interface MerchantPattern {
  id: string;
  normalizedName: string; // Normalized merchant name (e.g., "woolworths")
  originalExamples: string[]; // Original descriptions that matched
  categoryId: string;
  categoryName: string; // Denormalized for display
  confidence: number; // 0.0-1.0, increases with usage
  usageCount: number;
  userConfirmed: boolean; // True if user manually confirmed this mapping
  lastUsed: Date;
  createdAt: Date;
}

// Budget types - Simple category spending tracking
export type BudgetPeriod = "monthly" | "yearly";

export interface Budget extends Versionable {
  id: string;
  name: string;
  categoryId?: string; // Optional - track specific category or all spending
  amount: number; // Budget limit in cents
  period: BudgetPeriod;
  memberId?: string; // Optional - for family member specific budgets
  isActive: boolean;
  createdAt: Date;
}

export interface BudgetProgress {
  budget: Budget;
  spent: number; // Amount spent in cents
  remaining: number; // Amount remaining in cents
  percentUsed: number; // 0-100+
  isOverBudget: boolean;
  periodStart: Date;
  periodEnd: Date;
}

// Family/Household types
export type AccountVisibility = "private" | "shared";

export interface FamilyMember extends Versionable {
  id: string;
  name: string;
  color: string; // For UI differentiation
  isActive: boolean;
  createdAt: Date;
}

export interface FamilySettings {
  householdName?: string;
  defaultVisibility: AccountVisibility;
}

// Goal types for financial projections
export type GoalType =
  | "net-worth" // Target net worth
  | "retirement" // Retirement savings target
  | "savings" // General savings goal
  | "investment" // Investment portfolio target
  | "debt-free" // Pay off all debt
  | "emergency-fund" // Emergency fund target
  | "custom"; // User-defined goal

export type GoalStatus = "active" | "achieved" | "paused" | "cancelled";

export interface Goal extends Versionable {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number; // cents
  currentAmount: number; // cents - calculated/cached
  targetDate?: Date; // Optional deadline

  // Projection settings
  monthlyContribution?: number; // cents - expected monthly savings
  expectedReturnRate?: number; // Annual return rate (e.g., 0.07 for 7%)

  // For retirement goals
  retirementAge?: number;
  preservationAge?: number; // Default 60 (Australia)
  includeSuperannuation?: boolean;

  // Tracking - link to specific accounts/holdings
  linkedAccountIds?: string[];
  linkedHoldingIds?: string[];

  // Metadata
  status: GoalStatus;
  notes?: string;
  color?: string;
  icon?: string;
  createdAt: Date;
}

export interface GoalProgress {
  goal: Goal;
  currentAmount: number; // cents
  progressPercent: number; // 0-100+
  remainingAmount: number; // cents
  projectedCompletionDate?: Date;
  monthsToTarget?: number;
  onTrack: boolean;
}

// Portfolio history for tracking portfolio value over time
export interface PortfolioSnapshot {
  id: string;
  date: Date; // Date only (one per day)
  totalValue: number; // cents
  totalCostBasis: number; // cents
  totalGainLoss: number; // cents
  holdingsSnapshot: HoldingSnapshot[]; // Individual holding values
  createdAt: Date;
}

// Individual holding value at snapshot time
export interface HoldingSnapshot {
  holdingId: string;
  symbol: string;
  type: HoldingType;
  units: number;
  value: number; // cents
  costBasis: number; // cents
}

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
  // Multi-backend support
  backendType?: "google-drive" | "webdav" | "s3" | "local-file";
  backendConfig?: string; // Serialized JSON config (credentials stored here)
}

/**
 * Snapshot of all data for rollback capability during sync
 */
export interface SyncSnapshot {
  id: string;
  /** Compressed JSON of all synced data */
  data: string;
  /** When the snapshot was created */
  createdAt: Date;
  /** Size in bytes for UI display */
  sizeBytes: number;
  /** Reason for creating snapshot */
  reason: "pre-sync" | "pre-import" | "manual";
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

// ============ Property Portfolio Types ============

// Australian states for stamp duty calculation
export type AustralianState =
  | "NSW"
  | "VIC"
  | "QLD"
  | "SA"
  | "WA"
  | "TAS"
  | "NT"
  | "ACT";

// Property type classification
export type PropertyType =
  | "house"
  | "apartment"
  | "townhouse"
  | "unit"
  | "land"
  | "commercial"
  | "industrial";

// Property purpose
export type PropertyPurpose = "investment" | "owner-occupied" | "holiday";

// Property status
export type PropertyStatus = "active" | "sold" | "archived";

// Loan type
export type LoanType =
  | "interest-only"
  | "principal-interest"
  | "fixed"
  | "variable"
  | "split";

// Expense frequency for normalization
export type ExpenseFrequency = "weekly" | "monthly" | "quarterly" | "annually";

// Property expense categories
export type PropertyExpenseCategory =
  | "council-rates"
  | "strata-fees"
  | "water-rates"
  | "building-insurance"
  | "landlord-insurance"
  | "property-management"
  | "leasing-fee"
  | "advertising"
  | "repairs-maintenance"
  | "cleaning"
  | "gardening"
  | "pest-control"
  | "pool-maintenance"
  | "interest-payments"
  | "bank-charges"
  | "depreciation"
  | "capital-works"
  | "other";

// Property entity
export interface Property extends Versionable {
  id: string;

  // Basic Details
  address: string;
  suburb: string;
  state: AustralianState;
  postcode: string;
  propertyType: PropertyType;
  purpose: PropertyPurpose;
  status: PropertyStatus;

  // Purchase Details (all in cents)
  purchasePrice: number;
  purchaseDate: Date;
  valuationAmount: number;
  valuationDate?: Date;

  // Purchase Costs (all in cents)
  stampDuty: number;
  legalFees: number;
  buildingInspection?: number;
  pestInspection?: number;
  conveyancingFees?: number;
  mortgageRegistration?: number;
  titleSearch?: number;
  adjustments?: number; // Council rates/strata settled at purchase
  otherPurchaseCosts?: number;

  // Renovation/Improvement
  renovationCost?: number;
  renovationDate?: Date;
  renovationDescription?: string;

  // Land & Building Split (for depreciation)
  landValue?: number;
  buildingValue?: number;
  buildingAge?: number; // Years at purchase for depreciation calc
  constructionDate?: Date;

  // Insurance
  buildingInsuranceAnnual?: number;
  landlordInsuranceAnnual?: number;
  insurerName?: string;
  insurancePolicyNumber?: string;
  insuranceRenewalDate?: Date;

  // Property Manager
  hasPropertyManager: boolean;
  propertyManagerName?: string;
  propertyManagerCompany?: string;
  propertyManagerEmail?: string;
  propertyManagerPhone?: string;
  managementFeePercent?: number; // e.g., 7.5 for 7.5%

  // Key Dates
  settlementDate?: Date;
  lastTermiteInspection?: Date;
  nextTermiteInspection?: Date;
  lastLeaseInspection?: Date;
  airconLastServiced?: Date;

  // Notes and metadata
  notes?: string;
  memberId?: string; // Family member ownership

  createdAt: Date;
}

// Property Loan
export interface PropertyLoan extends Versionable {
  id: string;
  propertyId: string;

  // Loan Details
  lender: string;
  accountNumber?: string;
  loanName?: string; // "Home Loan 1", "Investment Loan"

  // Amounts (all in cents)
  originalLoanAmount: number;
  currentBalance: number;
  lmiAmount?: number; // Lenders Mortgage Insurance
  redrawAvailable?: number;

  // Interest & Terms
  interestRate: number; // e.g., 5.75 for 5.75%
  loanType: LoanType;
  interestOnlyPeriodMonths?: number;
  principalInterestPeriodMonths?: number;
  loanTermMonths: number;
  fixedRateExpiryDate?: Date;

  // Offset Account
  hasOffsetAccount: boolean;
  offsetAccountId?: string; // Link to bank account if tracking separately
  offsetBalance?: number;

  // Repayment
  repaymentAmount?: number; // Regular repayment in cents
  repaymentFrequency?: ExpenseFrequency;
  repaymentDay?: number; // Day of month (1-31)

  // Dates
  startDate: Date;
  maturityDate?: Date;

  createdAt: Date;
}

// Property Expense (recurring or one-off)
export interface PropertyExpense extends Versionable {
  id: string;
  propertyId: string;

  category: PropertyExpenseCategory;
  description: string;
  amount: number; // cents
  frequency: ExpenseFrequency;

  // For tracking actuals vs estimates
  isEstimate: boolean;

  // For one-off expenses
  isRecurring: boolean;
  expenseDate?: Date;

  // Tax deductibility
  isDeductible: boolean;
  gstAmount?: number; // cents
  atoCategory?: string; // D1-D10 for tax

  financialYear?: string; // "2024-25"

  createdAt: Date;
}

// Property Rental (tenant/lease)
export interface PropertyRental extends Versionable {
  id: string;
  propertyId: string;

  // Tenant Details
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  numberOfTenants?: number;

  // Lease Details
  leaseStartDate: Date;
  leaseEndDate: Date;
  leaseType?: "fixed" | "periodic";

  // Rental Income (cents)
  weeklyRent: number;
  bondAmount?: number;
  bondLodgedWith?: string; // e.g., "NSW Fair Trading"
  bondReceiptNumber?: string;

  // Rent Reviews
  lastRentReviewDate?: Date;
  nextRentReviewDate?: Date;
  rentIncreasePercent?: number;

  // Vacancy allowance (percentage, e.g., 2 for 2%)
  vacancyAllowancePercent?: number;

  // Payment tracking
  rentPaidToDate?: Date;
  isCurrentlyOccupied: boolean;

  notes?: string;

  createdAt: Date;
}

// Property Depreciation (manual entry from QS report)
export interface PropertyDepreciation extends Versionable {
  id: string;
  propertyId: string;
  financialYear: string; // "2024-25"

  // Division 40 (Plant & Equipment)
  division40Amount: number; // cents
  division40Items?: DepreciationItem[];

  // Division 43 (Building/Capital Works)
  division43Amount: number; // cents
  division43Rate?: number; // 2.5% or 4%

  totalDepreciation: number;

  // Source
  hasQuantitySurveyorReport: boolean;
  surveyorReportDate?: Date;
  surveyorCompany?: string;
  surveyorReportCost?: number; // cents

  notes?: string;

  createdAt: Date;
}

// Individual depreciation item from QS report
export interface DepreciationItem {
  name: string;
  originalValue: number; // cents
  effectiveLife: number; // years
  writeOffThisYear: number; // cents
  remainingValue: number; // cents
}

// Property Model (for scenario analysis)
export interface PropertyModel extends Versionable {
  id: string;
  propertyId?: string; // Optional - can be standalone model for pre-purchase
  name: string;

  // Input Assumptions
  assumptions: PropertyAssumptions;

  // Calculated Results (cached)
  calculatedResults?: PropertyCalculatedResults;
  lastCalculatedAt?: Date;

  isActive: boolean;
  createdAt: Date;
}

// Property Model Assumptions (inputs)
export interface PropertyAssumptions {
  // Property Details
  address?: string;
  state: AustralianState;
  propertyType: PropertyType;

  // Purchase Inputs (cents)
  purchasePrice: number;
  valuationAmount?: number;

  // Deposit & Finance
  depositPercent: number; // e.g., 20 for 20%
  isFirstHomeBuyer: boolean;

  // Loan Inputs
  interestRate: number; // e.g., 5.75
  loanType: LoanType;
  interestOnlyPeriodYears: number;
  principalInterestPeriodYears: number;
  loanTermYears: number;

  // Purchase Costs (optional overrides, cents)
  stampDutyOverride?: number;
  legalFees?: number;
  buildingInspection?: number;
  pestInspection?: number;
  otherPurchaseCosts?: number;

  // Income Inputs (cents)
  weeklyRentLow: number;
  weeklyRentHigh: number;
  vacancyPercent: number; // e.g., 2

  // Expense Inputs (annual amounts in cents, or percentages)
  propertyManagementPercent: number; // e.g., 9 (inc GST)
  councilRatesAnnual: number;
  waterRatesAnnual: number;
  strataFeesAnnual?: number;
  buildingInsuranceAnnual: number;
  landlordInsuranceAnnual: number;
  maintenanceAnnual?: number;
  poolMaintenanceAnnual?: number;
  bankFeesAnnual?: number;

  // Tax Inputs
  marginalTaxRate: number; // e.g., 37

  // Depreciation (annual estimate, cents)
  estimatedDepreciationYear1?: number;

  // Growth Assumptions (optional projections)
  capitalGrowthPercent?: number; // e.g., 5 for 5% annual
  rentGrowthPercent?: number; // e.g., 3 for 3% annual
}

// Property Model Calculated Results (outputs)
export interface PropertyCalculatedResults {
  // Capital Required (cents)
  depositAmount: number;
  stampDuty: number;
  legalFees: number;
  lmiAmount: number;
  otherCosts: number;
  totalCapitalRequired: number;

  // Loan Details (cents)
  loanAmountPreLMI: number;
  loanAmountPostLMI: number;
  lvr: number; // Loan-to-Value Ratio percentage

  // Interest Payments (cents)
  monthlyInterestPayment: number;
  annualInterestPayment: number;

  // Annual Expenses Breakdown (cents)
  totalAnnualExpenses: number;
  expensesBreakdown: Record<string, number>;

  // Yield Analysis (percentages)
  grossYieldLow: number;
  grossYieldHigh: number;
  netYieldLow: number;
  netYieldHigh: number;
  cashOnCashReturnLow: number;
  cashOnCashReturnHigh: number;

  // Annual Income (cents)
  annualRentalIncomeLow: number;
  annualRentalIncomeHigh: number;
  annualRentalIncomeAfterVacancyLow: number;
  annualRentalIncomeAfterVacancyHigh: number;

  // Cashflow Before Tax (cents)
  cashflowBeforeTaxWeeklyLow: number;
  cashflowBeforeTaxWeeklyHigh: number;
  cashflowBeforeTaxMonthlyLow: number;
  cashflowBeforeTaxMonthlyHigh: number;
  cashflowBeforeTaxAnnuallyLow: number;
  cashflowBeforeTaxAnnuallyHigh: number;

  // Tax Impact (cents)
  estimatedDepreciation: number;
  taxableIncomeLow: number;
  taxableIncomeHigh: number;
  estimatedTaxBenefitLow: number; // Negative gearing benefit
  estimatedTaxBenefitHigh: number;

  // Cashflow After Tax (cents)
  cashflowAfterTaxWeeklyLow: number;
  cashflowAfterTaxWeeklyHigh: number;
  cashflowAfterTaxMonthlyLow: number;
  cashflowAfterTaxMonthlyHigh: number;
  cashflowAfterTaxAnnuallyLow: number;
  cashflowAfterTaxAnnuallyHigh: number;
}

// Stamp Duty Calculation Result
export interface StampDutyResult {
  stampDuty: number; // cents
  transferFee: number; // cents
  mortgageRegistration: number; // cents
  totalGovernmentCharges: number; // cents
  isFirstHomeBuyerExempt: boolean;
  concessionApplied: number; // cents saved
  foreignBuyerSurcharge?: number; // cents
}

// LMI Calculation Result
export interface LMIResult {
  lmiAmount: number; // cents
  lvr: number; // percentage
  requiresLMI: boolean;
  lmiRate: number; // percentage rate applied
}

// ============ Yield Calculator Types ============

export interface YieldCalculatorInputs {
  purchasePrice: number; // cents
  weeklyRent: number; // cents
  annualExpenses?: number; // cents (optional for net yield)
}

export interface YieldCalculatorResults {
  grossYield: number; // percentage (e.g., 5.2)
  netYield: number; // percentage
  annualRent: number; // cents
  annualExpenses: number; // cents
  netOperatingIncome: number; // cents
  assessment: {
    category: "excellent" | "good" | "fair" | "poor";
    description: string;
  };
}

export interface RentScenario {
  weeklyRent: number; // cents
  annualRent: number; // cents
  grossYield: number; // percentage
  netYield: number; // percentage
  assessment: "excellent" | "good" | "fair" | "poor";
}

// ============ Affordability Calculator Types ============

export type LivingExpensesType = "declared" | "hem";

export type DebtType =
  | "credit-card"
  | "personal-loan"
  | "car-loan"
  | "hecs-help"
  | "other-mortgage"
  | "other";

export type AffordabilityStatus = "green" | "amber" | "red";

export interface BorrowerProfile {
  grossAnnualIncome: number; // cents
  partnerGrossIncome?: number; // cents (optional)
  numberOfDependents: number;
  livingExpensesType: LivingExpensesType;
  declaredLivingExpenses?: number; // cents - annual, if declared
}

export interface ExistingDebt {
  id: string;
  type: DebtType;
  description?: string;
  creditLimit?: number; // cents - for credit cards
  currentBalance: number; // cents
  monthlyRepayment?: number; // cents - for loans (not credit cards)
  interestRate?: number; // percentage (optional)
}

export interface AffordabilityInputs {
  borrower: BorrowerProfile;
  existingDebts: ExistingDebt[];

  // Property-specific (optional for "how much can I borrow" mode)
  purchasePrice?: number; // cents
  depositAmount?: number; // cents
  depositPercent?: number; // percentage

  // Loan assumptions
  interestRate: number; // percentage (e.g., 6.5)
  apraBuffer: number; // percentage - typically 3%
  loanTermYears: number; // typically 30
  isInterestOnly: boolean;

  // Optional rental income for investment properties
  expectedWeeklyRent?: number; // cents
}

export interface AffordabilityResults {
  // Borrowing capacity
  maxBorrowingAmount: number; // cents
  assessmentRate: number; // percentage (interest rate + APRA buffer)

  // Serviceability ratios
  debtServiceRatio: number; // percentage - all debts / gross income
  loanServiceRatio: number; // percentage - housing debt / gross income
  dsrStatus: AffordabilityStatus;
  lsrStatus: AffordabilityStatus;

  // Monthly breakdown (cents)
  monthlyGrossIncome: number;
  monthlyNetIncome: number; // estimated after tax
  monthlyLivingExpenses: number;
  monthlyExistingDebtPayments: number;
  availableForHousing: number;
  proposedRepayment: number;
  surplus: number; // can be negative

  // Coverage ratio (for investment)
  rentalCoverageRatio?: number; // rental income / interest payments

  // Overall assessment
  overallStatus: AffordabilityStatus;
  statusDescription: string;
}

export interface StressTestScenario {
  rateIncrease: number; // percentage (e.g., 1, 2, 3)
  newRate: number; // percentage
  newRepayment: number; // cents
  monthlyCashflow: number; // cents (can be negative)
  status: AffordabilityStatus;
}

export interface RiskMetrics {
  maxVacancyBeforeNegative: number; // percentage
  sensitivityPerPercent: number; // cents change per 1% rate increase
  bufferMonths: number; // months of expenses covered by surplus
  breakEvenRate: number; // interest rate where cashflow = 0
}

// HEM (Household Expenditure Measure) bracket
export interface HEMBracket {
  incomeMin: number; // dollars annual
  incomeMax: number; // dollars annual
  single: number; // monthly HEM in dollars
  couple: number; // monthly HEM in dollars
  perDependent: number; // additional per dependent in dollars
}

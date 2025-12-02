// Central export for all Zod schemas

// Common schemas
export {
  moneyInCentsSchema,
  positiveMoneySchema,
  currencySchema,
  uuidSchema,
  dateSchema,
  coercedDateSchema,
  financialYearSchema,
  timestampFieldsSchema,
  metadataSchema,
  nonEmptyStringSchema,
  optionalStringSchema,
  tagsSchema,
  dateRangeSchema,
} from './common.schema';

// Account schemas
export {
  accountTypeSchema,
  accountSchema,
  accountCreateSchema,
  accountUpdateSchema,
  type AccountType,
  type Account,
  type AccountCreate,
  type AccountUpdate,
} from './account.schema';

// Transaction schemas
export {
  transactionTypeSchema,
  importSourceSchema,
  transactionSchema,
  transactionCreateSchema,
  transactionUpdateSchema,
  transactionImportSchema,
  transactionBulkImportSchema,
  type TransactionType,
  type ImportSource,
  type Transaction,
  type TransactionCreate,
  type TransactionUpdate,
  type TransactionImport,
} from './transaction.schema';

// Holding schemas
export {
  holdingTypeSchema,
  investmentTransactionTypeSchema,
  holdingSchema,
  holdingCreateSchema,
  holdingUpdateSchema,
  investmentTransactionSchema,
  investmentTransactionCreateSchema,
  type HoldingType,
  type InvestmentTransactionType,
  type Holding,
  type HoldingCreate,
  type HoldingUpdate,
  type InvestmentTransaction,
  type InvestmentTransactionCreate,
} from './holding.schema';

// Superannuation schemas
export {
  superProviderSchema,
  superContributionTypeSchema,
  superTransactionTypeSchema,
  superannuationAccountSchema,
  superannuationAccountCreateSchema,
  superTransactionSchema,
  superTransactionCreateSchema,
  type SuperProvider,
  type SuperContributionType,
  type SuperTransactionType,
  type SuperannuationAccount,
  type SuperannuationAccountCreate,
  type SuperTransaction,
  type SuperTransactionCreate,
} from './super.schema';

// Sync schemas
export {
  categorySchema,
  importBatchSchema,
  taxItemSchema,
  chatMessageSchema,
  chatConversationSchema,
  categorizationQueueItemSchema,
  merchantPatternSchema,
  syncDataSchema,
  syncMetadataSchema,
  type Category,
  type ImportBatch,
  type TaxItem,
  type ChatMessage,
  type ChatConversation,
  type CategorizationQueueItem,
  type MerchantPattern,
  type SyncData,
  type SyncMetadata,
} from './sync.schema';

// Validation helper functions
import { z } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Validate data against a Zod schema with friendly error messages
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  // Use z.prettifyError for simple error message
  const errorMessage = z.prettifyError(result.error);

  // Parse the error to extract individual field errors
  const errors: Array<{ path: string; message: string }> = [];

  // Split by newlines and parse each line
  const lines = errorMessage.split('\n').filter((line) => line.trim());
  for (const line of lines) {
    // Match patterns like "fieldName: error message" or "root: error"
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      errors.push({ path: match[1].trim(), message: match[2].trim() });
    } else if (line.trim()) {
      errors.push({ path: 'root', message: line.trim() });
    }
  }

  return { success: false, errors: errors.length > 0 ? errors : [{ path: 'root', message: errorMessage }] };
}

/**
 * Validate data and throw if invalid
 */
export function validateOrThrow<T>(schema: z.ZodType<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  const formattedError = z.prettifyError(result.error);
  const message = context
    ? `Validation failed for ${context}: ${formattedError}`
    : `Validation failed: ${formattedError}`;
  throw new Error(message);
}

/**
 * Safe parse that returns null on error (useful for optional validation)
 */
export function safeParse<T>(schema: z.ZodType<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

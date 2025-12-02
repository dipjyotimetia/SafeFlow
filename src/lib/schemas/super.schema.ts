// Superannuation validation schemas

import { z } from 'zod';
import {
  uuidSchema,
  moneyInCentsSchema,
  positiveMoneySchema,
  dateSchema,
  coercedDateSchema,
  timestampFieldsSchema,
  financialYearSchema,
  nonEmptyStringSchema,
  optionalStringSchema,
} from './common.schema';
import { importSourceSchema } from './transaction.schema';

// Super providers
export const superProviderSchema = z.enum(['unisuper', 'australian-super', 'other']);

// Super contribution types
export const superContributionTypeSchema = z.enum([
  'employer-sg',
  'employer-additional',
  'salary-sacrifice',
  'personal-concessional',
  'personal-non-concessional',
  'government-co-contribution',
  'spouse-contribution',
]);

// Super transaction types (includes contributions + other types)
export const superTransactionTypeSchema = z.enum([
  // Contributions
  'employer-sg',
  'employer-additional',
  'salary-sacrifice',
  'personal-concessional',
  'personal-non-concessional',
  'government-co-contribution',
  'spouse-contribution',
  // Other types
  'earnings',
  'fees',
  'insurance',
  'withdrawal',
  'rollover-in',
  'rollover-out',
]);

// Full SuperannuationAccount schema
export const superannuationAccountSchema = z.object({
  id: uuidSchema,
  provider: superProviderSchema,
  providerName: nonEmptyStringSchema.max(100),
  memberNumber: nonEmptyStringSchema.max(50),
  accountName: optionalStringSchema,
  investmentOption: optionalStringSchema,
  employerName: optionalStringSchema,

  // Balances (cents)
  totalBalance: moneyInCentsSchema,
  preservedBalance: positiveMoneySchema,
  restrictedNonPreserved: positiveMoneySchema,
  unrestrictedNonPreserved: positiveMoneySchema,

  // Insurance
  hasLifeInsurance: z.boolean(),
  hasTpdInsurance: z.boolean(),
  hasIncomeProtection: z.boolean(),
}).merge(timestampFieldsSchema);

// Schema for creating a super account
export const superannuationAccountCreateSchema = z.object({
  provider: superProviderSchema,
  providerName: nonEmptyStringSchema.max(100),
  memberNumber: nonEmptyStringSchema.max(50),
  accountName: optionalStringSchema,
  investmentOption: optionalStringSchema,
  employerName: optionalStringSchema,
  totalBalance: moneyInCentsSchema.default(0),
  preservedBalance: positiveMoneySchema.default(0),
  restrictedNonPreserved: positiveMoneySchema.default(0),
  unrestrictedNonPreserved: positiveMoneySchema.default(0),
  hasLifeInsurance: z.boolean().default(false),
  hasTpdInsurance: z.boolean().default(false),
  hasIncomeProtection: z.boolean().default(false),
});

// Full SuperTransaction schema
export const superTransactionSchema = z.object({
  id: uuidSchema,
  superAccountId: uuidSchema,
  type: superTransactionTypeSchema,
  amount: moneyInCentsSchema, // Can be negative for fees/withdrawals
  date: dateSchema,
  description: optionalStringSchema,
  financialYear: financialYearSchema,

  // Contribution-specific
  employerName: optionalStringSchema,
  isConcessional: z.boolean().optional(),

  importSource: importSourceSchema.optional(),
  importBatchId: uuidSchema.optional(),
}).merge(timestampFieldsSchema);

// Schema for creating a super transaction
export const superTransactionCreateSchema = z.object({
  superAccountId: uuidSchema,
  type: superTransactionTypeSchema,
  amount: moneyInCentsSchema,
  date: coercedDateSchema,
  description: optionalStringSchema,
  financialYear: financialYearSchema,
  employerName: optionalStringSchema,
  isConcessional: z.boolean().optional(),
});

// Type exports
export type SuperProvider = z.infer<typeof superProviderSchema>;
export type SuperContributionType = z.infer<typeof superContributionTypeSchema>;
export type SuperTransactionType = z.infer<typeof superTransactionTypeSchema>;
export type SuperannuationAccount = z.infer<typeof superannuationAccountSchema>;
export type SuperannuationAccountCreate = z.infer<typeof superannuationAccountCreateSchema>;
export type SuperTransaction = z.infer<typeof superTransactionSchema>;
export type SuperTransactionCreate = z.infer<typeof superTransactionCreateSchema>;

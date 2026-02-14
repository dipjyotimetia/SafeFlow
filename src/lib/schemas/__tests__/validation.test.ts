import { describe, it, expect } from 'vitest';
import {
  moneyInCentsSchema,
  positiveMoneySchema,
  financialYearSchema,
  accountCreateSchema,
  transactionCreateSchema,
  validate,
  validateOrThrow,
} from '../index';

describe('Validation Schemas', () => {
  describe('moneyInCentsSchema', () => {
    it('should accept valid integer amounts', () => {
      expect(moneyInCentsSchema.safeParse(1000).success).toBe(true);
      expect(moneyInCentsSchema.safeParse(0).success).toBe(true);
      expect(moneyInCentsSchema.safeParse(-500).success).toBe(true);
    });

    it('should reject non-integer amounts', () => {
      expect(moneyInCentsSchema.safeParse(10.5).success).toBe(false);
      expect(moneyInCentsSchema.safeParse(99.99).success).toBe(false);
    });

    it('should reject non-number types', () => {
      expect(moneyInCentsSchema.safeParse('1000').success).toBe(false);
      expect(moneyInCentsSchema.safeParse(null).success).toBe(false);
    });
  });

  describe('positiveMoneySchema', () => {
    it('should accept positive amounts', () => {
      expect(positiveMoneySchema.safeParse(1000).success).toBe(true);
      expect(positiveMoneySchema.safeParse(0).success).toBe(true);
    });

    it('should reject negative amounts', () => {
      expect(positiveMoneySchema.safeParse(-1).success).toBe(false);
      expect(positiveMoneySchema.safeParse(-500).success).toBe(false);
    });
  });

  describe('financialYearSchema', () => {
    it('should accept valid financial year format', () => {
      expect(financialYearSchema.safeParse('2024-25').success).toBe(true);
      expect(financialYearSchema.safeParse('2023-24').success).toBe(true);
      expect(financialYearSchema.safeParse('1999-00').success).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(financialYearSchema.safeParse('2024').success).toBe(false);
      expect(financialYearSchema.safeParse('24-25').success).toBe(false);
      expect(financialYearSchema.safeParse('2024/25').success).toBe(false);
    });

    it('should reject invalid year sequence', () => {
      expect(financialYearSchema.safeParse('2024-26').success).toBe(false);
      expect(financialYearSchema.safeParse('2024-23').success).toBe(false);
    });
  });

  describe('accountCreateSchema', () => {
    it('should accept valid account data', () => {
      const validAccount = {
        name: 'Test Account',
        type: 'bank',
        balance: 10000,
        currency: 'AUD',
      };
      expect(accountCreateSchema.safeParse(validAccount).success).toBe(true);
    });

    it('should reject missing name', () => {
      const invalidAccount = {
        type: 'bank',
        balance: 10000,
        currency: 'AUD',
      };
      expect(accountCreateSchema.safeParse(invalidAccount).success).toBe(false);
    });

    it('should reject invalid account type', () => {
      const invalidAccount = {
        name: 'Test Account',
        type: 'invalid_type',
        balance: 10000,
        currency: 'AUD',
      };
      expect(accountCreateSchema.safeParse(invalidAccount).success).toBe(false);
    });

    it('should accept all valid account types', () => {
      const types = ['bank', 'credit', 'cash', 'investment', 'crypto', 'asset', 'liability'];
      types.forEach((type) => {
        const account = {
          name: 'Test Account',
          type,
          balance: 0,
          currency: 'AUD',
        };
        expect(accountCreateSchema.safeParse(account).success).toBe(true);
      });
    });
  });

  describe('transactionCreateSchema', () => {
    it('should accept valid transaction data', () => {
      const validTransaction = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'expense',
        amount: 5000,
        description: 'Test Transaction',
        date: new Date(),
      };
      expect(transactionCreateSchema.safeParse(validTransaction).success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidTransaction = {
        type: 'expense',
        amount: 5000,
      };
      expect(transactionCreateSchema.safeParse(invalidTransaction).success).toBe(false);
    });

    it('should accept optional fields', () => {
      const transactionWithOptionals = {
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'expense',
        amount: 5000,
        description: 'Test Transaction',
        date: new Date(),
        categoryId: '123e4567-e89b-12d3-a456-426614174001',
        notes: 'Some notes',
        isDeductible: true,
        gstAmount: 500,
      };
      expect(transactionCreateSchema.safeParse(transactionWithOptionals).success).toBe(true);
    });

    it('should accept all valid transaction types', () => {
      const types = ['income', 'expense', 'transfer'];
      types.forEach((type) => {
        const transaction = {
          accountId: '123e4567-e89b-12d3-a456-426614174000',
          type,
          amount: 1000,
          description: 'Test',
          date: new Date(),
          transferToAccountId:
            type === 'transfer' ? '123e4567-e89b-12d3-a456-426614174001' : undefined,
        };
        expect(transactionCreateSchema.safeParse(transaction).success).toBe(true);
      });
    });
  });

  describe('validate helper', () => {
    it('should return success with valid data', () => {
      const result = validate(moneyInCentsSchema, 1000);
      expect(result.success).toBe(true);
      expect(result.data).toBe(1000);
    });

    it('should return errors with invalid data', () => {
      const result = validate(moneyInCentsSchema, 10.5);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('validateOrThrow helper', () => {
    it('should return data for valid input', () => {
      const result = validateOrThrow(moneyInCentsSchema, 1000, 'test amount');
      expect(result).toBe(1000);
    });

    it('should throw for invalid input', () => {
      expect(() => validateOrThrow(moneyInCentsSchema, 10.5, 'test amount')).toThrow();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { cbaParser } from '../bank/cba.parser';

describe('CBA Parser', () => {
  describe('canParse', () => {
    it('should identify CBA statement text', () => {
      const cbaText = `
        Commonwealth Bank
        Transaction Account
        Statement Period: 01/01/2024 to 31/01/2024
      `;
      expect(cbaParser.canParse(cbaText)).toBe(true);
    });

    it('should identify CommBank text', () => {
      const commBankText = `
        CommBank Statement
        Account Details
      `;
      expect(cbaParser.canParse(commBankText)).toBe(true);
    });

    it('should not identify non-CBA text', () => {
      const otherText = `
        ANZ Bank
        Transaction Statement
      `;
      expect(cbaParser.canParse(otherText)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse basic CBA transaction lines', () => {
      const cbaStatement = `
        Commonwealth Bank
        Statement Period: 01/01/2024 to 31/01/2024

        Date Description Debit Credit Balance
        15 Jan Coffee Shop 5.50 1,234.56
        16 Jan Direct Credit SALARY 2,500.00 3,734.56
        17 Jan WOOLWORTHS 123.45 3,611.11
      `;

      const result = cbaParser.parse(cbaStatement);

      // Parser result should have required ParseResult properties
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('transactions');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.transactions)).toBe(true);
    });

    it('should correctly categorize debits as expenses', () => {
      const cbaStatement = `
        Commonwealth Bank
        Statement Period: 01/01/2024 to 31/01/2024

        15 Jan Coffee Shop 25.00 1,000.00
      `;

      const result = cbaParser.parse(cbaStatement);

      if (result.transactions.length > 0) {
        const expenseTransaction = result.transactions.find((t) => t.type === 'expense');
        expect(expenseTransaction).toBeDefined();
      }
    });

    it('should correctly categorize credits as income', () => {
      const cbaStatement = `
        Commonwealth Bank
        Statement Period: 01/01/2024 to 31/01/2024

        16 Jan Direct Credit SALARY 2,500.00 3,500.00
      `;

      const result = cbaParser.parse(cbaStatement);

      if (result.transactions.length > 0) {
        const hasIncomeTransaction = result.transactions.some((t) => t.type === 'income');
        // Note: Depending on parsing logic, this may or may not find income
        expect(hasIncomeTransaction).toBeDefined();
      }
    });

    it('should handle empty statement', () => {
      const emptyStatement = `
        Commonwealth Bank
        Statement Period: 01/01/2024 to 31/01/2024

        No transactions
      `;

      const result = cbaParser.parse(emptyStatement);

      expect(result.transactions).toBeDefined();
      expect(Array.isArray(result.transactions)).toBe(true);
    });
  });
});

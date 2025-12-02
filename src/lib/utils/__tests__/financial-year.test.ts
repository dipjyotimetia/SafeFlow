import { describe, it, expect } from 'vitest';
import {
  getCurrentFinancialYear,
  getFinancialYearForDate,
  getFinancialYearDates,
  getFinancialQuarters,
  parseFinancialYear,
  formatFinancialYear,
} from '../financial-year';

describe('Financial Year Utilities', () => {
  describe('getFinancialYearForDate', () => {
    it('should return correct FY for dates in second half (Jul-Dec)', () => {
      // October 2024 should be FY 2024-25
      const date = new Date(2024, 9, 15); // Oct 15, 2024
      expect(getFinancialYearForDate(date)).toBe('2024-25');
    });

    it('should return correct FY for dates in first half (Jan-Jun)', () => {
      // March 2024 should be FY 2023-24
      const date = new Date(2024, 2, 15); // Mar 15, 2024
      expect(getFinancialYearForDate(date)).toBe('2023-24');
    });

    it('should handle July 1 (start of new FY)', () => {
      const date = new Date(2024, 6, 1); // Jul 1, 2024
      expect(getFinancialYearForDate(date)).toBe('2024-25');
    });

    it('should handle June 30 (end of FY)', () => {
      const date = new Date(2024, 5, 30); // Jun 30, 2024
      expect(getFinancialYearForDate(date)).toBe('2023-24');
    });
  });

  describe('getFinancialYearDates', () => {
    it('should return correct start and end dates for FY', () => {
      const { start, end } = getFinancialYearDates('2024-25');

      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(6); // July
      expect(start.getDate()).toBe(1);

      expect(end.getFullYear()).toBe(2025);
      expect(end.getMonth()).toBe(5); // June
      expect(end.getDate()).toBe(30);
    });

    it('should handle year transition correctly', () => {
      const { start, end } = getFinancialYearDates('2023-24');

      expect(start.getFullYear()).toBe(2023);
      expect(end.getFullYear()).toBe(2024);
    });
  });

  describe('getFinancialQuarters', () => {
    it('should return 4 quarters', () => {
      const quarters = getFinancialQuarters('2024-25');
      expect(quarters).toHaveLength(4);
    });

    it('should have correct quarter labels', () => {
      const quarters = getFinancialQuarters('2024-25');

      expect(quarters[0].label).toBe('Q1 (Jul-Sep)');
      expect(quarters[1].label).toBe('Q2 (Oct-Dec)');
      expect(quarters[2].label).toBe('Q3 (Jan-Mar)');
      expect(quarters[3].label).toBe('Q4 (Apr-Jun)');
    });

    it('should have correct Q1 dates (Jul-Sep)', () => {
      const quarters = getFinancialQuarters('2024-25');
      const q1 = quarters[0];

      expect(q1.start.getMonth()).toBe(6); // July
      expect(q1.start.getFullYear()).toBe(2024);
      expect(q1.end.getMonth()).toBe(8); // September
      expect(q1.end.getDate()).toBe(30); // Last day of Sep
    });

    it('should have correct Q4 dates (Apr-Jun)', () => {
      const quarters = getFinancialQuarters('2024-25');
      const q4 = quarters[3];

      expect(q4.start.getMonth()).toBe(3); // April
      expect(q4.start.getFullYear()).toBe(2025);
      expect(q4.end.getMonth()).toBe(5); // June
      expect(q4.end.getDate()).toBe(30); // Last day of Jun
    });

    it('should handle February correctly in Q3 (leap year)', () => {
      const quarters = getFinancialQuarters('2023-24');
      const q3 = quarters[2];

      // Q3 ends at end of March
      expect(q3.end.getMonth()).toBe(2); // March
      expect(q3.end.getDate()).toBe(31); // Last day of Mar
    });
  });

  describe('parseFinancialYear', () => {
    it('should parse valid FY string', () => {
      // parseFinancialYear returns the validated string or null
      const result = parseFinancialYear('2024-25');
      expect(result).toBe('2024-25');
    });

    it('should return null for invalid FY string', () => {
      expect(parseFinancialYear('invalid')).toBeNull();
      expect(parseFinancialYear('2024')).toBeNull();
      expect(parseFinancialYear('2024-26')).toBeNull(); // End year must be start + 1
    });
  });

  describe('formatFinancialYear', () => {
    it('should format FY correctly', () => {
      // formatFinancialYear takes a FY string and adds "FY " prefix
      expect(formatFinancialYear('2024-25')).toBe('FY 2024-25');
      expect(formatFinancialYear('2023-24')).toBe('FY 2023-24');
    });
  });

  describe('getCurrentFinancialYear', () => {
    it('should return a valid FY string format', () => {
      const currentFY = getCurrentFinancialYear();
      expect(currentFY).toMatch(/^\d{4}-\d{2}$/);
    });
  });
});

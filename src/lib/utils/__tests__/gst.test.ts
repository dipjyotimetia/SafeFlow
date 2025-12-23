import { describe, it, expect } from 'vitest';
import {
  calculateGSTFromInclusive,
  calculateGSTFromExclusive,
  addGST,
  removeGST,
  getGSTAmount,
  formatGSTBreakdown,
  isLikelyGSTInclusive,
  getGSTRate,
  calculateClaimableGST,
} from '../gst';

describe('GST Utilities', () => {
  describe('calculateGSTFromInclusive', () => {
    it('should calculate GST from inclusive amount (standard cases)', () => {
      // $110 inc GST = $100 ex GST + $10 GST
      const result = calculateGSTFromInclusive(11000);
      expect(result.gst).toBe(1000);
      expect(result.amountExGST).toBe(10000);
      expect(result.amountIncGST).toBe(11000);
    });

    it('should handle zero amount', () => {
      const result = calculateGSTFromInclusive(0);
      expect(result.gst).toBe(0);
      expect(result.amountExGST).toBe(0);
    });

    it('should handle small amounts', () => {
      // $1.10 = $1 + 10c GST
      const result = calculateGSTFromInclusive(110);
      expect(result.gst).toBe(10);
      expect(result.amountExGST).toBe(100);
    });

    it('should round correctly for amounts not evenly divisible', () => {
      // $100 inc GST / 11 = 9.0909... rounds to 9
      const result = calculateGSTFromInclusive(10000);
      expect(result.gst).toBe(909); // $9.09
      expect(result.amountExGST).toBe(9091); // $90.91
      // Verify they sum back correctly
      expect(result.gst + result.amountExGST).toBe(10000);
    });

    it('should handle typical Australian prices', () => {
      // $19.99 inc GST
      const result = calculateGSTFromInclusive(1999);
      expect(result.gst).toBe(182); // $1.82
      expect(result.amountExGST).toBe(1817); // $18.17
    });
  });

  describe('calculateGSTFromExclusive', () => {
    it('should calculate GST from exclusive amount', () => {
      // $100 ex GST + 10% = $110 inc GST
      const result = calculateGSTFromExclusive(10000);
      expect(result.gst).toBe(1000);
      expect(result.amountIncGST).toBe(11000);
      expect(result.amountExGST).toBe(10000);
    });

    it('should handle zero amount', () => {
      const result = calculateGSTFromExclusive(0);
      expect(result.gst).toBe(0);
      expect(result.amountIncGST).toBe(0);
    });

    it('should handle small amounts', () => {
      // $1 ex GST + 10c = $1.10 inc GST
      const result = calculateGSTFromExclusive(100);
      expect(result.gst).toBe(10);
      expect(result.amountIncGST).toBe(110);
    });

    it('should round GST correctly', () => {
      // $99.99 * 0.1 = $9.999 rounds to $10.00
      const result = calculateGSTFromExclusive(9999);
      expect(result.gst).toBe(1000);
      expect(result.amountIncGST).toBe(10999);
    });
  });

  describe('addGST', () => {
    it('should add 10% GST to amount', () => {
      expect(addGST(10000)).toBe(11000);
      expect(addGST(100)).toBe(110);
      expect(addGST(1000)).toBe(1100);
    });

    it('should handle zero', () => {
      expect(addGST(0)).toBe(0);
    });

    it('should round result', () => {
      // $1.01 * 1.1 = $1.111 rounds to $1.11
      expect(addGST(101)).toBe(111);
    });
  });

  describe('removeGST', () => {
    it('should remove GST from inclusive amount', () => {
      expect(removeGST(11000)).toBe(10000);
      expect(removeGST(110)).toBe(100);
    });

    it('should handle zero', () => {
      expect(removeGST(0)).toBe(0);
    });

    it('should handle amounts that dont divide evenly', () => {
      // $100 inc GST - ($100/11) = $100 - $9.09 = $90.91
      expect(removeGST(10000)).toBe(9091);
    });
  });

  describe('getGSTAmount', () => {
    it('should return just the GST portion', () => {
      expect(getGSTAmount(11000)).toBe(1000);
      expect(getGSTAmount(110)).toBe(10);
    });

    it('should handle zero', () => {
      expect(getGSTAmount(0)).toBe(0);
    });

    it('should round correctly', () => {
      // $100 / 11 = 9.09...
      expect(getGSTAmount(10000)).toBe(909);
    });
  });

  describe('formatGSTBreakdown', () => {
    it('should format GST breakdown for display', () => {
      const result = formatGSTBreakdown(11000);
      expect(result.total).toBe('$110.00');
      expect(result.gst).toBe('$10.00');
      expect(result.subtotal).toBe('$100.00');
    });

    it('should handle zero', () => {
      const result = formatGSTBreakdown(0);
      expect(result.total).toBe('$0.00');
      expect(result.gst).toBe('$0.00');
      expect(result.subtotal).toBe('$0.00');
    });
  });

  describe('isLikelyGSTInclusive', () => {
    it('should return true for amounts ending in .00', () => {
      expect(isLikelyGSTInclusive(10000)).toBe(true); // $100.00
      expect(isLikelyGSTInclusive(1000)).toBe(true); // $10.00
      expect(isLikelyGSTInclusive(100)).toBe(true); // $1.00
    });

    it('should return true for amounts ending in .99', () => {
      expect(isLikelyGSTInclusive(1999)).toBe(true); // $19.99
      expect(isLikelyGSTInclusive(9999)).toBe(true); // $99.99
    });

    it('should return true for amounts ending in .95', () => {
      expect(isLikelyGSTInclusive(1995)).toBe(true); // $19.95
      expect(isLikelyGSTInclusive(2995)).toBe(true); // $29.95
    });

    it('should return false for other amounts', () => {
      expect(isLikelyGSTInclusive(1234)).toBe(false); // $12.34
      expect(isLikelyGSTInclusive(5050)).toBe(false); // $50.50
    });

    it('should handle negative amounts', () => {
      expect(isLikelyGSTInclusive(-10000)).toBe(true);
      expect(isLikelyGSTInclusive(-1999)).toBe(true);
    });
  });

  describe('getGSTRate', () => {
    it('should return 10 (percentage)', () => {
      expect(getGSTRate()).toBe(10);
    });
  });

  describe('calculateClaimableGST', () => {
    it('should calculate total claimable GST from transactions', () => {
      // Three transactions: $110, $220, $330 = $60 GST total
      const transactions = [11000, 22000, 33000];
      expect(calculateClaimableGST(transactions)).toBe(6000);
    });

    it('should handle empty array', () => {
      expect(calculateClaimableGST([])).toBe(0);
    });

    it('should handle single transaction', () => {
      expect(calculateClaimableGST([11000])).toBe(1000);
    });
  });

  describe('GST calculation consistency', () => {
    it('should maintain addGST and removeGST as inverse operations', () => {
      const original = 10000;
      const withGST = addGST(original);
      const removed = removeGST(withGST);
      expect(removed).toBe(original);
    });

    it('should ensure GST + exGST = incGST', () => {
      const testAmounts = [100, 1000, 9999, 12345, 100000];
      for (const amount of testAmounts) {
        const result = calculateGSTFromInclusive(amount);
        expect(result.gst + result.amountExGST).toBe(amount);
      }
    });

    it('should ensure exGST + GST = incGST for exclusive calculations', () => {
      const testAmounts = [100, 1000, 9999, 12345, 100000];
      for (const amount of testAmounts) {
        const result = calculateGSTFromExclusive(amount);
        expect(result.amountExGST + result.gst).toBe(result.amountIncGST);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle 1 cent amounts', () => {
      const result = calculateGSTFromInclusive(1);
      expect(result.gst).toBe(0); // 1/11 rounds to 0
      expect(result.amountExGST).toBe(1);
    });

    it('should handle very large amounts', () => {
      // $1 million inc GST
      const result = calculateGSTFromInclusive(100000000);
      expect(result.gst).toBe(9090909); // $90,909.09
      expect(result.amountExGST).toBe(90909091); // $909,090.91
      expect(result.gst + result.amountExGST).toBe(100000000);
    });

    it('should never produce negative GST', () => {
      for (let amount = 0; amount <= 1000; amount++) {
        const result = calculateGSTFromInclusive(amount);
        expect(result.gst).toBeGreaterThanOrEqual(0);
        expect(result.amountExGST).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

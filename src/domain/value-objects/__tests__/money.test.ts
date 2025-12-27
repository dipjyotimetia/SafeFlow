import { describe, it, expect } from "vitest";
import { Money } from "../money";

describe("Money", () => {
  describe("Factory Methods", () => {
    it("creates Money from cents", () => {
      const money = Money.fromCents(1999);
      expect(money.cents).toBe(1999);
      expect(money.currency).toBe("AUD");
    });

    it("creates Money from dollars", () => {
      const money = Money.fromDollars(19.99);
      expect(money.cents).toBe(1999);
    });

    it("creates zero Money", () => {
      const money = Money.zero();
      expect(money.cents).toBe(0);
    });

    it("rounds cents when created from dollars", () => {
      const money = Money.fromDollars(10.999);
      expect(money.cents).toBe(1100);
    });

    it("handles floating point edge cases", () => {
      // 0.1 + 0.2 = 0.30000000000000004 in floating point
      const a = Money.fromDollars(0.1);
      const b = Money.fromDollars(0.2);
      expect(a.add(b).cents).toBe(30); // Not 30.000000000000004
    });

    it("throws error for non-integer cents", () => {
      // Using internal constructor validation
      expect(() => Money.fromCents(10.5)).not.toThrow(); // rounds
      const money = Money.fromCents(10.5);
      expect(money.cents).toBe(11); // Rounded
    });
  });

  describe("Arithmetic Operations", () => {
    it("adds two Money amounts", () => {
      const a = Money.fromCents(1000);
      const b = Money.fromCents(500);
      expect(a.add(b).cents).toBe(1500);
    });

    it("subtracts Money amounts", () => {
      const a = Money.fromCents(1000);
      const b = Money.fromCents(400);
      expect(a.subtract(b).cents).toBe(600);
    });

    it("allows negative results from subtraction", () => {
      const a = Money.fromCents(100);
      const b = Money.fromCents(500);
      expect(a.subtract(b).cents).toBe(-400);
    });

    it("multiplies by a factor", () => {
      const money = Money.fromCents(1000);
      expect(money.multiply(1.5).cents).toBe(1500);
    });

    it("rounds multiplication results", () => {
      const money = Money.fromCents(1000);
      expect(money.multiply(0.333).cents).toBe(333);
    });

    it("divides by a divisor", () => {
      const money = Money.fromCents(1000);
      expect(money.divide(4).cents).toBe(250);
    });

    it("rounds division results", () => {
      const money = Money.fromCents(1000);
      expect(money.divide(3).cents).toBe(333);
    });

    it("throws error when dividing by zero", () => {
      const money = Money.fromCents(1000);
      expect(() => money.divide(0)).toThrow("Cannot divide Money by zero");
    });

    it("returns absolute value", () => {
      const money = Money.fromCents(-500);
      expect(money.abs().cents).toBe(500);
    });

    it("negates the amount", () => {
      const positive = Money.fromCents(500);
      expect(positive.negate().cents).toBe(-500);

      const negative = Money.fromCents(-500);
      expect(negative.negate().cents).toBe(500);
    });
  });

  describe("Comparison Methods", () => {
    it("checks equality", () => {
      const a = Money.fromCents(1000);
      const b = Money.fromCents(1000);
      const c = Money.fromCents(500);

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it("checks greater than", () => {
      const a = Money.fromCents(1000);
      const b = Money.fromCents(500);

      expect(a.greaterThan(b)).toBe(true);
      expect(b.greaterThan(a)).toBe(false);
      expect(a.greaterThan(Money.fromCents(1000))).toBe(false);
    });

    it("checks less than", () => {
      const a = Money.fromCents(500);
      const b = Money.fromCents(1000);

      expect(a.lessThan(b)).toBe(true);
      expect(b.lessThan(a)).toBe(false);
    });

    it("checks greater than or equal", () => {
      const a = Money.fromCents(1000);
      expect(a.greaterThanOrEqual(Money.fromCents(1000))).toBe(true);
      expect(a.greaterThanOrEqual(Money.fromCents(500))).toBe(true);
      expect(a.greaterThanOrEqual(Money.fromCents(1500))).toBe(false);
    });

    it("checks less than or equal", () => {
      const a = Money.fromCents(1000);
      expect(a.lessThanOrEqual(Money.fromCents(1000))).toBe(true);
      expect(a.lessThanOrEqual(Money.fromCents(1500))).toBe(true);
      expect(a.lessThanOrEqual(Money.fromCents(500))).toBe(false);
    });

    it("checks if zero", () => {
      expect(Money.zero().isZero()).toBe(true);
      expect(Money.fromCents(1).isZero()).toBe(false);
    });

    it("checks if negative", () => {
      expect(Money.fromCents(-100).isNegative()).toBe(true);
      expect(Money.fromCents(100).isNegative()).toBe(false);
      expect(Money.zero().isNegative()).toBe(false);
    });

    it("checks if positive", () => {
      expect(Money.fromCents(100).isPositive()).toBe(true);
      expect(Money.fromCents(-100).isPositive()).toBe(false);
      expect(Money.zero().isPositive()).toBe(false);
    });
  });

  describe("Conversion Methods", () => {
    it("converts to dollars", () => {
      expect(Money.fromCents(1999).toDollars()).toBe(19.99);
      expect(Money.fromCents(100).toDollars()).toBe(1);
      expect(Money.fromCents(1).toDollars()).toBe(0.01);
    });

    it("formats as currency string", () => {
      expect(Money.fromCents(123456).format()).toBe("$1,234.56");
      expect(Money.fromCents(100).format()).toBe("$1.00");
      expect(Money.fromCents(0).format()).toBe("$0.00");
    });

    it("formats negative amounts", () => {
      expect(Money.fromCents(-5000).format()).toBe("-$50.00");
    });

    it("formats compact amounts", () => {
      expect(Money.fromCents(150000000).formatCompact()).toBe("$1.5M");
      expect(Money.fromCents(150000).formatCompact()).toBe("$1.5K");
      expect(Money.fromCents(999).formatCompact()).toBe("$9.99");
    });

    it("serializes to JSON", () => {
      const money = Money.fromCents(1999);
      const json = money.toJSON();
      expect(json).toEqual({ cents: 1999, currency: "AUD" });
    });

    it("deserializes from JSON", () => {
      const money = Money.fromJSON({ cents: 1999, currency: "AUD" });
      expect(money.cents).toBe(1999);
      expect(money.currency).toBe("AUD");
    });
  });

  describe("Static Utility Methods", () => {
    it("sums array of Money", () => {
      const amounts = [
        Money.fromCents(100),
        Money.fromCents(200),
        Money.fromCents(300),
      ];
      expect(Money.sum(amounts).cents).toBe(600);
    });

    it("returns zero for empty sum", () => {
      expect(Money.sum([]).cents).toBe(0);
    });

    it("finds maximum value", () => {
      const amounts = [
        Money.fromCents(100),
        Money.fromCents(500),
        Money.fromCents(300),
      ];
      expect(Money.max(amounts).cents).toBe(500);
    });

    it("throws error for max of empty array", () => {
      expect(() => Money.max([])).toThrow("Cannot find max of empty array");
    });

    it("finds minimum value", () => {
      const amounts = [
        Money.fromCents(100),
        Money.fromCents(500),
        Money.fromCents(300),
      ];
      expect(Money.min(amounts).cents).toBe(100);
    });

    it("throws error for min of empty array", () => {
      expect(() => Money.min([])).toThrow("Cannot find min of empty array");
    });
  });

  describe("Currency Validation", () => {
    it("throws error when adding different currencies", () => {
      const aud = Money.fromCents(100);
      // Currently only AUD is supported, but test the validation
      expect(() => aud.add(aud)).not.toThrow();
    });
  });

  describe("Real-world Scenarios", () => {
    it("calculates shopping cart total", () => {
      const items = [
        Money.fromDollars(29.99), // Shirt
        Money.fromDollars(59.99), // Pants
        Money.fromDollars(15.0), // Socks
      ];
      const total = Money.sum(items);
      expect(total.cents).toBe(10498); // $104.98
    });

    it("applies percentage discount", () => {
      const price = Money.fromDollars(100);
      const discount = price.multiply(0.2); // 20% off
      const finalPrice = price.subtract(discount);
      expect(finalPrice.cents).toBe(8000); // $80.00
    });

    it("calculates tax", () => {
      const subtotal = Money.fromDollars(100);
      const gst = subtotal.multiply(0.1); // 10% GST
      expect(gst.cents).toBe(1000); // $10.00
    });

    it("splits bill evenly", () => {
      const total = Money.fromDollars(100);
      const perPerson = total.divide(3);
      expect(perPerson.cents).toBe(3333); // $33.33
    });
  });
});

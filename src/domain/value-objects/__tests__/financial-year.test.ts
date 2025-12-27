import { describe, it, expect } from "vitest";
import { FinancialYear } from "../financial-year";

describe("FinancialYear", () => {
  describe("Factory Methods", () => {
    it("creates current financial year", () => {
      const fy = FinancialYear.current();
      expect(fy.value).toMatch(/^\d{4}-\d{2}$/);
    });

    it("creates financial year from date in second half (Jul-Dec)", () => {
      const date = new Date(2024, 7, 15); // August 15, 2024
      const fy = FinancialYear.fromDate(date);
      expect(fy.value).toBe("2024-25");
    });

    it("creates financial year from date in first half (Jan-Jun)", () => {
      const date = new Date(2025, 2, 15); // March 15, 2025
      const fy = FinancialYear.fromDate(date);
      expect(fy.value).toBe("2024-25");
    });

    it("parses valid financial year string", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.value).toBe("2024-25");
    });

    it("throws error for invalid format", () => {
      expect(() => FinancialYear.parse("2024")).toThrow("Invalid financial year format");
      expect(() => FinancialYear.parse("24-25")).toThrow("Invalid financial year format");
      expect(() => FinancialYear.parse("2024/25")).toThrow("Invalid financial year format");
    });

    it("throws error for non-consecutive years", () => {
      expect(() => FinancialYear.parse("2024-26")).toThrow("Years must be consecutive");
      expect(() => FinancialYear.parse("2024-23")).toThrow("Years must be consecutive");
    });

    it("tryParse returns null for invalid input", () => {
      expect(FinancialYear.tryParse("invalid")).toBeNull();
      expect(FinancialYear.tryParse("2024-26")).toBeNull();
    });

    it("tryParse returns FinancialYear for valid input", () => {
      const fy = FinancialYear.tryParse("2024-25");
      expect(fy).not.toBeNull();
      expect(fy?.value).toBe("2024-25");
    });

    it("creates from start year", () => {
      const fy = FinancialYear.fromStartYear(2024);
      expect(fy.value).toBe("2024-25");
    });

    it("handles century boundary", () => {
      const fy = FinancialYear.fromStartYear(2099);
      expect(fy.value).toBe("2099-00");
    });
  });

  describe("Properties", () => {
    it("returns correct start year", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.startYear).toBe(2024);
    });

    it("returns correct end year", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.endYear).toBe(2025);
    });

    it("returns correct start date (July 1)", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.startDate.getFullYear()).toBe(2024);
      expect(fy.startDate.getMonth()).toBe(6); // July (0-indexed)
      expect(fy.startDate.getDate()).toBe(1);
    });

    it("returns correct end date (June 30)", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.endDate.getFullYear()).toBe(2025);
      expect(fy.endDate.getMonth()).toBe(5); // June (0-indexed)
      expect(fy.endDate.getDate()).toBe(30);
    });
  });

  describe("Query Methods", () => {
    it("checks if date is contained", () => {
      const fy = FinancialYear.parse("2024-25");

      // Start of FY
      expect(fy.contains(new Date(2024, 6, 1))).toBe(true);

      // Middle of FY
      expect(fy.contains(new Date(2024, 11, 15))).toBe(true);
      expect(fy.contains(new Date(2025, 2, 15))).toBe(true);

      // End of FY
      expect(fy.contains(new Date(2025, 5, 30))).toBe(true);

      // Before FY
      expect(fy.contains(new Date(2024, 5, 30))).toBe(false);

      // After FY
      expect(fy.contains(new Date(2025, 6, 1))).toBe(false);
    });

    it("checks equality", () => {
      const a = FinancialYear.parse("2024-25");
      const b = FinancialYear.parse("2024-25");
      const c = FinancialYear.parse("2023-24");

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it("checks if before another FY", () => {
      const a = FinancialYear.parse("2023-24");
      const b = FinancialYear.parse("2024-25");

      expect(a.isBefore(b)).toBe(true);
      expect(b.isBefore(a)).toBe(false);
      expect(a.isBefore(a)).toBe(false);
    });

    it("checks if after another FY", () => {
      const a = FinancialYear.parse("2024-25");
      const b = FinancialYear.parse("2023-24");

      expect(a.isAfter(b)).toBe(true);
      expect(b.isAfter(a)).toBe(false);
    });
  });

  describe("Navigation Methods", () => {
    it("gets next financial year", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.next().value).toBe("2025-26");
    });

    it("gets previous financial year", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.previous().value).toBe("2023-24");
    });

    it("offsets by positive years", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.offset(2).value).toBe("2026-27");
    });

    it("offsets by negative years", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.offset(-2).value).toBe("2022-23");
    });

    it("offset by zero returns same FY", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.offset(0).value).toBe("2024-25");
    });
  });

  describe("Quarter Methods", () => {
    it("returns all four quarters", () => {
      const fy = FinancialYear.parse("2024-25");
      const quarters = fy.getQuarters();

      expect(quarters).toHaveLength(4);

      // Q1: Jul-Sep 2024
      expect(quarters[0].quarter).toBe(1);
      expect(quarters[0].label).toBe("Q1 (Jul-Sep)");
      expect(quarters[0].start.getMonth()).toBe(6);
      expect(quarters[0].end.getMonth()).toBe(8);

      // Q2: Oct-Dec 2024
      expect(quarters[1].quarter).toBe(2);
      expect(quarters[1].start.getMonth()).toBe(9);

      // Q3: Jan-Mar 2025
      expect(quarters[2].quarter).toBe(3);
      expect(quarters[2].start.getFullYear()).toBe(2025);
      expect(quarters[2].start.getMonth()).toBe(0);

      // Q4: Apr-Jun 2025
      expect(quarters[3].quarter).toBe(4);
      expect(quarters[3].end.getMonth()).toBe(5);
    });

    it("gets quarter for date", () => {
      const fy = FinancialYear.parse("2024-25");

      expect(fy.getQuarterForDate(new Date(2024, 7, 15))).toBe(1); // August
      expect(fy.getQuarterForDate(new Date(2024, 10, 15))).toBe(2); // November
      expect(fy.getQuarterForDate(new Date(2025, 1, 15))).toBe(3); // February
      expect(fy.getQuarterForDate(new Date(2025, 4, 15))).toBe(4); // May

      // Outside FY
      expect(fy.getQuarterForDate(new Date(2023, 7, 15))).toBeNull();
    });
  });

  describe("Month Methods", () => {
    it("returns all 12 months in order", () => {
      const fy = FinancialYear.parse("2024-25");
      const months = fy.getMonths();

      expect(months).toHaveLength(12);

      // First month should be July 2024
      expect(months[0].month).toBe(6);
      expect(months[0].year).toBe(2024);
      expect(months[0].label).toBe("Jul 2024");

      // Last month should be June 2025
      expect(months[11].month).toBe(5);
      expect(months[11].year).toBe(2025);
      expect(months[11].label).toBe("Jun 2025");
    });
  });

  describe("Formatting Methods", () => {
    it("formats as FY string", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.format()).toBe("FY 2024-25");
    });

    it("converts to string", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.toString()).toBe("2024-25");
    });

    it("formats date range", () => {
      const fy = FinancialYear.parse("2024-25");
      const range = fy.formatDateRange();
      // Format depends on locale, so just check key parts
      expect(range).toContain("2024");
      expect(range).toContain("2025");
    });

    it("serializes to JSON", () => {
      const fy = FinancialYear.parse("2024-25");
      expect(fy.toJSON()).toBe("2024-25");
    });
  });

  describe("Static Utility Methods", () => {
    it("gets recent financial years", () => {
      const years = FinancialYear.getRecentYears(3);

      expect(years).toHaveLength(3);
      // First should be current
      expect(years[0].equals(FinancialYear.current())).toBe(true);
      // Each subsequent should be one year earlier
      expect(years[1].equals(years[0].previous())).toBe(true);
      expect(years[2].equals(years[1].previous())).toBe(true);
    });

    it("gets range of financial years", () => {
      const start = FinancialYear.parse("2022-23");
      const end = FinancialYear.parse("2024-25");
      const range = FinancialYear.range(start, end);

      expect(range).toHaveLength(3);
      expect(range[0].value).toBe("2022-23");
      expect(range[1].value).toBe("2023-24");
      expect(range[2].value).toBe("2024-25");
    });

    it("range with same start and end returns single FY", () => {
      const fy = FinancialYear.parse("2024-25");
      const range = FinancialYear.range(fy, fy);

      expect(range).toHaveLength(1);
      expect(range[0].value).toBe("2024-25");
    });
  });

  describe("Edge Cases", () => {
    it("handles leap year correctly", () => {
      const fy = FinancialYear.parse("2023-24"); // 2024 is a leap year
      const febLeapDay = new Date(2024, 1, 29);
      expect(fy.contains(febLeapDay)).toBe(true);
    });

    it("handles year 2000 correctly", () => {
      const fy = FinancialYear.fromStartYear(1999);
      expect(fy.value).toBe("1999-00");
      expect(fy.endYear).toBe(2000);
    });

    it("handles boundary dates correctly", () => {
      const fy = FinancialYear.parse("2024-25");

      // June 30 at end of day should be in FY
      const lastMoment = new Date(2025, 5, 30, 23, 59, 59);
      expect(fy.contains(lastMoment)).toBe(true);

      // July 1 at start of day should be in next FY
      const nextFYStart = new Date(2025, 6, 1, 0, 0, 0);
      expect(fy.contains(nextFYStart)).toBe(false);
    });
  });
});

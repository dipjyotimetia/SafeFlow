import { describe, expect, it } from "vitest";
import { calculateFutureValue } from "../projections";

describe("projections", () => {
  it("handles negative balance with zero contribution", () => {
    const result = calculateFutureValue(-500000, 0, 0.07, 12);
    expect(result).toBe(-500000);
  });

  it("handles negative balance with negative contribution", () => {
    const result = calculateFutureValue(-500000, -10000, 0.07, 12);
    expect(result).toBe(-620000);
  });
});

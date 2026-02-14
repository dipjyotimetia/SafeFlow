/**
 * Loan Calculator for Property Investments
 *
 * Calculates loan repayments, interest, and amortization schedules.
 * Supports interest-only and principal + interest loan types.
 *
 * All amounts in cents (integers) to avoid floating-point issues.
 * Uses Decimal.js for precise financial calculations.
 */

import Decimal from "decimal.js";
import type { LoanType, ExpenseFrequency } from "@/types";

export interface LoanRepaymentResult {
  repaymentAmount: number; // cents
  principalPortion: number; // cents
  interestPortion: number; // cents
  frequency: ExpenseFrequency;
}

export interface AmortizationEntry {
  period: number;
  payment: number; // cents
  principal: number; // cents
  interest: number; // cents
  balance: number; // cents
}

/**
 * Calculate monthly interest rate from annual rate
 *
 * @param annualRate - Annual interest rate (e.g., 5.75 for 5.75%)
 * @returns Monthly rate as Decimal (e.g., 0.00479166...)
 */
export function getMonthlyRate(annualRate: number): Decimal {
  return new Decimal(annualRate).dividedBy(100).dividedBy(12);
}

/**
 * Calculate monthly interest rate from annual rate (as number for legacy compatibility)
 *
 * @param annualRate - Annual interest rate (e.g., 5.75 for 5.75%)
 * @returns Monthly rate as number
 */
export function getMonthlyRateNumber(annualRate: number): number {
  return getMonthlyRate(annualRate).toNumber();
}

/**
 * Calculate interest-only repayment
 *
 * @param loanAmount - Loan balance in cents
 * @param annualRate - Annual interest rate (e.g., 5.75)
 * @param frequency - Repayment frequency
 * @returns Repayment amount in cents
 */
export function calculateInterestOnlyRepayment(
  loanAmount: number,
  annualRate: number,
  frequency: ExpenseFrequency = "monthly"
): number {
  const loan = new Decimal(loanAmount);
  const rate = new Decimal(annualRate);
  const annualInterest = loan.times(rate).dividedBy(100);

  let result: Decimal;
  switch (frequency) {
    case "weekly":
      result = annualInterest.dividedBy(52);
      break;
    case "monthly":
      result = annualInterest.dividedBy(12);
      break;
    case "quarterly":
      result = annualInterest.dividedBy(4);
      break;
    case "annually":
      result = annualInterest;
      break;
  }

  return result.round().toNumber();
}

/**
 * Calculate principal + interest (P+I) repayment using standard amortization formula
 *
 * Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * Where: M = monthly payment, P = principal, r = monthly rate, n = number of payments
 *
 * @param loanAmount - Loan amount in cents
 * @param annualRate - Annual interest rate (e.g., 5.75)
 * @param loanTermMonths - Loan term in months
 * @param frequency - Repayment frequency (monthly calculations adjusted)
 * @returns Repayment amount in cents
 */
export function calculatePrincipalInterestRepayment(
  loanAmount: number,
  annualRate: number,
  loanTermMonths: number,
  frequency: ExpenseFrequency = "monthly"
): number {
  if (annualRate === 0) {
    // No interest - just divide principal by number of payments
    return new Decimal(loanAmount).dividedBy(loanTermMonths).round().toNumber();
  }

  const principal = new Decimal(loanAmount);
  const monthlyRate = getMonthlyRate(annualRate);
  const numPayments = loanTermMonths;

  // Standard mortgage formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
  const onePlusR = monthlyRate.plus(1);
  const onePlusRPowN = onePlusR.pow(numPayments);
  const numerator = monthlyRate.times(onePlusRPowN);
  const denominator = onePlusRPowN.minus(1);
  const monthlyPayment = principal.times(numerator.dividedBy(denominator));

  // Convert to requested frequency
  let result: Decimal;
  switch (frequency) {
    case "weekly":
      // Weekly payments (52 per year vs 12 monthly)
      result = monthlyPayment.times(12).dividedBy(52);
      break;
    case "monthly":
      result = monthlyPayment;
      break;
    case "quarterly":
      result = monthlyPayment.times(3);
      break;
    case "annually":
      result = monthlyPayment.times(12);
      break;
  }

  return result.round().toNumber();
}

/**
 * Calculate loan repayment based on loan type
 */
export function calculateRepayment(
  loanAmount: number,
  annualRate: number,
  loanTermMonths: number,
  loanType: LoanType,
  frequency: ExpenseFrequency = "monthly"
): LoanRepaymentResult {
  if (loanType === "interest-only") {
    const interest = calculateInterestOnlyRepayment(
      loanAmount,
      annualRate,
      frequency
    );
    return {
      repaymentAmount: interest,
      principalPortion: 0,
      interestPortion: interest,
      frequency,
    };
  }

  // P+I or other types
  const totalRepayment = calculatePrincipalInterestRepayment(
    loanAmount,
    annualRate,
    loanTermMonths,
    frequency
  );

  // Calculate interest portion for first payment
  const interestPortion = calculateInterestOnlyRepayment(
    loanAmount,
    annualRate,
    frequency
  );
  const principalPortion = totalRepayment - interestPortion;

  return {
    repaymentAmount: totalRepayment,
    principalPortion,
    interestPortion,
    frequency,
  };
}

/**
 * Calculate total interest paid over the life of the loan
 *
 * @param loanAmount - Loan amount in cents
 * @param annualRate - Annual interest rate
 * @param loanTermMonths - Loan term in months
 * @param interestOnlyMonths - Initial interest-only period in months
 * @returns Total interest in cents
 */
export function calculateTotalInterest(
  loanAmount: number,
  annualRate: number,
  loanTermMonths: number,
  interestOnlyMonths: number = 0
): number {
  // Interest during IO period
  const monthlyIOInterest = calculateInterestOnlyRepayment(
    loanAmount,
    annualRate,
    "monthly"
  );
  const totalIOInterest = monthlyIOInterest * interestOnlyMonths;

  // P+I period
  const piMonths = loanTermMonths - interestOnlyMonths;
  if (piMonths <= 0) {
    return totalIOInterest;
  }

  const monthlyPIPayment = calculatePrincipalInterestRepayment(
    loanAmount,
    annualRate,
    piMonths,
    "monthly"
  );
  const totalPIPayments = monthlyPIPayment * piMonths;
  const totalPIInterest = totalPIPayments - loanAmount;

  return totalIOInterest + totalPIInterest;
}

/**
 * Generate amortization schedule
 *
 * @param loanAmount - Loan amount in cents
 * @param annualRate - Annual interest rate
 * @param loanTermMonths - Loan term in months
 * @param interestOnlyMonths - Initial interest-only period
 * @returns Array of amortization entries
 */
export function generateAmortizationSchedule(
  loanAmount: number,
  annualRate: number,
  loanTermMonths: number,
  interestOnlyMonths: number = 0
): AmortizationEntry[] {
  const schedule: AmortizationEntry[] = [];
  let balance = new Decimal(loanAmount);
  const monthlyRate = getMonthlyRate(annualRate);

  // Interest-only period
  for (let i = 1; i <= interestOnlyMonths; i++) {
    const interest = balance.times(monthlyRate).round().toNumber();
    schedule.push({
      period: i,
      payment: interest,
      principal: 0,
      interest,
      balance: balance.toNumber(),
    });
  }

  // P+I period
  const piMonths = loanTermMonths - interestOnlyMonths;
  if (piMonths > 0) {
    const monthlyPayment = calculatePrincipalInterestRepayment(
      balance.toNumber(),
      annualRate,
      piMonths,
      "monthly"
    );

    for (let i = 1; i <= piMonths; i++) {
      const interest = balance.times(monthlyRate).round().toNumber();
      const principal = Math.min(monthlyPayment - interest, balance.toNumber());
      balance = Decimal.max(0, balance.minus(principal));

      schedule.push({
        period: interestOnlyMonths + i,
        payment: principal + interest,
        principal,
        interest,
        balance: balance.toNumber(),
      });
    }
  }

  return schedule;
}

/**
 * Calculate loan balance after a given number of months
 */
export function calculateBalanceAfterMonths(
  loanAmount: number,
  annualRate: number,
  loanTermMonths: number,
  monthsElapsed: number,
  interestOnlyMonths: number = 0
): number {
  if (monthsElapsed <= interestOnlyMonths) {
    return loanAmount; // No principal paid during IO period
  }

  const piMonthsElapsed = monthsElapsed - interestOnlyMonths;
  const piTotalMonths = loanTermMonths - interestOnlyMonths;
  if (piTotalMonths <= 0) {
    return loanAmount;
  }
  if (annualRate === 0) {
    const monthlyPrincipal = new Decimal(loanAmount).dividedBy(piTotalMonths);
    const remaining = new Decimal(loanAmount).minus(
      monthlyPrincipal.times(piMonthsElapsed)
    );
    return Decimal.max(0, remaining.round()).toNumber();
  }
  const monthlyRate = getMonthlyRate(annualRate);

  // Calculate remaining balance using formula
  const monthlyPayment = new Decimal(calculatePrincipalInterestRepayment(
    loanAmount,
    annualRate,
    piTotalMonths,
    "monthly"
  ));

  const principal = new Decimal(loanAmount);

  // Balance = P * (1+r)^n - M * [(1+r)^n - 1] / r
  const onePlusR = monthlyRate.plus(1);
  const factor = onePlusR.pow(piMonthsElapsed);
  const balance = principal.times(factor).minus(
    monthlyPayment.times(factor.minus(1)).dividedBy(monthlyRate)
  );

  return Decimal.max(0, balance.round()).toNumber();
}

/**
 * Calculate how much extra principal paid with additional payments
 */
export function calculateExtraPaymentImpact(
  loanAmount: number,
  annualRate: number,
  loanTermMonths: number,
  extraMonthlyPayment: number
): {
  originalTotalInterest: number;
  newTotalInterest: number;
  interestSaved: number;
  monthsSaved: number;
} {
  // Original loan
  const originalInterest = calculateTotalInterest(
    loanAmount,
    annualRate,
    loanTermMonths
  );

  if (annualRate === 0) {
    const baseMonthlyPayment = calculatePrincipalInterestRepayment(
      loanAmount,
      annualRate,
      loanTermMonths,
      "monthly"
    );
    const newMonthlyPayment = baseMonthlyPayment + extraMonthlyPayment;
    if (newMonthlyPayment <= 0) {
      return {
        originalTotalInterest: originalInterest,
        newTotalInterest: originalInterest,
        interestSaved: 0,
        monthsSaved: 0,
      };
    }
    const newTermMonths = Math.ceil(loanAmount / newMonthlyPayment);
    return {
      originalTotalInterest: originalInterest,
      newTotalInterest: 0,
      interestSaved: originalInterest,
      monthsSaved: loanTermMonths - newTermMonths,
    };
  }

  // Calculate new loan term with extra payments
  const monthlyRate = getMonthlyRate(annualRate);
  const baseMonthlyPayment = calculatePrincipalInterestRepayment(
    loanAmount,
    annualRate,
    loanTermMonths,
    "monthly"
  );
  const newMonthlyPayment = new Decimal(baseMonthlyPayment + extraMonthlyPayment);
  const principal = new Decimal(loanAmount);

  // Calculate new term: n = -log(1 - P*r/M) / log(1+r)
  const innerValue = new Decimal(1).minus(
    principal.times(monthlyRate).dividedBy(newMonthlyPayment)
  );
  if (innerValue.lte(0)) {
    return {
      originalTotalInterest: originalInterest,
      newTotalInterest: originalInterest,
      interestSaved: 0,
      monthsSaved: 0,
    };
  }
  const onePlusR = monthlyRate.plus(1);
  const newTermMonths = Math.ceil(
    innerValue.ln().negated().dividedBy(onePlusR.ln()).toNumber()
  );

  const newInterest = calculateTotalInterest(
    loanAmount,
    annualRate,
    newTermMonths
  );

  return {
    originalTotalInterest: originalInterest,
    newTotalInterest: newInterest,
    interestSaved: originalInterest - newInterest,
    monthsSaved: loanTermMonths - newTermMonths,
  };
}

/**
 * Calculate effective interest rate after offset account
 */
export function calculateEffectiveRateWithOffset(
  loanAmount: number,
  offsetBalance: number,
  nominalRate: number
): {
  effectiveBalance: number;
  effectiveRate: number;
  monthlySavings: number;
} {
  const effectiveBalance = Math.max(0, loanAmount - offsetBalance);
  const effectiveRate =
    loanAmount > 0 ? (effectiveBalance / loanAmount) * nominalRate : 0;

  const normalInterest = calculateInterestOnlyRepayment(
    loanAmount,
    nominalRate,
    "monthly"
  );
  const reducedInterest = calculateInterestOnlyRepayment(
    effectiveBalance,
    nominalRate,
    "monthly"
  );

  return {
    effectiveBalance,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    monthlySavings: normalInterest - reducedInterest,
  };
}

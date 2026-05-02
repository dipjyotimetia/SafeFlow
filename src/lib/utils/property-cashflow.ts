/**
 * Property Cashflow Calculator
 *
 * Calculates comprehensive cashflow analysis for investment properties:
 * - Gross and net rental income
 * - Operating expenses
 * - Financing costs
 * - Tax implications (including negative gearing)
 * - Before and after-tax cashflow
 *
 * All amounts in cents (integers) to avoid floating-point issues.
 */

import type { PropertyAssumptions, PropertyCalculatedResults } from "@/types";
import { calculateStampDuty } from "./stamp-duty";
import { calculateLMI, calculateLVR } from "./lmi";
import {
  calculateInterestOnlyRepayment,
  calculatePrincipalInterestRepayment,
  generateAmortizationSchedule,
} from "./loan-calculator";
import {
  calculateGrossYield,
  calculateNetYield,
  calculateCashOnCashReturn,
} from "./property-yield";

export interface CashflowBreakdown {
  // Income
  grossRentalIncome: number;
  vacancyAllowance: number;
  netRentalIncome: number;

  // Expenses (operating)
  councilRates: number;
  waterRates: number;
  strataFees: number;
  buildingInsurance: number;
  landlordInsurance: number;
  propertyManagement: number;
  maintenanceRepairs: number;
  poolMaintenance: number;
  bankFees: number;
  totalOperatingExpenses: number;

  // Financing
  interestPayments: number;

  // Tax items
  depreciation: number;

  // Cashflow
  cashflowBeforeTax: number;
  taxableIncome: number; // Can be negative for negatively geared
  taxBenefit: number; // Positive means tax refund from negative gearing
  cashflowAfterTax: number;
}

interface LoanRepaymentBreakdown {
  monthlyLoanRepayment: number;
  annualLoanRepayment: number;
  annualPrincipalRepayment: number;
  monthlyInterestPayment: number;
  annualInterestPayment: number;
}

/**
 * Calculate property management fee from rent
 *
 * @param annualRent - Annual rental income in cents
 * @param managementPercent - Management fee percentage (e.g., 8.5)
 * @param includesGst - Whether percentage includes GST (default true)
 * @returns Annual management fee in cents
 */
export function calculateManagementFee(
  annualRent: number,
  managementPercent: number,
  includesGst: boolean = true
): number {
  const fee = Math.round((annualRent * managementPercent) / 100);
  // If the quoted rate includes GST but we need the GST-exclusive component
  // (e.g., for tax deduction purposes), divide by 1.1
  if (!includesGst) {
    return Math.round(fee / 1.1);
  }
  return fee;
}

/**
 * Calculate tax benefit from negative gearing
 *
 * When a property makes a loss, the loss can offset other income,
 * resulting in a tax refund at the investor's marginal tax rate.
 *
 * @param taxableLoss - Taxable loss (negative taxable income) in cents
 * @param marginalTaxRate - Marginal tax rate percentage (e.g., 37)
 * @returns Tax benefit in cents
 */
export function calculateNegativeGearingBenefit(
  taxableLoss: number,
  marginalTaxRate: number
): number {
  if (taxableLoss >= 0) return 0; // No loss, no benefit
  const benefit = Math.round((Math.abs(taxableLoss) * marginalTaxRate) / 100);
  return benefit;
}

/**
 * Calculate comprehensive cashflow breakdown
 */
export function calculateCashflowBreakdown(
  annualRentalIncome: number,
  vacancyPercent: number,
  expenses: {
    councilRates?: number;
    waterRates?: number;
    strataFees?: number;
    buildingInsurance?: number;
    landlordInsurance?: number;
    propertyManagementPercent?: number;
    maintenance?: number;
    poolMaintenance?: number;
    bankFees?: number;
  },
  annualInterestPayments: number,
  annualDepreciation: number,
  marginalTaxRate: number
): CashflowBreakdown {
  // Income after vacancy
  const vacancyAllowance = Math.round(
    (annualRentalIncome * vacancyPercent) / 100
  );
  const netRentalIncome = annualRentalIncome - vacancyAllowance;

  // Property management fee
  const propertyManagement = expenses.propertyManagementPercent
    ? calculateManagementFee(
        netRentalIncome,
        expenses.propertyManagementPercent
      )
    : 0;

  // Total operating expenses
  const councilRates = expenses.councilRates || 0;
  const waterRates = expenses.waterRates || 0;
  const strataFees = expenses.strataFees || 0;
  const buildingInsurance = expenses.buildingInsurance || 0;
  const landlordInsurance = expenses.landlordInsurance || 0;
  const maintenance = expenses.maintenance || 0;
  const poolMaintenance = expenses.poolMaintenance || 0;
  const bankFees = expenses.bankFees || 0;

  const totalOperatingExpenses =
    councilRates +
    waterRates +
    strataFees +
    buildingInsurance +
    landlordInsurance +
    propertyManagement +
    maintenance +
    poolMaintenance +
    bankFees;

  // Cashflow before tax (not including depreciation - it's non-cash)
  const cashflowBeforeTax =
    netRentalIncome - totalOperatingExpenses - annualInterestPayments;

  // Taxable income includes depreciation as a deduction
  const taxableIncome =
    netRentalIncome -
    totalOperatingExpenses -
    annualInterestPayments -
    annualDepreciation;

  // Calculate tax benefit if negatively geared
  const taxBenefit = calculateNegativeGearingBenefit(
    taxableIncome,
    marginalTaxRate
  );

  // Cashflow after tax = Before tax cashflow + tax benefit
  // (If positively geared, tax would be payable, reducing cashflow)
  const cashflowAfterTax =
    taxableIncome >= 0
      ? cashflowBeforeTax - Math.round((taxableIncome * marginalTaxRate) / 100)
      : cashflowBeforeTax + taxBenefit;

  return {
    grossRentalIncome: annualRentalIncome,
    vacancyAllowance,
    netRentalIncome,
    councilRates,
    waterRates,
    strataFees,
    buildingInsurance,
    landlordInsurance,
    propertyManagement,
    maintenanceRepairs: maintenance,
    poolMaintenance,
    bankFees,
    totalOperatingExpenses,
    interestPayments: annualInterestPayments,
    depreciation: annualDepreciation,
    cashflowBeforeTax,
    taxableIncome,
    taxBenefit,
    cashflowAfterTax,
  };
}

function calculateLoanRepaymentBreakdown(
  loanAmount: number,
  interestRate: number,
  loanType: PropertyAssumptions["loanType"],
  loanTermYears: number
): LoanRepaymentBreakdown {
  if (loanAmount <= 0 || loanTermYears <= 0) {
    return {
      monthlyLoanRepayment: 0,
      annualLoanRepayment: 0,
      annualPrincipalRepayment: 0,
      monthlyInterestPayment: 0,
      annualInterestPayment: 0,
    };
  }

  if (loanType === "interest-only") {
    const annualInterestPayment = calculateInterestOnlyRepayment(
      loanAmount,
      interestRate,
      "annually"
    );

    return {
      monthlyLoanRepayment: Math.round(annualInterestPayment / 12),
      annualLoanRepayment: annualInterestPayment,
      annualPrincipalRepayment: 0,
      monthlyInterestPayment: Math.round(annualInterestPayment / 12),
      annualInterestPayment,
    };
  }

  const loanTermMonths = loanTermYears * 12;
  const monthlyLoanRepayment = calculatePrincipalInterestRepayment(
    loanAmount,
    interestRate,
    loanTermMonths,
    "monthly"
  );
  const annualLoanRepayment = calculatePrincipalInterestRepayment(
    loanAmount,
    interestRate,
    loanTermMonths,
    "annually"
  );
  const firstYearSchedule = generateAmortizationSchedule(
    loanAmount,
    interestRate,
    loanTermMonths
  ).slice(0, 12);
  const annualInterestPayment = firstYearSchedule.reduce(
    (sum, entry) => sum + entry.interest,
    0
  );
  const annualPrincipalRepayment = firstYearSchedule.reduce(
    (sum, entry) => sum + entry.principal,
    0
  );

  return {
    monthlyLoanRepayment,
    annualLoanRepayment,
    annualPrincipalRepayment,
    monthlyInterestPayment: Math.round(annualInterestPayment / 12),
    annualInterestPayment,
  };
}

/**
 * Calculate complete property model from assumptions
 *
 * This is the main calculation function that takes all inputs
 * and returns comprehensive calculated results.
 */
export function calculatePropertyModel(
  assumptions: PropertyAssumptions
): PropertyCalculatedResults {
  const {
    purchasePrice,
    depositPercent,
    state,
    isFirstHomeBuyer,
    interestRate,
    weeklyRentLow,
    weeklyRentHigh,
    vacancyPercent,
    propertyManagementPercent,
    councilRatesAnnual,
    waterRatesAnnual,
    strataFeesAnnual,
    buildingInsuranceAnnual,
    landlordInsuranceAnnual,
    maintenanceAnnual,
    poolMaintenanceAnnual,
    bankFeesAnnual,
    marginalTaxRate,
    estimatedDepreciationYear1,
    legalFees: legalFeesOverride,
    lmiOverride,
    stampDutyOverride,
    buildingInspection,
    pestInspection,
    otherPurchaseCosts,
  } = assumptions;

  // Calculate deposit and loan
  const depositAmount = Math.round((purchasePrice * depositPercent) / 100);
  const loanAmountPreLMI = purchasePrice - depositAmount;

  // Calculate stamp duty
  const stampDutyResult = calculateStampDuty(
    purchasePrice,
    state,
    isFirstHomeBuyer,
    true // Investment property
  );
  const stampDuty = stampDutyOverride ?? stampDutyResult.stampDuty;
  const transferFee = stampDutyResult.transferFee;
  const mortgageRegistrationFee = stampDutyResult.mortgageRegistration;

  // Calculate LMI
  const lmiResult = calculateLMI(purchasePrice, loanAmountPreLMI);
  const lmiAmount = lmiOverride ?? lmiResult.lmiAmount;
  const loanAmountPostLMI = loanAmountPreLMI + lmiAmount; // LMI capitalized

  // Calculate LVR
  const lvr = calculateLVR(loanAmountPostLMI, purchasePrice);

  // Legal fees are user-entered to avoid hidden purchase-cost assumptions
  const legalFees = legalFeesOverride ?? 0;

  // Other purchase costs
  const otherCosts =
    (buildingInspection || 0) +
    (pestInspection || 0) +
    (otherPurchaseCosts || 0);

  // Total capital required
  const totalCapitalRequired =
    depositAmount +
    stampDuty +
    transferFee +
    mortgageRegistrationFee +
    legalFees +
    otherCosts;

  const {
    monthlyLoanRepayment,
    annualLoanRepayment,
    annualPrincipalRepayment,
    monthlyInterestPayment,
    annualInterestPayment,
  } = calculateLoanRepaymentBreakdown(
    loanAmountPostLMI,
    interestRate,
    assumptions.loanType,
    assumptions.loanTermYears
  );

  // Calculate annual rental income (low and high scenarios)
  const annualRentalIncomeLow = weeklyRentLow * 52;
  const annualRentalIncomeHigh = weeklyRentHigh * 52;

  // Apply vacancy allowance
  const vacancyDeductionLow = Math.round(
    (annualRentalIncomeLow * vacancyPercent) / 100
  );
  const vacancyDeductionHigh = Math.round(
    (annualRentalIncomeHigh * vacancyPercent) / 100
  );
  const annualRentalIncomeAfterVacancyLow =
    annualRentalIncomeLow - vacancyDeductionLow;
  const annualRentalIncomeAfterVacancyHigh =
    annualRentalIncomeHigh - vacancyDeductionHigh;

  // Calculate property management fees
  const managementFeeLow = calculateManagementFee(
    annualRentalIncomeAfterVacancyLow,
    propertyManagementPercent
  );
  const managementFeeHigh = calculateManagementFee(
    annualRentalIncomeAfterVacancyHigh,
    propertyManagementPercent
  );

  // Total operating expenses (excluding management which varies with rent)
  const fixedExpenses =
    councilRatesAnnual +
    waterRatesAnnual +
    (strataFeesAnnual || 0) +
    buildingInsuranceAnnual +
    landlordInsuranceAnnual +
    (maintenanceAnnual || 0) +
    (poolMaintenanceAnnual || 0) +
    (bankFeesAnnual || 0);

  const totalAnnualExpensesLow = fixedExpenses + managementFeeLow;
  const totalAnnualExpensesHigh = fixedExpenses + managementFeeHigh;

  // Use average for "total expenses" display
  const totalAnnualExpenses = Math.round(
    (totalAnnualExpensesLow + totalAnnualExpensesHigh) / 2
  );

  // Expenses breakdown
  const expensesBreakdown: Record<string, number> = {
    "council-rates": councilRatesAnnual,
    "water-rates": waterRatesAnnual,
    "strata-fees": strataFeesAnnual || 0,
    "building-insurance": buildingInsuranceAnnual,
    "landlord-insurance": landlordInsuranceAnnual,
    "property-management": Math.round((managementFeeLow + managementFeeHigh) / 2),
    maintenance: maintenanceAnnual || 0,
    "pool-maintenance": poolMaintenanceAnnual || 0,
    "bank-fees": bankFeesAnnual || 0,
    "loan-repayments": annualLoanRepayment,
  };

  // Yield calculations
  const grossYieldLow = calculateGrossYield(annualRentalIncomeLow, purchasePrice);
  const grossYieldHigh = calculateGrossYield(annualRentalIncomeHigh, purchasePrice);
  const netYieldLow = calculateNetYield(
    annualRentalIncomeAfterVacancyLow,
    totalAnnualExpensesLow,
    purchasePrice
  );
  const netYieldHigh = calculateNetYield(
    annualRentalIncomeAfterVacancyHigh,
    totalAnnualExpensesHigh,
    purchasePrice
  );

  // Cash position before tax (annual) — deducts full P+I (real cash impact).
  const cashPositionBeforeTaxAnnuallyLow =
    annualRentalIncomeAfterVacancyLow -
    totalAnnualExpensesLow -
    annualLoanRepayment;
  const cashPositionBeforeTaxAnnuallyHigh =
    annualRentalIncomeAfterVacancyHigh -
    totalAnnualExpensesHigh -
    annualLoanRepayment;

  const cashPositionBeforeTaxWeeklyLow = Math.round(
    cashPositionBeforeTaxAnnuallyLow / 52
  );
  const cashPositionBeforeTaxWeeklyHigh = Math.round(
    cashPositionBeforeTaxAnnuallyHigh / 52
  );
  const cashPositionBeforeTaxMonthlyLow = Math.round(
    cashPositionBeforeTaxAnnuallyLow / 12
  );
  const cashPositionBeforeTaxMonthlyHigh = Math.round(
    cashPositionBeforeTaxAnnuallyHigh / 12
  );

  // Taxable cashflow before tax (annual) — deducts interest only. Used for
  // tax-position modelling; differs from cash position by the principal
  // portion of repayments.
  const taxableCashflowBeforeTaxAnnuallyLow =
    annualRentalIncomeAfterVacancyLow -
    totalAnnualExpensesLow -
    annualInterestPayment;
  const taxableCashflowBeforeTaxAnnuallyHigh =
    annualRentalIncomeAfterVacancyHigh -
    totalAnnualExpensesHigh -
    annualInterestPayment;

  const taxableCashflowBeforeTaxWeeklyLow = Math.round(
    taxableCashflowBeforeTaxAnnuallyLow / 52
  );
  const taxableCashflowBeforeTaxWeeklyHigh = Math.round(
    taxableCashflowBeforeTaxAnnuallyHigh / 52
  );
  const taxableCashflowBeforeTaxMonthlyLow = Math.round(
    taxableCashflowBeforeTaxAnnuallyLow / 12
  );
  const taxableCashflowBeforeTaxMonthlyHigh = Math.round(
    taxableCashflowBeforeTaxAnnuallyHigh / 12
  );

  // Depreciation
  const estimatedDepreciation = estimatedDepreciationYear1 || 0;

  // Taxable income uses deductible interest only; principal repayments are not deductible
  const taxableIncomeLow =
    annualRentalIncomeAfterVacancyLow -
    totalAnnualExpensesLow -
    annualInterestPayment -
    estimatedDepreciation;
  const taxableIncomeHigh =
    annualRentalIncomeAfterVacancyHigh -
    totalAnnualExpensesHigh -
    annualInterestPayment -
    estimatedDepreciation;

  // Tax benefit/liability
  const estimatedTaxBenefitLow =
    taxableIncomeLow < 0
      ? calculateNegativeGearingBenefit(taxableIncomeLow, marginalTaxRate)
      : -Math.round((taxableIncomeLow * marginalTaxRate) / 100);
  const estimatedTaxBenefitHigh =
    taxableIncomeHigh < 0
      ? calculateNegativeGearingBenefit(taxableIncomeHigh, marginalTaxRate)
      : -Math.round((taxableIncomeHigh * marginalTaxRate) / 100);

  // Cashflow after tax — built from the cash position (real money in/out)
  // adjusted by the tax benefit/liability from the taxable position.
  const cashflowAfterTaxAnnuallyLow =
    cashPositionBeforeTaxAnnuallyLow + estimatedTaxBenefitLow;
  const cashflowAfterTaxAnnuallyHigh =
    cashPositionBeforeTaxAnnuallyHigh + estimatedTaxBenefitHigh;

  const cashflowAfterTaxWeeklyLow = Math.round(
    cashflowAfterTaxAnnuallyLow / 52
  );
  const cashflowAfterTaxWeeklyHigh = Math.round(
    cashflowAfterTaxAnnuallyHigh / 52
  );
  const cashflowAfterTaxMonthlyLow = Math.round(
    cashflowAfterTaxAnnuallyLow / 12
  );
  const cashflowAfterTaxMonthlyHigh = Math.round(
    cashflowAfterTaxAnnuallyHigh / 12
  );

  // Cash-on-cash returns
  const cashOnCashReturnLow = calculateCashOnCashReturn(
    cashflowAfterTaxAnnuallyLow,
    totalCapitalRequired
  );
  const cashOnCashReturnHigh = calculateCashOnCashReturn(
    cashflowAfterTaxAnnuallyHigh,
    totalCapitalRequired
  );

  return {
    // Capital Required
    depositAmount,
    stampDuty,
    transferFee,
    mortgageRegistrationFee,
    legalFees,
    lmiAmount,
    otherCosts,
    totalCapitalRequired,

    // Loan Details
    loanAmountPreLMI,
    loanAmountPostLMI,
    lvr,

    // Interest Payments
    monthlyLoanRepayment,
    annualLoanRepayment,
    annualPrincipalRepayment,
    monthlyInterestPayment,
    annualInterestPayment,

    // Annual Expenses
    totalAnnualExpenses,
    expensesBreakdown,

    // Yield Analysis
    grossYieldLow,
    grossYieldHigh,
    netYieldLow,
    netYieldHigh,
    cashOnCashReturnLow,
    cashOnCashReturnHigh,

    // Annual Income
    annualRentalIncomeLow,
    annualRentalIncomeHigh,
    annualRentalIncomeAfterVacancyLow,
    annualRentalIncomeAfterVacancyHigh,

    // Cash Position Before Tax (real cash impact, P+I deducted)
    cashPositionBeforeTaxWeeklyLow,
    cashPositionBeforeTaxWeeklyHigh,
    cashPositionBeforeTaxMonthlyLow,
    cashPositionBeforeTaxMonthlyHigh,
    cashPositionBeforeTaxAnnuallyLow,
    cashPositionBeforeTaxAnnuallyHigh,

    // Taxable Cashflow Before Tax (interest only, used for tax modelling)
    taxableCashflowBeforeTaxWeeklyLow,
    taxableCashflowBeforeTaxWeeklyHigh,
    taxableCashflowBeforeTaxMonthlyLow,
    taxableCashflowBeforeTaxMonthlyHigh,
    taxableCashflowBeforeTaxAnnuallyLow,
    taxableCashflowBeforeTaxAnnuallyHigh,

    // Tax Impact
    estimatedDepreciation,
    taxableIncomeLow,
    taxableIncomeHigh,
    estimatedTaxBenefitLow,
    estimatedTaxBenefitHigh,

    // Cashflow After Tax
    cashflowAfterTaxWeeklyLow,
    cashflowAfterTaxWeeklyHigh,
    cashflowAfterTaxMonthlyLow,
    cashflowAfterTaxMonthlyHigh,
    cashflowAfterTaxAnnuallyLow,
    cashflowAfterTaxAnnuallyHigh,
  };
}

/**
 * Create default assumptions for a property model
 *
 * Tax rates based on 2025-26 ATO rates (including 2% Medicare levy):
 * - 0%: $0 – $18,200
 * - 18%: $18,201 – $45,000
 * - 32%: $45,001 – $135,000
 * - 39%: $135,001 – $190,000
 * - 47%: $190,001+
 */
export function createDefaultAssumptions(
  purchasePrice: number = 60000000 // $600,000 default
): PropertyAssumptions {
  return {
    state: "NSW",
    propertyType: "house",
    purchasePrice,
    depositPercent: 20,
    isFirstHomeBuyer: false,
    interestRate: 6.5,
    loanType: "interest-only",
    interestOnlyPeriodYears: 5,
    principalInterestPeriodYears: 25,
    loanTermYears: 30,
    weeklyRentLow: Math.round(purchasePrice * 0.00085), // ~4.4% gross yield
    weeklyRentHigh: Math.round(purchasePrice * 0.001), // ~5.2% gross yield
    vacancyPercent: 2,
    propertyManagementPercent: 8.8, // Including GST
    councilRatesAnnual: Math.round(purchasePrice * 0.003), // ~0.3%
    waterRatesAnnual: 120000, // $1,200
    buildingInsuranceAnnual: 150000, // $1,500
    landlordInsuranceAnnual: 45000, // $450
    legalFees: 0,
    buildingInspection: 0,
    pestInspection: 0,
    otherPurchaseCosts: 0,
    marginalTaxRate: 39, // 2025-26 rate for $135,001 – $190,000 (inc 2% Medicare levy)
  };
}

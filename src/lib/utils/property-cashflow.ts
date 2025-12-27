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
import { calculateInterestOnlyRepayment } from "./loan-calculator";
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
  _includesGst: boolean = true
): number {
  const fee = Math.round((annualRent * managementPercent) / 100);
  // If rate includes GST and we need GST-exclusive, divide by 1.1
  // For property expenses, we typically track GST-inclusive amounts
  // Note: _includesGst parameter reserved for future GST-exclusive calculations
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
  const stampDuty = stampDutyOverride || stampDutyResult.stampDuty;

  // Calculate LMI
  const lmiResult = calculateLMI(purchasePrice, loanAmountPreLMI);
  const lmiAmount = lmiResult.lmiAmount;
  const loanAmountPostLMI = loanAmountPreLMI + lmiAmount; // LMI capitalized

  // Calculate LVR
  const lvr = calculateLVR(loanAmountPostLMI, purchasePrice);

  // Legal fees (default estimate if not provided)
  const legalFees = legalFeesOverride || Math.round(purchasePrice * 0.002); // ~0.2% default

  // Other purchase costs
  const otherCosts =
    (buildingInspection || 0) +
    (pestInspection || 0) +
    (otherPurchaseCosts || 0);

  // Total capital required
  const totalCapitalRequired =
    depositAmount + stampDuty + legalFees + lmiAmount + otherCosts;

  // Calculate annual interest payments
  const annualInterestPayment = calculateInterestOnlyRepayment(
    loanAmountPostLMI,
    interestRate,
    "annually"
  );
  const monthlyInterestPayment = Math.round(annualInterestPayment / 12);

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
    "interest-payments": annualInterestPayment,
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

  // Cashflow before tax (annual)
  const cashflowBeforeTaxAnnuallyLow =
    annualRentalIncomeAfterVacancyLow -
    totalAnnualExpensesLow -
    annualInterestPayment;
  const cashflowBeforeTaxAnnuallyHigh =
    annualRentalIncomeAfterVacancyHigh -
    totalAnnualExpensesHigh -
    annualInterestPayment;

  // Weekly and monthly cashflow before tax
  const cashflowBeforeTaxWeeklyLow = Math.round(
    cashflowBeforeTaxAnnuallyLow / 52
  );
  const cashflowBeforeTaxWeeklyHigh = Math.round(
    cashflowBeforeTaxAnnuallyHigh / 52
  );
  const cashflowBeforeTaxMonthlyLow = Math.round(
    cashflowBeforeTaxAnnuallyLow / 12
  );
  const cashflowBeforeTaxMonthlyHigh = Math.round(
    cashflowBeforeTaxAnnuallyHigh / 12
  );

  // Depreciation
  const estimatedDepreciation = estimatedDepreciationYear1 || 0;

  // Taxable income (includes depreciation as deduction)
  const taxableIncomeLow = cashflowBeforeTaxAnnuallyLow - estimatedDepreciation;
  const taxableIncomeHigh = cashflowBeforeTaxAnnuallyHigh - estimatedDepreciation;

  // Tax benefit/liability
  const estimatedTaxBenefitLow =
    taxableIncomeLow < 0
      ? calculateNegativeGearingBenefit(taxableIncomeLow, marginalTaxRate)
      : -Math.round((taxableIncomeLow * marginalTaxRate) / 100);
  const estimatedTaxBenefitHigh =
    taxableIncomeHigh < 0
      ? calculateNegativeGearingBenefit(taxableIncomeHigh, marginalTaxRate)
      : -Math.round((taxableIncomeHigh * marginalTaxRate) / 100);

  // Cashflow after tax
  const cashflowAfterTaxAnnuallyLow =
    cashflowBeforeTaxAnnuallyLow + estimatedTaxBenefitLow;
  const cashflowAfterTaxAnnuallyHigh =
    cashflowBeforeTaxAnnuallyHigh + estimatedTaxBenefitHigh;

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
    legalFees,
    lmiAmount,
    otherCosts,
    totalCapitalRequired,

    // Loan Details
    loanAmountPreLMI,
    loanAmountPostLMI,
    lvr,

    // Interest Payments
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

    // Cashflow Before Tax
    cashflowBeforeTaxWeeklyLow,
    cashflowBeforeTaxWeeklyHigh,
    cashflowBeforeTaxMonthlyLow,
    cashflowBeforeTaxMonthlyHigh,
    cashflowBeforeTaxAnnuallyLow,
    cashflowBeforeTaxAnnuallyHigh,

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
    marginalTaxRate: 39, // 2025-26 rate for $135,001 – $190,000 (inc 2% Medicare levy)
  };
}

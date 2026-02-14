import { FinancialYear } from "@/domain/value-objects/financial-year";

export interface SuperCapConfig {
  financialYear: string;
  concessionalCap: number; // cents
  nonConcessionalCap: number; // cents
  generalTransferBalanceCap: number; // cents
  superGuaranteeRate: number; // percentage
}

export interface CarryForwardResult {
  eligible: boolean;
  available: number; // cents
  assessedYears: string[];
  unusedByYear: Record<string, number>; // cents by FY
  reason?: string;
}

export interface BringForwardResult {
  eligible: boolean;
  availableCap: number; // cents
  yearsAvailable: 0 | 1 | 2 | 3;
  reason?: string;
}

const SUPER_CAP_BY_FY: Record<string, SuperCapConfig> = {
  "2018-19": {
    financialYear: "2018-19",
    concessionalCap: 25000 * 100,
    nonConcessionalCap: 100000 * 100,
    generalTransferBalanceCap: 1600000 * 100,
    superGuaranteeRate: 9.5,
  },
  "2019-20": {
    financialYear: "2019-20",
    concessionalCap: 25000 * 100,
    nonConcessionalCap: 100000 * 100,
    generalTransferBalanceCap: 1600000 * 100,
    superGuaranteeRate: 9.5,
  },
  "2020-21": {
    financialYear: "2020-21",
    concessionalCap: 25000 * 100,
    nonConcessionalCap: 100000 * 100,
    generalTransferBalanceCap: 1600000 * 100,
    superGuaranteeRate: 9.5,
  },
  "2021-22": {
    financialYear: "2021-22",
    concessionalCap: 27500 * 100,
    nonConcessionalCap: 110000 * 100,
    generalTransferBalanceCap: 1700000 * 100,
    superGuaranteeRate: 10,
  },
  "2022-23": {
    financialYear: "2022-23",
    concessionalCap: 27500 * 100,
    nonConcessionalCap: 110000 * 100,
    generalTransferBalanceCap: 1700000 * 100,
    superGuaranteeRate: 10.5,
  },
  "2023-24": {
    financialYear: "2023-24",
    concessionalCap: 27500 * 100,
    nonConcessionalCap: 110000 * 100,
    generalTransferBalanceCap: 1900000 * 100,
    superGuaranteeRate: 11,
  },
  "2024-25": {
    financialYear: "2024-25",
    concessionalCap: 30000 * 100,
    nonConcessionalCap: 120000 * 100,
    generalTransferBalanceCap: 1900000 * 100,
    superGuaranteeRate: 11.5,
  },
  "2025-26": {
    financialYear: "2025-26",
    concessionalCap: 30000 * 100,
    nonConcessionalCap: 120000 * 100,
    generalTransferBalanceCap: 2000000 * 100,
    superGuaranteeRate: 12,
  },
  "2026-27": {
    financialYear: "2026-27",
    concessionalCap: 30000 * 100,
    nonConcessionalCap: 120000 * 100,
    generalTransferBalanceCap: 2000000 * 100,
    superGuaranteeRate: 12,
  },
};

const KNOWN_YEARS = Object.keys(SUPER_CAP_BY_FY).sort();

function resolveFinancialYear(financialYear?: string): string {
  const target = financialYear ?? FinancialYear.current().value;
  if (SUPER_CAP_BY_FY[target]) {
    return target;
  }

  const parsed = FinancialYear.tryParse(target);
  if (!parsed) {
    return FinancialYear.current().value in SUPER_CAP_BY_FY
      ? FinancialYear.current().value
      : KNOWN_YEARS[KNOWN_YEARS.length - 1];
  }

  const targetYear = parsed.startYear;
  let closest = KNOWN_YEARS[0];

  for (const fy of KNOWN_YEARS) {
    const fyYear = FinancialYear.parse(fy).startYear;
    if (fyYear <= targetYear) {
      closest = fy;
    }
  }

  return closest;
}

export function getSuperCapConfig(financialYear?: string): SuperCapConfig {
  return SUPER_CAP_BY_FY[resolveFinancialYear(financialYear)];
}

export function getConcessionalCap(financialYear?: string): number {
  return getSuperCapConfig(financialYear).concessionalCap;
}

export function getNonConcessionalCap(financialYear?: string): number {
  return getSuperCapConfig(financialYear).nonConcessionalCap;
}

export function calculateCarryForwardConcessional(options: {
  financialYear: string;
  concessionalContributionsByFY: Record<string, number>;
  totalSuperBalancePreviousJune30?: number;
}): CarryForwardResult {
  const { financialYear, concessionalContributionsByFY, totalSuperBalancePreviousJune30 } =
    options;

  if (
    totalSuperBalancePreviousJune30 !== undefined &&
    totalSuperBalancePreviousJune30 >= 500000 * 100
  ) {
    return {
      eligible: false,
      available: 0,
      assessedYears: [],
      unusedByYear: {},
      reason: "Total super balance is above $500,000 at prior 30 June.",
    };
  }

  const fy = FinancialYear.parse(resolveFinancialYear(financialYear));
  const assessedYears: string[] = [];
  const unusedByYear: Record<string, number> = {};

  for (let i = 1; i <= 5; i++) {
    const priorYear = fy.offset(-i).value;
    if (!SUPER_CAP_BY_FY[priorYear]) {
      continue;
    }

    assessedYears.push(priorYear);
    const cap = getConcessionalCap(priorYear);
    const used = Math.max(0, concessionalContributionsByFY[priorYear] ?? 0);
    const unused = Math.max(0, cap - used);
    unusedByYear[priorYear] = unused;
  }

  const available = Object.values(unusedByYear).reduce((sum, v) => sum + v, 0);
  return {
    eligible: true,
    available,
    assessedYears,
    unusedByYear,
  };
}

export function calculateBringForwardCap(options: {
  financialYear: string;
  totalSuperBalancePreviousJune30?: number;
  ageAtStartOfFinancialYear?: number;
}): BringForwardResult {
  const { financialYear, totalSuperBalancePreviousJune30, ageAtStartOfFinancialYear } = options;
  const config = getSuperCapConfig(financialYear);
  const annualCap = config.nonConcessionalCap;
  const gtbCap = config.generalTransferBalanceCap;

  if (ageAtStartOfFinancialYear !== undefined && ageAtStartOfFinancialYear >= 75) {
    return {
      eligible: false,
      availableCap: 0,
      yearsAvailable: 0,
      reason: "Bring-forward is generally unavailable from age 75.",
    };
  }

  if (totalSuperBalancePreviousJune30 === undefined) {
    return {
      eligible: true,
      availableCap: annualCap,
      yearsAvailable: 1,
      reason:
        "Total super balance not provided; using annual non-concessional cap only.",
    };
  }

  if (totalSuperBalancePreviousJune30 >= gtbCap) {
    return {
      eligible: false,
      availableCap: 0,
      yearsAvailable: 0,
      reason: "Total super balance is at or above the transfer balance cap.",
    };
  }

  const lowerForOneYear = gtbCap - annualCap;
  const lowerForTwoYears = gtbCap - annualCap * 2;

  if (totalSuperBalancePreviousJune30 >= lowerForOneYear) {
    return {
      eligible: true,
      availableCap: annualCap,
      yearsAvailable: 1,
    };
  }

  if (totalSuperBalancePreviousJune30 >= lowerForTwoYears) {
    return {
      eligible: true,
      availableCap: annualCap * 2,
      yearsAvailable: 2,
    };
  }

  return {
    eligible: true,
    availableCap: annualCap * 3,
    yearsAvailable: 3,
  };
}


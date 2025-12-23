/**
 * Property Portfolio Store
 *
 * Zustand store for managing property portfolio data:
 * - Properties
 * - Property loans
 * - Property expenses
 * - Property rentals
 * - Property depreciation
 * - Property models (scenario analysis)
 */

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import type {
  Property,
  PropertyLoan,
  PropertyExpense,
  PropertyRental,
  PropertyDepreciation,
  PropertyModel,
  PropertyStatus,
} from "@/types";
import { calculatePropertyModel } from "@/lib/utils/property-cashflow";

interface PropertyStore {
  // UI State
  selectedPropertyId: string | null;
  setSelectedProperty: (id: string | null) => void;

  // Property CRUD
  createProperty: (
    data: Omit<Property, "id" | "createdAt" | "updatedAt">
  ) => Promise<string>;
  updateProperty: (id: string, data: Partial<Property>) => Promise<void>;
  deleteProperty: (
    id: string,
    options?: { cascade?: boolean }
  ) => Promise<void>;
  updatePropertyStatus: (id: string, status: PropertyStatus) => Promise<void>;

  // Loan CRUD
  createLoan: (
    data: Omit<PropertyLoan, "id" | "createdAt" | "updatedAt">
  ) => Promise<string>;
  updateLoan: (id: string, data: Partial<PropertyLoan>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  updateLoanBalance: (id: string, newBalance: number) => Promise<void>;

  // Expense CRUD
  createExpense: (
    data: Omit<PropertyExpense, "id" | "createdAt" | "updatedAt">
  ) => Promise<string>;
  updateExpense: (id: string, data: Partial<PropertyExpense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  bulkCreateExpenses: (
    expenses: Omit<PropertyExpense, "id" | "createdAt" | "updatedAt">[]
  ) => Promise<string[]>;

  // Rental CRUD
  createRental: (
    data: Omit<PropertyRental, "id" | "createdAt" | "updatedAt">
  ) => Promise<string>;
  updateRental: (id: string, data: Partial<PropertyRental>) => Promise<void>;
  deleteRental: (id: string) => Promise<void>;

  // Depreciation CRUD
  createDepreciation: (
    data: Omit<PropertyDepreciation, "id" | "createdAt" | "updatedAt">
  ) => Promise<string>;
  updateDepreciation: (
    id: string,
    data: Partial<PropertyDepreciation>
  ) => Promise<void>;
  deleteDepreciation: (id: string) => Promise<void>;

  // Model CRUD
  createModel: (
    data: Omit<PropertyModel, "id" | "createdAt" | "updatedAt">
  ) => Promise<string>;
  updateModel: (id: string, data: Partial<PropertyModel>) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
  calculateAndSaveModel: (id: string) => Promise<void>;
}

export const usePropertyStore = create<PropertyStore>((set) => ({
  // UI State
  selectedPropertyId: null,
  setSelectedProperty: (id) => set({ selectedPropertyId: id }),

  // Property CRUD
  createProperty: async (data) => {
    const id = uuidv4();
    const now = new Date();

    const property: Property = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await db.properties.add(property);
    return id;
  },

  updateProperty: async (id, data) => {
    await db.properties.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  deleteProperty: async (id, options = { cascade: true }) => {
    if (options.cascade) {
      // Use transaction for atomic cascade delete
      await db.transaction(
        "rw",
        [
          db.properties,
          db.propertyLoans,
          db.propertyExpenses,
          db.propertyRentals,
          db.propertyDepreciation,
          db.propertyModels,
        ],
        async () => {
          // Delete all related records
          await db.propertyLoans.where("propertyId").equals(id).delete();
          await db.propertyExpenses.where("propertyId").equals(id).delete();
          await db.propertyRentals.where("propertyId").equals(id).delete();
          await db.propertyDepreciation.where("propertyId").equals(id).delete();
          await db.propertyModels.where("propertyId").equals(id).delete();

          // Delete the property
          await db.properties.delete(id);
        }
      );
    } else {
      await db.properties.delete(id);
    }
  },

  updatePropertyStatus: async (id, status) => {
    await db.properties.update(id, {
      status,
      updatedAt: new Date(),
    });
  },

  // Loan CRUD
  createLoan: async (data) => {
    const id = uuidv4();
    const now = new Date();

    const loan: PropertyLoan = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await db.propertyLoans.add(loan);
    return id;
  },

  updateLoan: async (id, data) => {
    await db.propertyLoans.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  deleteLoan: async (id) => {
    await db.propertyLoans.delete(id);
  },

  updateLoanBalance: async (id, newBalance) => {
    await db.propertyLoans.update(id, {
      currentBalance: newBalance,
      updatedAt: new Date(),
    });
  },

  // Expense CRUD
  createExpense: async (data) => {
    const id = uuidv4();
    const now = new Date();

    const expense: PropertyExpense = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await db.propertyExpenses.add(expense);
    return id;
  },

  updateExpense: async (id, data) => {
    await db.propertyExpenses.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  deleteExpense: async (id) => {
    await db.propertyExpenses.delete(id);
  },

  bulkCreateExpenses: async (expenses) => {
    const now = new Date();
    const ids: string[] = [];

    const expensesWithIds = expenses.map((data) => {
      const id = uuidv4();
      ids.push(id);
      return {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      } as PropertyExpense;
    });

    await db.propertyExpenses.bulkAdd(expensesWithIds);
    return ids;
  },

  // Rental CRUD
  createRental: async (data) => {
    const id = uuidv4();
    const now = new Date();

    const rental: PropertyRental = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await db.propertyRentals.add(rental);
    return id;
  },

  updateRental: async (id, data) => {
    await db.propertyRentals.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  deleteRental: async (id) => {
    await db.propertyRentals.delete(id);
  },

  // Depreciation CRUD
  createDepreciation: async (data) => {
    const id = uuidv4();
    const now = new Date();

    const depreciation: PropertyDepreciation = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await db.propertyDepreciation.add(depreciation);
    return id;
  },

  updateDepreciation: async (id, data) => {
    await db.propertyDepreciation.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  deleteDepreciation: async (id) => {
    await db.propertyDepreciation.delete(id);
  },

  // Model CRUD
  createModel: async (data) => {
    const id = uuidv4();
    const now = new Date();

    // Calculate results if assumptions are provided
    let calculatedResults = data.calculatedResults;
    if (data.assumptions && !calculatedResults) {
      calculatedResults = calculatePropertyModel(data.assumptions);
    }

    const model: PropertyModel = {
      ...data,
      id,
      calculatedResults,
      lastCalculatedAt: calculatedResults ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await db.propertyModels.add(model);
    return id;
  },

  updateModel: async (id, data) => {
    const updates: Partial<PropertyModel> = {
      ...data,
      updatedAt: new Date(),
    };

    // Recalculate if assumptions changed
    if (data.assumptions) {
      updates.calculatedResults = calculatePropertyModel(data.assumptions);
      updates.lastCalculatedAt = new Date();
    }

    await db.propertyModels.update(id, updates);
  },

  deleteModel: async (id) => {
    await db.propertyModels.delete(id);
  },

  calculateAndSaveModel: async (id) => {
    const model = await db.propertyModels.get(id);
    if (!model) {
      throw new Error(`Model not found: ${id}`);
    }

    const calculatedResults = calculatePropertyModel(model.assumptions);
    const now = new Date();

    await db.propertyModels.update(id, {
      calculatedResults,
      lastCalculatedAt: now,
      updatedAt: now,
    });
  },
}));

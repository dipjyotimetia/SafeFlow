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
import { handleStoreError } from "@/lib/errors";

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
    try {
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
    } catch (error) {
      handleStoreError("PropertyStore.createProperty", error);
      throw error;
    }
  },

  updateProperty: async (id, data) => {
    try {
      await db.properties.update(id, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      handleStoreError("PropertyStore.updateProperty", error);
      throw error;
    }
  },

  deleteProperty: async (id, options = { cascade: true }) => {
    try {
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
    } catch (error) {
      handleStoreError("PropertyStore.deleteProperty", error);
      throw error;
    }
  },

  updatePropertyStatus: async (id, status) => {
    try {
      await db.properties.update(id, {
        status,
        updatedAt: new Date(),
      });
    } catch (error) {
      handleStoreError("PropertyStore.updatePropertyStatus", error);
      throw error;
    }
  },

  // Loan CRUD
  createLoan: async (data) => {
    try {
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
    } catch (error) {
      handleStoreError("PropertyStore.createLoan", error);
      throw error;
    }
  },

  updateLoan: async (id, data) => {
    try {
      await db.propertyLoans.update(id, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      handleStoreError("PropertyStore.updateLoan", error);
      throw error;
    }
  },

  deleteLoan: async (id) => {
    try {
      await db.propertyLoans.delete(id);
    } catch (error) {
      handleStoreError("PropertyStore.deleteLoan", error);
      throw error;
    }
  },

  updateLoanBalance: async (id, newBalance) => {
    try {
      await db.propertyLoans.update(id, {
        currentBalance: newBalance,
        updatedAt: new Date(),
      });
    } catch (error) {
      handleStoreError("PropertyStore.updateLoanBalance", error);
      throw error;
    }
  },

  // Expense CRUD
  createExpense: async (data) => {
    try {
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
    } catch (error) {
      handleStoreError("PropertyStore.createExpense", error);
      throw error;
    }
  },

  updateExpense: async (id, data) => {
    try {
      await db.propertyExpenses.update(id, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      handleStoreError("PropertyStore.updateExpense", error);
      throw error;
    }
  },

  deleteExpense: async (id) => {
    try {
      await db.propertyExpenses.delete(id);
    } catch (error) {
      handleStoreError("PropertyStore.deleteExpense", error);
      throw error;
    }
  },

  bulkCreateExpenses: async (expenses) => {
    try {
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
    } catch (error) {
      handleStoreError("PropertyStore.bulkCreateExpenses", error);
      throw error;
    }
  },

  // Rental CRUD
  createRental: async (data) => {
    try {
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
    } catch (error) {
      handleStoreError("PropertyStore.createRental", error);
      throw error;
    }
  },

  updateRental: async (id, data) => {
    try {
      await db.propertyRentals.update(id, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      handleStoreError("PropertyStore.updateRental", error);
      throw error;
    }
  },

  deleteRental: async (id) => {
    try {
      await db.propertyRentals.delete(id);
    } catch (error) {
      handleStoreError("PropertyStore.deleteRental", error);
      throw error;
    }
  },

  // Depreciation CRUD
  createDepreciation: async (data) => {
    try {
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
    } catch (error) {
      handleStoreError("PropertyStore.createDepreciation", error);
      throw error;
    }
  },

  updateDepreciation: async (id, data) => {
    try {
      await db.propertyDepreciation.update(id, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      handleStoreError("PropertyStore.updateDepreciation", error);
      throw error;
    }
  },

  deleteDepreciation: async (id) => {
    try {
      await db.propertyDepreciation.delete(id);
    } catch (error) {
      handleStoreError("PropertyStore.deleteDepreciation", error);
      throw error;
    }
  },

  // Model CRUD
  createModel: async (data) => {
    try {
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
    } catch (error) {
      handleStoreError("PropertyStore.createModel", error);
      throw error;
    }
  },

  updateModel: async (id, data) => {
    try {
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
    } catch (error) {
      handleStoreError("PropertyStore.updateModel", error);
      throw error;
    }
  },

  deleteModel: async (id) => {
    try {
      await db.propertyModels.delete(id);
    } catch (error) {
      handleStoreError("PropertyStore.deleteModel", error);
      throw error;
    }
  },

  calculateAndSaveModel: async (id) => {
    try {
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
    } catch (error) {
      handleStoreError("PropertyStore.calculateAndSaveModel", error);
      throw error;
    }
  },
}));

import type { Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const createCategory = (
  name: string,
  type: 'income' | 'expense' | 'transfer',
  icon: string,
  atoCode?: string
): Omit<Category, 'createdAt' | 'updatedAt'> => ({
  id: uuidv4(),
  name,
  type,
  icon,
  isSystem: true,
  isActive: true,
  atoCode,
});

// Default expense categories
export const expenseCategories: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  createCategory('Groceries', 'expense', 'shopping-cart'),
  createCategory('Dining Out', 'expense', 'utensils'),
  createCategory('Transport', 'expense', 'car'),
  createCategory('Fuel', 'expense', 'fuel'),
  createCategory('Utilities', 'expense', 'zap'),
  createCategory('Rent/Mortgage', 'expense', 'home'),
  createCategory('Insurance', 'expense', 'shield'),
  createCategory('Healthcare', 'expense', 'heart'),
  createCategory('Entertainment', 'expense', 'film'),
  createCategory('Shopping', 'expense', 'shopping-bag'),
  createCategory('Education', 'expense', 'book'),
  createCategory('Subscriptions', 'expense', 'repeat'),
  createCategory('Travel', 'expense', 'plane'),
  createCategory('Fees & Charges', 'expense', 'file-text'),
  createCategory('Personal Care', 'expense', 'user'),
  createCategory('Gifts', 'expense', 'gift'),
  createCategory('Other Expense', 'expense', 'minus-circle'),
];

// Default income categories
export const incomeCategories: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  createCategory('Salary', 'income', 'briefcase'),
  createCategory('Interest', 'income', 'percent'),
  createCategory('Dividends', 'income', 'trending-up'),
  createCategory('Rental Income', 'income', 'home'),
  createCategory('Business Income', 'income', 'building'),
  createCategory('Government Payments', 'income', 'landmark'),
  createCategory('Refunds', 'income', 'rotate-ccw'),
  createCategory('Other Income', 'income', 'plus-circle'),
];

// Transfer category
export const transferCategory: Omit<Category, 'createdAt' | 'updatedAt'> =
  createCategory('Transfer', 'transfer', 'arrow-right-left');

// ATO Deduction Categories (D1-D10)
export const atoDeductionCategories: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  createCategory('Work Car Expenses', 'expense', 'car', 'D1'),
  createCategory('Work Travel Expenses', 'expense', 'plane', 'D2'),
  createCategory('Work Clothing/Uniforms', 'expense', 'shirt', 'D3'),
  createCategory('Self-Education', 'expense', 'graduation-cap', 'D4'),
  createCategory('Home Office', 'expense', 'monitor', 'D5'),
  createCategory('Tools & Equipment', 'expense', 'wrench', 'D5'),
  createCategory('Phone & Internet (Work)', 'expense', 'phone', 'D5'),
  createCategory('Union Fees', 'expense', 'users', 'D5'),
  createCategory('Low Value Pool Assets', 'expense', 'package', 'D6'),
  createCategory('Interest Deductions', 'expense', 'percent', 'D7'),
  createCategory('Dividend Deductions', 'expense', 'trending-up', 'D8'),
  createCategory('Donations', 'expense', 'heart', 'D9'),
  createCategory('Tax Agent Fees', 'expense', 'calculator', 'D10'),
];

// All default categories combined
export const defaultCategories: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  ...expenseCategories,
  ...incomeCategories,
  transferCategory,
  ...atoDeductionCategories,
];

// ATO Category descriptions for UI
export const atoCategoryDescriptions: Record<string, { code: string; name: string; description: string }> = {
  D1: {
    code: 'D1',
    name: 'Work-related car expenses',
    description: 'Motor vehicle and car expenses for work travel (not home to work)',
  },
  D2: {
    code: 'D2',
    name: 'Work-related travel expenses',
    description: 'Travel expenses for work (accommodation, meals, transport - not car)',
  },
  D3: {
    code: 'D3',
    name: 'Work-related clothing expenses',
    description: 'Uniforms, protective clothing, occupation-specific clothing',
  },
  D4: {
    code: 'D4',
    name: 'Work-related self-education expenses',
    description: 'Self-education directly related to current work or likely promotion',
  },
  D5: {
    code: 'D5',
    name: 'Other work-related expenses',
    description: 'Home office, tools, equipment, phone, internet, union fees',
  },
  D6: {
    code: 'D6',
    name: 'Low value pool deduction',
    description: 'Depreciation of low-cost assets (under $1,000)',
  },
  D7: {
    code: 'D7',
    name: 'Interest deductions',
    description: 'Interest on money borrowed for income-producing investments',
  },
  D8: {
    code: 'D8',
    name: 'Dividend deductions',
    description: 'Expenses related to earning dividend income',
  },
  D9: {
    code: 'D9',
    name: 'Gifts or donations',
    description: 'Donations to deductible gift recipients (DGR) over $2',
  },
  D10: {
    code: 'D10',
    name: 'Cost of managing tax affairs',
    description: 'Tax agent fees, tax software, ATO interest charges',
  },
};

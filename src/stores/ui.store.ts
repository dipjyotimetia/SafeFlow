import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db';

interface UIStore {
  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Modal states
  isAddAccountModalOpen: boolean;
  setAddAccountModalOpen: (open: boolean) => void;

  isAddTransactionModalOpen: boolean;
  setAddTransactionModalOpen: (open: boolean) => void;

  isImportModalOpen: boolean;
  setImportModalOpen: (open: boolean) => void;

  // Selected financial year
  selectedFinancialYear: string;
  setSelectedFinancialYear: (fy: string) => void;

  // View preferences
  transactionViewMode: 'list' | 'grouped';
  setTransactionViewMode: (mode: 'list' | 'grouped') => void;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Investment settings
  autoRefreshPrices: boolean;
  setAutoRefreshPrices: (enabled: boolean) => void;

  // Data management
  clearAllData: () => Promise<void>;
}

// Get current financial year
function getCurrentFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 6) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      isAddAccountModalOpen: false,
      setAddAccountModalOpen: (open) => set({ isAddAccountModalOpen: open }),

      isAddTransactionModalOpen: false,
      setAddTransactionModalOpen: (open) => set({ isAddTransactionModalOpen: open }),

      isImportModalOpen: false,
      setImportModalOpen: (open) => set({ isImportModalOpen: open }),

      selectedFinancialYear: getCurrentFY(),
      setSelectedFinancialYear: (fy) => set({ selectedFinancialYear: fy }),

      transactionViewMode: 'list',
      setTransactionViewMode: (mode) => set({ transactionViewMode: mode }),

      theme: 'system',
      setTheme: (theme) => set({ theme }),

      autoRefreshPrices: true,
      setAutoRefreshPrices: (enabled) => set({ autoRefreshPrices: enabled }),

      clearAllData: async () => {
        try {
          await db.delete();
          localStorage.clear();
          window.location.reload();
        } catch (error) {
          console.error('Failed to clear database:', error);
          throw error; // Re-throw so caller can handle
        }
      },
    }),
    {
      name: 'safeflow-ui',
      partialize: (state) => ({
        selectedFinancialYear: state.selectedFinancialYear,
        transactionViewMode: state.transactionViewMode,
        theme: state.theme,
        autoRefreshPrices: state.autoRefreshPrices,
      }),
    }
  )
);

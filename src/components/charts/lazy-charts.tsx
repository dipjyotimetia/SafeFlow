'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ChartLoading = () => (
  <div className="flex items-center justify-center h-[300px]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export const LazyCashflowChart = dynamic(
  () => import('./cashflow-chart').then((mod) => mod.CashflowChart),
  {
    loading: ChartLoading,
    ssr: false,
  }
);

export const LazyCategoryPieChart = dynamic(
  () => import('./category-pie-chart').then((mod) => mod.CategoryPieChart),
  {
    loading: ChartLoading,
    ssr: false,
  }
);

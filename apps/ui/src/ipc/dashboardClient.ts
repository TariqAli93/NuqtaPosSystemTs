import type { ApiResult } from './contracts';
import { invoke } from './invoke';

export interface DailySalesSummary {
  totalSales: number;
  totalRevenue: number;
  averageSaleAmount: number;
}

export interface TopSellingProduct {
  productId: number;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface DashboardStats {
  salesToday: DailySalesSummary | null;
  lowStockCount: number;
  topProducts: TopSellingProduct[];
}

export const dashboardClient = {
  getStats: (): Promise<ApiResult<DashboardStats>> =>
    invoke<DashboardStats>('dashboard:getStats', {}),
};

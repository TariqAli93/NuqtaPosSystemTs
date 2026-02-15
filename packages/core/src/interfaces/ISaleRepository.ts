import { Sale } from '../entities/Sale.js';

export interface ISaleRepository {
  create(sale: Sale): Sale;
  findById(id: number): Sale | null;
  findAll(params?: {
    page: number;
    limit: number;
    startDate?: string;
    endDate?: string;
  }): { items: Sale[]; total: number };
  updateStatus(id: number, status: 'completed' | 'cancelled'): void;
  update(id: number, data: Partial<Sale>): void;
  getDailySummary(date: Date): {
    revenue: number;
    count: number;
    cash: number;
    card: number;
    transfer: number;
  };
  getTopSelling(limit: number): {
    productId: number;
    productName: string;
    quantity: number;
    revenue: number;
  }[];

  generateReceipt(saleId: number): string;
}

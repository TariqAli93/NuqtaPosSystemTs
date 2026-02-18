import { Product } from '../entities/Product.js';

export interface IProductRepository {
  findAll(params?: {
    search?: string;
    limit?: number;
    offset?: number;
    categoryId?: number;
    supplierId?: number;
    status?: string;
    lowStockOnly?: boolean;
    expiringSoonOnly?: boolean;
  }): { items: Product[]; total: number };
  findById(id: number): Product | null;
  create(product: Product): Product;
  update(id: number, product: Partial<Product>): Product;
  delete(id: number): void;
  updateStock(id: number, quantityChange: number): void;
  updateBatchStock(batchId: number, quantityChange: number): void;
  countLowStock(threshold: number): number;
}

import { Product } from '../entities/Product.js';

export interface IProductRepository {
  findAll(params?: {
    search?: string;
    limit?: number;
    offset?: number;
    categoryId?: number;
  }): Promise<{ items: Product[]; total: number }>;
  findById(id: number): Promise<Product | null>;
  create(product: Product): Promise<Product>;
  update(id: number, product: Partial<Product>): Promise<Product>;
  delete(id: number): Promise<void>;
  updateStock(id: number, quantityChange: number): Promise<void>;
  countLowStock(threshold: number): Promise<number>;
}

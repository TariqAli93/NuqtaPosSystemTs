import { Product } from '../entities/Product.js';
import { ProductBatch } from '../entities/ProductBatch.js';
import { ProductUnit } from '../entities/ProductUnit.js';

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
  findByBarcode?(barcode: string): Product | null;
  create(product: Product): Product;
  update(id: number, product: Partial<Product>): Product;
  delete(id: number): void;
  updateStock(id: number, quantityChange: number): void;
  /** Set products.stock to the exact value (used for cache sync from batch totals) */
  setStock(id: number, absoluteStock: number): void;
  updateBatchStock(batchId: number, quantityChange: number): void;
  countLowStock(threshold: number): number;

  // ── Product Batches ────────────────────────────────────────────
  findBatchesByProductId(productId: number): ProductBatch[];
  createBatch(batch: Omit<ProductBatch, 'id' | 'createdAt'>): ProductBatch;
  findBatchById(batchId: number): ProductBatch | null;

  // ── Product Units (Packaging / Conversion) ────────────────────
  findUnitsByProductId(productId: number): ProductUnit[];
  createUnit(unit: Omit<ProductUnit, 'id' | 'createdAt'>): ProductUnit;
  updateUnit(id: number, unit: Partial<ProductUnit>): ProductUnit;
  deleteUnit(id: number): void;
  setDefaultUnit(productId: number, unitId: number): void;
}

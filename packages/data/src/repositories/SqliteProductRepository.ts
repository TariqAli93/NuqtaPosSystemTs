import { eq, like, count, and, lte } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { products } from '../schema/schema.js';
import { IProductRepository, Product } from '@nuqtaplus/core';

export class SqliteProductRepository implements IProductRepository {
  constructor(private db: DbClient) {}

  findAll(params?: {
    search?: string;
    limit?: number;
    offset?: number;
    categoryId?: number;
  }): { items: Product[]; total: number } {
    const conditions = [];
    if (params?.search) {
      conditions.push(like(products.name, `%${params.search}%`));
    }
    if (params?.categoryId) {
      conditions.push(eq(products.categoryId, params.categoryId));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const query = this.db.select().from(products).where(whereClause);

    if (params?.limit) query.limit(params.limit);
    if (params?.offset) query.offset(params.offset);

    const items = query.all() as Product[];

    const totalResult = this.db.select({ count: count() }).from(products).where(whereClause).get();

    return { items, total: totalResult?.count || 0 };
  }

  findById(id: number): Product | null {
    const item = this.db.select().from(products).where(eq(products.id, id)).get();
    return (item as Product) || null;
  }

  findByBarcode(barcode: string): Product | null {
    const item = this.db.select().from(products).where(eq(products.barcode, barcode)).get();
    return (item as Product) || null;
  }

  create(product: Product): Product {
    try {
      const { id, ...data } = product; // Exclude ID to allow auto-increment
      const created = this.db
        .insert(products)
        .values(data as any)
        .returning()
        .get();
      return created as Product;
    } catch (error: any) {
      console.error('Failed to create product:', error);
      throw new Error(`Failed to create product: ${error.message} \n ${JSON.stringify(product)}`);
    }
  }

  update(id: number, product: Partial<Product>): Product {
    const updated = this.db
      .update(products)
      .set(product as any)
      .where(eq(products.id, id))
      .returning()
      .get();
    return updated as Product;
  }

  delete(id: number): void {
    this.db.delete(products).where(eq(products.id, id)).run();
  }

  updateStock(id: number, quantityChange: number): void {
    const product = this.findById(id);
    if (product) {
      this.db
        .update(products)
        .set({ stock: (product.stock || 0) + quantityChange })
        .where(eq(products.id, id))
        .run();
    }
  }

  countLowStock(threshold: number): number {
    const result = this.db
      .select({ count: count() })
      .from(products)
      .where(lte(products.stock, threshold))
      .get();

    return result?.count || 0;
  }
}

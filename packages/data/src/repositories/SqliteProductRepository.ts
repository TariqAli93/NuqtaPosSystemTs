import { eq, like, count, and, lte } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { products } from '../schema/schema.js';
import { IProductRepository, Product } from '@nuqtaplus/core';

export class SqliteProductRepository implements IProductRepository {
  constructor(private db: DbClient) {}

  async findAll(params?: {
    search?: string;
    limit?: number;
    offset?: number;
    categoryId?: number;
  }): Promise<{ items: Product[]; total: number }> {
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

    const items = (await query.all()) as Product[];

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(products)
      .where(whereClause);

    return { items, total: totalResult.count };
  }

  async findById(id: number): Promise<Product | null> {
    const [item] = await this.db.select().from(products).where(eq(products.id, id));
    return (item as Product) || null;
  }

  async create(product: Product): Promise<Product> {
    try {
      const { id, ...data } = product; // Exclude ID to allow auto-increment
      const [created] = await this.db
        .insert(products)
        .values(data as any)
        .returning();
      return created as Product;
    } catch (error: any) {
      console.error('Failed to create product:', error);
      throw new Error(`Failed to create product: ${error.message} \n ${JSON.stringify(product)}`);
    }
  }

  async update(id: number, product: Partial<Product>): Promise<Product> {
    const [updated] = await this.db
      .update(products)
      .set(product as any)
      .where(eq(products.id, id))
      .returning();
    return updated as Product;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id));
  }

  async updateStock(id: number, quantityChange: number): Promise<void> {
    const product = await this.findById(id);
    if (product) {
      await this.db
        .update(products)
        .set({ stock: (product.stock || 0) + quantityChange })
        .where(eq(products.id, id));
    }
  }

  async countLowStock(threshold: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(products)
      .where(lte(products.stock, threshold));

    return result.count;
  }
}

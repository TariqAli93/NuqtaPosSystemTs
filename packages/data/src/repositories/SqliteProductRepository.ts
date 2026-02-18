import { eq, like, count, and, lte, desc, asc, sql } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { products, productBatches, productUnits } from '../schema/schema.js';
import { IProductRepository, Product, ProductBatch, ProductUnit } from '@nuqtaplus/core';

export class SqliteProductRepository implements IProductRepository {
  constructor(private db: DbClient) {}

  findAll(params?: {
    search?: string;
    limit?: number;
    offset?: number;
    categoryId?: number;
    supplierId?: number;
    status?: string;
    lowStockOnly?: boolean;
    expiringSoonOnly?: boolean;
  }): { items: Product[]; total: number } {
    const conditions: any[] = [];
    if (params?.search) {
      conditions.push(like(products.name, `%${params.search}%`));
    }
    if (params?.categoryId) {
      conditions.push(eq(products.categoryId, params.categoryId));
    }
    if (params?.supplierId) {
      conditions.push(eq(products.supplierId, params.supplierId));
    }
    if (params?.status) {
      conditions.push(eq(products.status, params.status));
    }
    if (params?.lowStockOnly) {
      conditions.push(lte(products.stock, products.minStock));
    }
    if (params?.expiringSoonOnly) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 30);
      const cutoffDate = cutoff.toISOString().slice(0, 10);
      conditions.push(sql`EXISTS (
        SELECT 1
        FROM product_batches pb
        WHERE pb.product_id = ${products.id}
          AND pb.quantity_on_hand > 0
          AND pb.expiry_date IS NOT NULL
          AND pb.expiry_date <= ${cutoffDate}
      )`);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const query = this.db.select().from(products).where(whereClause).orderBy(desc(products.updatedAt));

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

  updateBatchStock(batchId: number, quantityChange: number): void {
    const batch = this.db.select().from(productBatches).where(eq(productBatches.id, batchId)).get();
    if (!batch) return;

    this.db
      .update(productBatches)
      .set({
        quantityOnHand: Math.max(0, (batch.quantityOnHand || 0) + quantityChange),
      })
      .where(eq(productBatches.id, batchId))
      .run();
  }

  countLowStock(threshold: number): number {
    const result = this.db
      .select({ count: count() })
      .from(products)
      .where(lte(products.stock, threshold))
      .get();

    return result?.count || 0;
  }

  findUnitsByProductId(productId: number): ProductUnit[] {
    return this.db
      .select()
      .from(productUnits)
      .where(eq(productUnits.productId, productId))
      .orderBy(desc(productUnits.isDefault), asc(productUnits.factorToBase))
      .all() as unknown as ProductUnit[];
  }

  createUnit(unit: Omit<ProductUnit, 'id' | 'createdAt'>): ProductUnit {
    if (unit.isDefault) {
      this.db
        .update(productUnits)
        .set({ isDefault: false })
        .where(eq(productUnits.productId, unit.productId))
        .run();
    }

    const created = this.db
      .insert(productUnits)
      .values({
        ...unit,
        isDefault: unit.isDefault ?? false,
        isActive: unit.isActive ?? true,
        createdAt: new Date().toISOString(),
      } as any)
      .returning()
      .get();

    return created as ProductUnit;
  }

  updateUnit(id: number, unit: Partial<ProductUnit>): ProductUnit {
    const existing = this.db.select().from(productUnits).where(eq(productUnits.id, id)).get();
    if (!existing) {
      throw new Error(`Product unit ${id} not found`);
    }

    if (unit.isDefault) {
      this.db
        .update(productUnits)
        .set({ isDefault: false })
        .where(eq(productUnits.productId, existing.productId))
        .run();
    }

    const updated = this.db
      .update(productUnits)
      .set(unit as any)
      .where(eq(productUnits.id, id))
      .returning()
      .get();

    return updated as ProductUnit;
  }

  deleteUnit(id: number): void {
    this.db.delete(productUnits).where(eq(productUnits.id, id)).run();
  }

  setDefaultUnit(productId: number, unitId: number): void {
    this.db
      .update(productUnits)
      .set({ isDefault: false })
      .where(eq(productUnits.productId, productId))
      .run();

    this.db
      .update(productUnits)
      .set({ isDefault: true })
      .where(eq(productUnits.id, unitId))
      .run();
  }

  findBatchesByProductId(productId: number): ProductBatch[] {
    return this.db
      .select()
      .from(productBatches)
      .where(eq(productBatches.productId, productId))
      .orderBy(asc(productBatches.expiryDate), desc(productBatches.id))
      .all() as unknown as ProductBatch[];
  }

  createBatch(batch: Omit<ProductBatch, 'id' | 'createdAt'>): ProductBatch {
    const created = this.db
      .insert(productBatches)
      .values({
        ...batch,
        status: batch.status || 'active',
        createdAt: new Date().toISOString(),
      } as any)
      .returning()
      .get();

    return created as ProductBatch;
  }
}

import { eq, like, sql } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { suppliers } from '../schema/schema.js';
import { ISupplierRepository, Supplier } from '@nuqtaplus/core';

export class SqliteSupplierRepository implements ISupplierRepository {
  constructor(private db: DbClient) {}

  async findAll(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: Supplier[]; total: number }> {
    const query = this.db.select().from(suppliers);

    if (params?.search) {
      query.where(like(suppliers.name, `%${params.search}%`));
    }

    if (params?.limit) query.limit(params.limit);
    if (params?.offset) query.offset(params.offset);

    const items = query.all() as Supplier[];

    const countResult = this.db
      .select({ count: sql<number>`count(*)` })
      .from(suppliers)
      .where(params?.search ? like(suppliers.name, `%${params.search}%`) : undefined)
      .get();

    return { items, total: countResult?.count || 0 };
  }

  async findById(id: number): Promise<Supplier | null> {
    return this.findByIdSync(id);
  }

  findByIdSync(id: number): Supplier | null {
    const item = this.db.select().from(suppliers).where(eq(suppliers.id, id)).get();
    return (item as Supplier) || null;
  }

  async create(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> {
    const created = this.db
      .insert(suppliers)
      .values({
        ...supplier,
        currentBalance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get();
    return created as Supplier;
  }

  async update(id: number, supplier: Partial<Supplier>): Promise<Supplier> {
    const updated = this.db
      .update(suppliers)
      .set({ ...supplier, updatedAt: new Date().toISOString() })
      .where(eq(suppliers.id, id))
      .returning()
      .get();
    return updated as Supplier;
  }

  async delete(id: number): Promise<void> {
    this.db.delete(suppliers).where(eq(suppliers.id, id)).run();
  }

  async updatePayable(id: number, amountChange: number): Promise<void> {
    const supplier = await this.findById(id);
    if (supplier) {
      this.db
        .update(suppliers)
        .set({
          currentBalance: (supplier.currentBalance || 0) + amountChange,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(suppliers.id, id))
        .run();
    }
  }
}

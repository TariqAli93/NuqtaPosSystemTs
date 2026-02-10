import { eq } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { categories } from '../schema/schema.js';
import { ICategoryRepository, Category } from '@nuqtaplus/core';

export class SqliteCategoryRepository implements ICategoryRepository {
  constructor(private db: DbClient) {}

  async findAll(): Promise<Category[]> {
    const results = await this.db.select().from(categories);
    return results as Category[];
  }

  async findById(id: number): Promise<Category | null> {
    const [item] = await this.db.select().from(categories).where(eq(categories.id, id));
    return (item as Category) || null;
  }

  async create(category: Category): Promise<Category> {
    const [created] = await this.db
      .insert(categories)
      .values(category as any)
      .returning();
    return created as Category;
  }

  async update(id: number, category: Partial<Category>): Promise<Category> {
    const [updated] = await this.db
      .update(categories)
      .set(category as any)
      .where(eq(categories.id, id))
      .returning();
    return updated as Category;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(categories).where(eq(categories.id, id));
  }
}

import { eq } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { categories } from '../schema/schema.js';
import { ICategoryRepository, Category } from '@nuqtaplus/core';

export class SqliteCategoryRepository implements ICategoryRepository {
  constructor(private db: DbClient) {}

  findAll(): Category[] {
    const results = this.db.select().from(categories).all();
    return results as Category[];
  }

  findById(id: number): Category | null {
    const item = this.db.select().from(categories).where(eq(categories.id, id)).get();
    return (item as Category) || null;
  }

  create(category: Category): Category {
    const created = this.db
      .insert(categories)
      .values(category as any)
      .returning()
      .get();
    return created as Category;
  }

  update(id: number, category: Partial<Category>): Category {
    const updated = this.db
      .update(categories)
      .set(category as any)
      .where(eq(categories.id, id))
      .returning()
      .get();
    return updated as Category;
  }

  delete(id: number): void {
    this.db.delete(categories).where(eq(categories.id, id)).run();
  }
}

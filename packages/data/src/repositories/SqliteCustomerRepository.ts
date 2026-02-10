import { eq, like, count } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { customers } from '../schema/schema.js';
import { ICustomerRepository, Customer } from '@nuqtaplus/core';

export class SqliteCustomerRepository implements ICustomerRepository {
  constructor(private db: DbClient) {}

  async findAll(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: Customer[]; total: number }> {
    const query = this.db.select().from(customers);

    if (params?.search) {
      query.where(like(customers.name, `%${params.search}%`));
    }

    if (params?.limit) query.limit(params.limit);
    if (params?.offset) query.offset(params.offset);

    const items = (await query.all()) as Customer[];
    // simplify count for now
    const [totalResult] = await this.db.select({ count: count() }).from(customers);

    return { items, total: totalResult.count };
  }

  async findById(id: number): Promise<Customer | null> {
    const [item] = await this.db.select().from(customers).where(eq(customers.id, id));
    return (item as Customer) || null;
  }

  async create(customer: Customer): Promise<Customer> {
    const [created] = await this.db
      .insert(customers)
      .values(customer as any)
      .returning();
    return created as Customer;
  }

  async update(id: number, customer: Partial<Customer>): Promise<Customer> {
    const [updated] = await this.db
      .update(customers)
      .set(customer as any)
      .where(eq(customers.id, id))
      .returning();
    return updated as Customer;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(customers).where(eq(customers.id, id));
  }

  async updateDebt(id: number, amountChange: number): Promise<void> {
    const customer = await this.findById(id);
    if (customer) {
      await this.db
        .update(customers)
        .set({ totalDebt: (customer.totalDebt || 0) + amountChange })
        .where(eq(customers.id, id));
    }
  }
}

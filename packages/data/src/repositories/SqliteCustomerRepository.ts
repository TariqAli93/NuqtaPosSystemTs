import { eq, like, count } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { customers } from '../schema/schema.js';
import { ICustomerRepository, Customer } from '@nuqtaplus/core';

export class SqliteCustomerRepository implements ICustomerRepository {
  constructor(private db: DbClient) {}

  findAll(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): { items: Customer[]; total: number } {
    const query = this.db.select().from(customers);

    if (params?.search) {
      query.where(like(customers.name, `%${params.search}%`));
    }

    if (params?.limit) query.limit(params.limit);
    if (params?.offset) query.offset(params.offset);

    const items = query.all() as Customer[];
    // simplify count for now
    const totalResult = this.db.select({ count: count() }).from(customers).get();

    return { items, total: totalResult?.count || 0 };
  }

  findById(id: number): Customer | null {
    const item = this.db.select().from(customers).where(eq(customers.id, id)).get();
    return (item as Customer) || null;
  }

  create(customer: Customer): Customer {
    const created = this.db
      .insert(customers)
      .values(customer as any)
      .returning()
      .get();
    return created as Customer;
  }

  update(id: number, customer: Partial<Customer>): Customer {
    const updated = this.db
      .update(customers)
      .set(customer as any)
      .where(eq(customers.id, id))
      .returning()
      .get();
    return updated as Customer;
  }

  delete(id: number): void {
    this.db.delete(customers).where(eq(customers.id, id)).run();
  }

  updateDebt(id: number, amountChange: number): void {
    const customer = this.findById(id);
    if (customer) {
      this.db
        .update(customers)
        .set({ totalDebt: (customer.totalDebt || 0) + amountChange })
        .where(eq(customers.id, id))
        .run();
    }
  }
}

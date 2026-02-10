import { eq } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { payments } from '../schema/schema.js';
import { IPaymentRepository, Payment } from '@nuqtaplus/core';

export class SqlitePaymentRepository implements IPaymentRepository {
  constructor(private db: DbClient) {}

  async create(payment: Payment): Promise<Payment> {
    const [created] = await this.db
      .insert(payments)
      .values(payment as any)
      .returning();
    return created as Payment;
  }

  async findBySaleId(saleId: number): Promise<Payment[]> {
    const results = await this.db.select().from(payments).where(eq(payments.saleId, saleId));
    return results as Payment[];
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(payments).where(eq(payments.id, id));
  }
}

import { eq } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { payments } from '../schema/schema.js';
import { IPaymentRepository, Payment } from '@nuqtaplus/core';

export class SqlitePaymentRepository implements IPaymentRepository {
  constructor(private db: DbClient) {}

  create(payment: Payment): Payment {
    const created = this.db
      .insert(payments)
      .values(payment as any)
      .returning()
      .get();
    return created as Payment;
  }

  findBySaleId(saleId: number): Payment[] {
    const results = this.db.select().from(payments).where(eq(payments.saleId, saleId)).all();
    return results as Payment[];
  }

  delete(id: number): void {
    this.db.delete(payments).where(eq(payments.id, id)).run();
  }
}

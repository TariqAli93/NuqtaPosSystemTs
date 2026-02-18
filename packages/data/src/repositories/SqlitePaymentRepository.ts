import { eq } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { payments } from '../schema/schema.js';
import { IPaymentRepository, Payment } from '@nuqtaplus/core';

export class SqlitePaymentRepository implements IPaymentRepository {
  constructor(private db: DbClient) {}

  create(payment: Payment): Payment {
    return this.createSync(payment);
  }

  createSync(payment: Payment): Payment {
    const created = this.db
      .insert(payments)
      .values(payment as any)
      .returning()
      .get();
    return created as Payment;
  }

  findByIdempotencyKey(key: string): Payment | null {
    const row = this.db.select().from(payments).where(eq(payments.idempotencyKey, key)).get();
    return (row as Payment) || null;
  }

  findBySaleId(saleId: number): Payment[] {
    const results = this.db.select().from(payments).where(eq(payments.saleId, saleId)).all();
    return results as Payment[];
  }

  findByPurchaseId(purchaseId: number): Payment[] {
    const results = this.db.select().from(payments).where(eq(payments.purchaseId, purchaseId)).all();
    return results as Payment[];
  }

  findByCustomerId(customerId: number): Payment[] {
    const results = this.db.select().from(payments).where(eq(payments.customerId, customerId)).all();
    return results as Payment[];
  }

  findBySupplierId(supplierId: number): Payment[] {
    const results = this.db.select().from(payments).where(eq(payments.supplierId, supplierId)).all();
    return results as Payment[];
  }

  delete(id: number): void {
    this.db.delete(payments).where(eq(payments.id, id)).run();
  }
}

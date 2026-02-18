import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { customerLedger, customers } from '../schema/schema.js';
import { ICustomerLedgerRepository, CustomerLedgerEntry } from '@nuqtaplus/core';

export class SqliteCustomerLedgerRepository implements ICustomerLedgerRepository {
  constructor(private db: DbClient) {}

  async create(entry: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>): Promise<CustomerLedgerEntry> {
    return this.createSync(entry);
  }

  createSync(entry: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>): CustomerLedgerEntry {
    const created = this.db
      .insert(customerLedger)
      .values({
        customerId: entry.customerId,
        transactionType: entry.transactionType,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        saleId: entry.saleId,
        paymentId: entry.paymentId,
        journalEntryId: entry.journalEntryId,
        notes: entry.notes,
        createdAt: new Date().toISOString(),
        createdBy: entry.createdBy,
      } as any)
      .returning()
      .get();

    this.db
      .update(customers)
      .set({
        totalDebt: entry.balanceAfter,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(customers.id, entry.customerId))
      .run();

    return created as CustomerLedgerEntry;
  }

  getLastBalanceSync(customerId: number): number {
    const latest = this.db
      .select({ balanceAfter: customerLedger.balanceAfter })
      .from(customerLedger)
      .where(eq(customerLedger.customerId, customerId))
      .orderBy(desc(customerLedger.id))
      .limit(1)
      .get();

    if (latest) {
      return latest.balanceAfter || 0;
    }

    const customer = this.db.select().from(customers).where(eq(customers.id, customerId)).get();
    return customer?.totalDebt || 0;
  }

  findByPaymentIdSync(paymentId: number): CustomerLedgerEntry | null {
    const row = this.db
      .select()
      .from(customerLedger)
      .where(eq(customerLedger.paymentId, paymentId))
      .limit(1)
      .get();
    return (row as CustomerLedgerEntry) || null;
  }

  async findAll(params: {
    customerId: number;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: CustomerLedgerEntry[]; total: number }> {
    const conditions = [eq(customerLedger.customerId, params.customerId)];

    if (params.dateFrom) {
      conditions.push(gte(customerLedger.createdAt, params.dateFrom));
    }
    if (params.dateTo) {
      conditions.push(lte(customerLedger.createdAt, params.dateTo));
    }

    const query = this.db
      .select()
      .from(customerLedger)
      .where(and(...conditions))
      .orderBy(desc(customerLedger.createdAt));

    if (params.limit) query.limit(params.limit);
    if (params.offset) query.offset(params.offset);

    const items = query.all();

    const countResult = this.db
      .select({ count: sql<number>`count(*)` })
      .from(customerLedger)
      .where(and(...conditions))
      .get();

    return { items: items as unknown as CustomerLedgerEntry[], total: countResult?.count || 0 };
  }

  async getBalance(customerId: number): Promise<number> {
    return this.getLastBalanceSync(customerId);
  }
}

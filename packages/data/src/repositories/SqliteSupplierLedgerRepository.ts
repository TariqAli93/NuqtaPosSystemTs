import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { supplierLedger, suppliers } from '../schema/schema.js';
import { ISupplierLedgerRepository, SupplierLedgerEntry } from '@nuqtaplus/core';

export class SqliteSupplierLedgerRepository implements ISupplierLedgerRepository {
  constructor(private db: DbClient) {}

  async create(entry: Omit<SupplierLedgerEntry, 'id' | 'createdAt'>): Promise<SupplierLedgerEntry> {
    return this.createSync(entry);
  }

  createSync(entry: Omit<SupplierLedgerEntry, 'id' | 'createdAt'>): SupplierLedgerEntry {
    const created = this.db
      .insert(supplierLedger)
      .values({
        supplierId: entry.supplierId,
        transactionType: entry.transactionType,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        purchaseId: entry.purchaseId,
        paymentId: entry.paymentId,
        journalEntryId: entry.journalEntryId,
        notes: entry.notes,
        createdAt: new Date().toISOString(),
        createdBy: entry.createdBy,
      } as any)
      .returning()
      .get();

    this.db
      .update(suppliers)
      .set({
        currentBalance: entry.balanceAfter,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(suppliers.id, entry.supplierId))
      .run();

    return created as SupplierLedgerEntry;
  }

  getLastBalanceSync(supplierId: number): number {
    const latest = this.db
      .select({ balanceAfter: supplierLedger.balanceAfter })
      .from(supplierLedger)
      .where(eq(supplierLedger.supplierId, supplierId))
      .orderBy(desc(supplierLedger.id))
      .limit(1)
      .get();

    if (latest) {
      return latest.balanceAfter || 0;
    }

    const supplier = this.db.select().from(suppliers).where(eq(suppliers.id, supplierId)).get();
    return supplier?.currentBalance || 0;
  }

  findByPaymentIdSync(paymentId: number): SupplierLedgerEntry | null {
    const row = this.db
      .select()
      .from(supplierLedger)
      .where(eq(supplierLedger.paymentId, paymentId))
      .limit(1)
      .get();
    return (row as SupplierLedgerEntry) || null;
  }

  async findAll(params: {
    supplierId: number;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: SupplierLedgerEntry[]; total: number }> {
    const conditions = [eq(supplierLedger.supplierId, params.supplierId)];

    if (params.dateFrom) {
      conditions.push(gte(supplierLedger.createdAt, params.dateFrom));
    }
    if (params.dateTo) {
      conditions.push(lte(supplierLedger.createdAt, params.dateTo));
    }

    const query = this.db
      .select()
      .from(supplierLedger)
      .where(and(...conditions))
      .orderBy(desc(supplierLedger.createdAt));

    if (params.limit) query.limit(params.limit);
    if (params.offset) query.offset(params.offset);

    const items = query.all();

    const countResult = this.db
      .select({ count: sql<number>`count(*)` })
      .from(supplierLedger)
      .where(and(...conditions))
      .get();

    return { items: items as unknown as SupplierLedgerEntry[], total: countResult?.count || 0 };
  }

  async getBalance(supplierId: number): Promise<number> {
    return this.getLastBalanceSync(supplierId);
  }
}

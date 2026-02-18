import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { sales, saleItems } from '../schema/schema.js';
import { ISaleRepository, Sale } from '@nuqtaplus/core';

export class SqliteSaleRepository implements ISaleRepository {
  constructor(private db: DbClient) {}

  create(sale: Sale): Sale {
    const saleRow = this.db
      .insert(sales)
      .values({
        invoiceNumber: sale.invoiceNumber,
        customerId: sale.customerId,
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax: sale.tax,
        total: sale.total,
        currency: sale.currency,
        paymentType: sale.paymentType,
        paidAmount: sale.paidAmount,
        remainingAmount: sale.remainingAmount,
        status: sale.status,
        notes: sale.notes,
        interestRate: sale.interestRate,
        interestAmount: sale.interestAmount,
        createdBy: sale.createdBy,
        createdAt: sale.createdAt,
        idempotencyKey: sale.idempotencyKey || null,
      })
      .returning()
      .get();

    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        this.db
          .insert(saleItems)
          .values({
            saleId: saleRow.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitName: item.unitName || 'piece',
            unitFactor: item.unitFactor || 1,
            quantityBase: item.quantityBase || item.quantity,
            batchId: item.batchId,
            unitPrice: item.unitPrice,
            discount: item.discount,
            subtotal: item.subtotal,
            createdAt: sale.createdAt,
          })
          .run();
      }
    }

    return { ...sale, id: saleRow.id };
  }

  findByIdempotencyKey(key: string): Sale | null {
    const row = this.db.select().from(sales).where(eq(sales.idempotencyKey, key)).get();
    if (!row) return null;

    const items = this.db.select().from(saleItems).where(eq(saleItems.saleId, row.id)).all();
    return { ...row, items: items as any } as Sale;
  }

  update(id: number, data: Partial<Sale>): void {
    this.db
      .update(sales)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sales.id, id))
      .run();
  }

  findById(id: number): Sale | null {
    const sale = this.db.select().from(sales).where(eq(sales.id, id)).get();
    if (!sale) return null;

    const items = this.db.select().from(saleItems).where(eq(saleItems.saleId, id)).all();
    return { ...sale, items: items as any } as Sale;
  }

  findAll(params?: { page: number; limit: number; startDate?: string; endDate?: string }): {
    items: Sale[];
    total: number;
  } {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params?.startDate) conditions.push(gte(sales.createdAt, params.startDate));
    if (params?.endDate) conditions.push(lte(sales.createdAt, params.endDate));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const items = this.db
      .select()
      .from(sales)
      .where(whereClause)
      .orderBy(desc(sales.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    const totalRow = this.db.select({ count: count() }).from(sales).where(whereClause).get();

    return { items: items as Sale[], total: totalRow?.count || 0 };
  }

  updateStatus(id: number, status: 'completed' | 'cancelled'): void {
    this.db.update(sales).set({ status }).where(eq(sales.id, id)).run();
  }

  getDailySummary(date: Date): {
    revenue: number;
    count: number;
    cash: number;
    card: number;
    transfer: number;
  } {
    const startOfDay = new Date(date).toISOString().split('T')[0] + 'T00:00:00.000Z';
    const endOfDay = new Date(date).toISOString().split('T')[0] + 'T23:59:59.999Z';

    const stats = this.db
      .select({
        revenue: sql<number>`sum(${sales.total})`,
        count: count(),
        cash: sql<number>`sum(CASE WHEN ${sales.paymentType} = 'cash' THEN ${sales.total} ELSE 0 END)`,
        card: sql<number>`sum(CASE WHEN ${sales.paymentType} = 'card' THEN ${sales.total} ELSE 0 END)`,
        transfer: sql<number>`sum(CASE WHEN ${sales.paymentType} = 'bank_transfer' THEN ${sales.total} ELSE 0 END)`,
      })
      .from(sales)
      .where(
        and(
          gte(sales.createdAt, startOfDay),
          lte(sales.createdAt, endOfDay),
          eq(sales.status, 'completed')
        )
      )
      .get();

    return {
      revenue: stats?.revenue || 0,
      count: stats?.count || 0,
      cash: stats?.cash || 0,
      card: stats?.card || 0,
      transfer: stats?.transfer || 0,
    };
  }

  getTopSelling(limit: number): {
    productId: number;
    productName: string;
    quantity: number;
    revenue: number;
  }[] {
    const result = this.db
      .select({
        productId: saleItems.productId,
        productName: saleItems.productName,
        quantity: sql<number>`sum(${saleItems.quantity})`,
        revenue: sql<number>`sum(${saleItems.subtotal})`,
      })
      .from(saleItems)
      .groupBy(saleItems.productId, saleItems.productName)
      .orderBy(desc(sql`sum(${saleItems.subtotal})`))
      .limit(limit)
      .all();

    return result.map((item) => ({
      productId: item.productId || 0,
      productName: item.productName,
      quantity: Number(item.quantity),
      revenue: Number(item.revenue),
    }));
  }

  generateReceipt(saleId: number): string {
    const sale = this.findById(saleId);
    const itemsHtml = sale?.items
      ?.map(
        (item) =>
          `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>${item.unitPrice.toFixed(2)}</td><td>${item.subtotal.toFixed(2)}</td></tr>`
      )
      .join('');

    return `<html>
      <body>
        <h1>Receipt #${sale?.invoiceNumber}</h1>
        <p>Date: ${sale?.createdAt}</p>
        <table>
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <p>Subtotal: ${sale?.subtotal.toFixed(2)}</p>
        <p>Discount: ${sale?.discount.toFixed(2)}</p>
        <p>Tax: ${sale?.tax.toFixed(2)}</p>
        <h2>Total: ${sale?.total.toFixed(2)} ${sale?.currency}</h2>
      </body>
    </html>`;
  }
}

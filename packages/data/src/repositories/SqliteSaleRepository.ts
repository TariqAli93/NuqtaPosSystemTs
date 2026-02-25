import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { sales, saleItems, saleItemDepletions, productBatches } from '../schema/schema.js';
import { ISaleRepository, Sale, SaleItemDepletion } from '@nuqtaplus/core';

type SaleDepletionRow = {
  id: number;
  saleId: number;
  saleItemId: number;
  productId: number;
  batchId: number;
  quantityBase: number;
  costPerUnit: number;
  totalCost: number;
  createdAt: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
};

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

    const insertedItems: any[] = [];
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        const inserted = this.db
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
          .returning()
          .get();
        insertedItems.push(inserted);
      }
    }

    return {
      ...sale,
      id: saleRow.id,
      items: insertedItems as any,
    };
  }

  private loadSaleItemDepletions(saleId: number): SaleDepletionRow[] {
    return this.db
      .select({
        id: saleItemDepletions.id,
        saleId: saleItemDepletions.saleId,
        saleItemId: saleItemDepletions.saleItemId,
        productId: saleItemDepletions.productId,
        batchId: saleItemDepletions.batchId,
        quantityBase: saleItemDepletions.quantityBase,
        costPerUnit: saleItemDepletions.costPerUnit,
        totalCost: saleItemDepletions.totalCost,
        createdAt: saleItemDepletions.createdAt,
        batchNumber: productBatches.batchNumber,
        expiryDate: productBatches.expiryDate,
      })
      .from(saleItemDepletions)
      .leftJoin(productBatches, eq(productBatches.id, saleItemDepletions.batchId))
      .where(eq(saleItemDepletions.saleId, saleId))
      .all();
  }

  private mapSaleWithDetails(saleRow: typeof sales.$inferSelect): Sale {
    const items = this.db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleRow.id))
      .orderBy(saleItems.id)
      .all();

    const depletions = this.loadSaleItemDepletions(saleRow.id);
    const depletionsBySaleItem = new Map<number, SaleDepletionRow[]>();
    for (const depletion of depletions) {
      const list = depletionsBySaleItem.get(depletion.saleItemId) || [];
      list.push(depletion);
      depletionsBySaleItem.set(depletion.saleItemId, list);
    }

    const itemsWithDetails = items.map((item) => {
      const itemDepletions = depletionsBySaleItem.get(item.id) || [];
      const itemCogs = itemDepletions.reduce((sum, dep) => sum + (dep.totalCost || 0), 0);
      const depletedQty = itemDepletions.reduce((sum, dep) => sum + (dep.quantityBase || 0), 0);
      const weightedAverageCost = depletedQty > 0 ? Math.trunc(itemCogs / depletedQty) : 0;

      return {
        ...item,
        cogs: itemCogs,
        weightedAverageCost,
        depletions: itemDepletions.map((dep) => ({
          id: dep.id,
          saleId: dep.saleId,
          saleItemId: dep.saleItemId,
          productId: dep.productId,
          batchId: dep.batchId,
          batchNumber: dep.batchNumber || undefined,
          expiryDate: dep.expiryDate,
          quantityBase: dep.quantityBase,
          quantity: dep.quantityBase,
          costPerUnit: dep.costPerUnit,
          totalCost: dep.totalCost,
          createdAt: dep.createdAt || undefined,
        })),
      };
    });

    const totalCogs = depletions.reduce((sum, dep) => sum + (dep.totalCost || 0), 0);
    const profit = (saleRow.total || 0) - totalCogs;
    const marginBps = saleRow.total > 0 ? Math.trunc((profit * 10_000) / saleRow.total) : 0;

    return {
      ...saleRow,
      items: itemsWithDetails as any,
      cogs: totalCogs,
      totalCogs,
      profit,
      marginBps,
    } as Sale;
  }

  findByIdempotencyKey(key: string): Sale | null {
    const row = this.db.select().from(sales).where(eq(sales.idempotencyKey, key)).get();
    if (!row) return null;

    return this.mapSaleWithDetails(row);
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

    return this.mapSaleWithDetails(sale);
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

  createItemDepletions(
    depletions: Omit<SaleItemDepletion, 'id' | 'createdAt' | 'batchNumber' | 'expiryDate'>[]
  ): void {
    if (depletions.length === 0) return;

    this.db
      .insert(saleItemDepletions)
      .values(
        depletions.map((depletion) => ({
          saleId: depletion.saleId,
          saleItemId: depletion.saleItemId,
          productId: depletion.productId,
          batchId: depletion.batchId,
          quantityBase: depletion.quantityBase,
          costPerUnit: depletion.costPerUnit,
          totalCost: depletion.totalCost,
        }))
      )
      .run();
  }

  getItemDepletionsBySaleId(saleId: number): SaleItemDepletion[] {
    return this.loadSaleItemDepletions(saleId).map((row) => ({
      id: row.id,
      saleId: row.saleId,
      saleItemId: row.saleItemId,
      productId: row.productId,
      batchId: row.batchId,
      batchNumber: row.batchNumber || undefined,
      expiryDate: row.expiryDate,
      quantityBase: row.quantityBase,
      costPerUnit: row.costPerUnit,
      totalCost: row.totalCost,
      createdAt: row.createdAt || undefined,
    }));
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
    const formatAmount = (value: number | undefined) =>
      typeof value === 'number' && Number.isInteger(value) ? value.toLocaleString('en-US') : '0';
    const itemsHtml = sale?.items
      ?.map(
        (item) =>
          `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>${formatAmount(item.unitPrice)}</td><td>${formatAmount(item.subtotal)}</td></tr>`
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
        <p>Subtotal: ${formatAmount(sale?.subtotal)}</p>
        <p>Discount: ${formatAmount(sale?.discount)}</p>
        <p>Tax: ${formatAmount(sale?.tax)}</p>
        <h2>Total: ${formatAmount(sale?.total)} ${sale?.currency}</h2>
      </body>
    </html>`;
  }
}

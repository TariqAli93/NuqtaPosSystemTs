import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { sales, saleItems, installments } from '../schema/schema.js';
import { ISaleRepository, Sale } from '@nuqtaplus/core';

export class SqliteSaleRepository implements ISaleRepository {
  constructor(private db: DbClient) {}

  async create(sale: Sale): Promise<Sale> {
    const result = await this.db.transaction(async (tx: DbClient) => {
      // 1. Insert Sale
      const [insertedSale] = await tx
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
        })
        .returning();

      // 2. Insert Items
      if (sale.items && sale.items.length > 0) {
        for (const item of sale.items) {
          await tx.insert(saleItems).values({
            saleId: insertedSale.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            subtotal: item.subtotal,
            createdAt: sale.createdAt,
          });
        }
      }

      // Create installments if they exist
      if (sale.installments && sale.installments.length > 0) {
        await tx.insert(installments).values(
          sale.installments.map((inst) => ({
            saleId: insertedSale.id,
            customerId: sale.customerId,
            installmentNumber: inst.installmentNumber,
            dueAmount: inst.dueAmount,
            paidAmount: inst.paidAmount,
            remainingAmount: inst.remainingAmount,
            currency: inst.currency,
            dueDate: inst.dueDate,
            status: inst.status,
            notes: inst.notes,
          }))
        );
      }

      return insertedSale;
    });

    // Return full object with items usually, but for now generic return
    // In a real app we might fetch it fresh, but let's return the input with ID attached
    return { ...sale, id: result.id };
  }

  async update(id: number, data: Partial<Sale>): Promise<void> {
    await this.db
      .update(sales)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sales.id, id));
  }

  async findById(id: number): Promise<Sale | null> {
    const [sale] = await this.db.select().from(sales).where(eq(sales.id, id));
    if (!sale) return null;

    const items = await this.db.select().from(saleItems).where(eq(saleItems.saleId, id));

    // cast to match Entity structure
    return { ...sale, items: items as any } as Sale;
  }

  async findAll(params?: {
    page: number;
    limit: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ items: Sale[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params?.startDate) conditions.push(gte(sales.createdAt, params.startDate));
    if (params?.endDate) conditions.push(lte(sales.createdAt, params.endDate));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const result = await this.db
      .select()
      .from(sales)
      .where(whereClause)
      .orderBy(desc(sales.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db.select({ count: count() }).from(sales).where(whereClause);

    return { items: result as Sale[], total: countResult.count };
  }

  async updateStatus(id: number, status: 'completed' | 'cancelled'): Promise<void> {
    await this.db.update(sales).set({ status }).where(eq(sales.id, id));
  }

  async getDailySummary(date: Date): Promise<{
    revenue: number;
    count: number;
    cash: number;
    card: number;
    transfer: number;
  }> {
    const startOfDay = new Date(date).toISOString().split('T')[0] + 'T00:00:00.000Z';
    const endOfDay = new Date(date).toISOString().split('T')[0] + 'T23:59:59.999Z';

    const result = await this.db
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
      );

    const stats = result[0];
    return {
      revenue: stats?.revenue || 0,
      count: stats?.count || 0,
      cash: stats?.cash || 0,
      card: stats?.card || 0,
      transfer: stats?.transfer || 0,
    };
  }

  async getTopSelling(limit: number): Promise<
    {
      productId: number;
      productName: string;
      quantity: number;
      revenue: number;
    }[]
  > {
    const result = await this.db
      .select({
        productId: saleItems.productId,
        productName: saleItems.productName,
        quantity: sql<number>`sum(${saleItems.quantity})`,
        revenue: sql<number>`sum(${saleItems.subtotal})`,
      })
      .from(saleItems)
      .groupBy(saleItems.productId, saleItems.productName)
      .orderBy(desc(sql`sum(${saleItems.subtotal})`))
      .limit(limit);

    return result.map(
      (item: {
        productId: number | null;
        productName: string;
        quantity: number;
        revenue: number;
      }) => ({
        productId: item.productId || 0,
        productName: item.productName,
        quantity: Number(item.quantity),
        revenue: Number(item.revenue),
      })
    );
  }
}

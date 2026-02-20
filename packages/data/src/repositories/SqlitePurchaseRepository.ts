import { eq, like, desc, sql, and, gte, lte } from 'drizzle-orm';
import { DbClient } from '../db.js';
import {
  purchases,
  purchaseItems,
  suppliers,
  payments,
  inventoryMovements,
  products,
  productBatches,
} from '../schema/schema.js';
import { IPurchaseRepository, Purchase } from '@nuqtaplus/core';

export class SqlitePurchaseRepository implements IPurchaseRepository {
  constructor(private db: DbClient) {}

  async create(purchase: Purchase): Promise<Purchase> {
    return this.createSync(purchase);
  }

  createSync(purchase: Purchase): Purchase {
    const now = new Date().toISOString();

    const header = this.db
      .insert(purchases)
      .values({
        invoiceNumber: purchase.invoiceNumber,
        supplierId: purchase.supplierId,
        subtotal: purchase.subtotal,
        discount: purchase.discount,
        tax: purchase.tax,
        total: purchase.total,
        paidAmount: purchase.paidAmount,
        remainingAmount: purchase.remainingAmount,
        currency: purchase.currency,
        exchangeRate: purchase.exchangeRate,
        status: purchase.status,
        notes: purchase.notes,
        receivedAt: purchase.receivedAt,
        idempotencyKey: purchase.idempotencyKey || null,
        createdAt: purchase.createdAt || now,
        updatedAt: purchase.updatedAt || now,
        createdBy: purchase.createdBy,
      } as any)
      .returning()
      .get();

    const insertedItems = (purchase.items || []).map((item) => {
      const currentProduct = this.db
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .get();

      if (!currentProduct) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const stockBefore = currentProduct.stock || 0;
      const quantityBase = item.quantityBase || item.quantity;
      const stockAfter = stockBefore + quantityBase;

      let batchId = item.batchId;
      if (!batchId && (item.batchNumber || item.expiryDate)) {
        const batchNumber = item.batchNumber || `BATCH-${header.id}-${item.productId}-${Date.now()}`;
        const existingBatch = this.db
          .select()
          .from(productBatches)
          .where(and(eq(productBatches.productId, item.productId), eq(productBatches.batchNumber, batchNumber)))
          .get();

        if (existingBatch) {
          this.db
            .update(productBatches)
            .set({
              quantityOnHand: (existingBatch.quantityOnHand || 0) + quantityBase,
              quantityReceived: (existingBatch.quantityReceived || 0) + quantityBase,
              expiryDate: item.expiryDate || existingBatch.expiryDate,
              costPerUnit: item.unitCost,
            })
            .where(eq(productBatches.id, existingBatch.id))
            .run();
          batchId = existingBatch.id;
        } else {
          const insertedBatch = this.db
            .insert(productBatches)
            .values({
              productId: item.productId,
              batchNumber,
              expiryDate: item.expiryDate,
              quantityReceived: quantityBase,
              quantityOnHand: quantityBase,
              costPerUnit: item.unitCost,
              purchaseId: header.id,
              status: 'active',
              createdAt: now,
            })
            .returning()
            .get();
          batchId = insertedBatch.id;
        }
      } else if (batchId) {
        const existingBatch = this.db
          .select()
          .from(productBatches)
          .where(eq(productBatches.id, batchId))
          .get();
        if (existingBatch) {
          this.db
            .update(productBatches)
            .set({
              quantityOnHand: (existingBatch.quantityOnHand || 0) + quantityBase,
              quantityReceived: (existingBatch.quantityReceived || 0) + quantityBase,
              expiryDate: item.expiryDate || existingBatch.expiryDate,
              costPerUnit: item.unitCost,
            })
            .where(eq(productBatches.id, existingBatch.id))
            .run();
        }
      }

      const row = this.db
        .insert(purchaseItems)
        .values({
          purchaseId: header.id,
          productId: item.productId,
          productName: item.productName || currentProduct.name,
          unitName: item.unitName || 'piece',
          unitFactor: item.unitFactor || 1,
          quantity: item.quantity,
          quantityBase,
          unitCost: item.unitCost,
          lineSubtotal: item.lineSubtotal,
          discount: item.discount || 0,
          batchId,
          expiryDate: item.expiryDate,
          createdAt: now,
        } as any)
        .returning()
        .get();

      this.db
        .update(products)
        .set({
          stock: stockAfter,
          updatedAt: now,
        })
        .where(eq(products.id, item.productId))
        .run();

      this.db
        .insert(inventoryMovements)
        .values({
          productId: item.productId,
          batchId,
          movementType: 'in',
          reason: 'purchase',
          quantityBase,
          unitName: item.unitName || 'piece',
          unitFactor: item.unitFactor || 1,
          stockBefore,
          stockAfter,
          costPerUnit: item.unitCost,
          totalCost: quantityBase * item.unitCost,
          sourceType: 'purchase',
          sourceId: header.id,
          notes: `Purchase #${header.invoiceNumber}`,
          createdAt: now,
          createdBy: purchase.createdBy,
        } as any)
        .run();

      return row;
    });

    return {
      ...(header as Purchase),
      items: insertedItems as any,
    };
  }

  findByIdempotencyKey(key: string): Purchase | null {
    const row = this.db.select().from(purchases).where(eq(purchases.idempotencyKey, key)).get();
    if (!row) return null;

    const items = this.db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, row.id))
      .all();

    return {
      ...(row as Purchase),
      items: items as any,
    };
  }

  async findAll(params?: {
    search?: string;
    supplierId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: Purchase[]; total: number }> {
    const conditions: any[] = [];
    if (params?.search) conditions.push(like(purchases.invoiceNumber, `%${params.search}%`));
    if (params?.supplierId) conditions.push(eq(purchases.supplierId, params.supplierId));
    if (params?.status) conditions.push(eq(purchases.status, params.status));
    if (params?.dateFrom) conditions.push(gte(purchases.createdAt, params.dateFrom));
    if (params?.dateTo) conditions.push(lte(purchases.createdAt, params.dateTo));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = this.db
      .select({
        purchase: purchases,
        supplierName: suppliers.name,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(suppliers.id, purchases.supplierId))
      .where(whereClause)
      .orderBy(desc(purchases.createdAt));

    if (params?.limit) query.limit(params.limit);
    if (params?.offset) query.offset(params.offset);

    const rows = query.all();

    const items = rows.map((row) => ({
      ...(row.purchase as Purchase),
      supplierName: row.supplierName || undefined,
    })) as Purchase[];

    const countResult = this.db
      .select({ count: sql<number>`count(*)` })
      .from(purchases)
      .where(whereClause)
      .get();

    return { items, total: countResult?.count || 0 };
  }

  async findById(id: number): Promise<Purchase | null> {
    return this.findByIdSync(id);
  }

  findByIdSync(id: number): Purchase | null {
    const item = this.db.select().from(purchases).where(eq(purchases.id, id)).get();
    if (!item) return null;

    const items = this.db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, id))
      .all();

    const paymentRows = this.db.select().from(payments).where(eq(payments.purchaseId, id)).all();

    const movementRows = this.db
      .select()
      .from(inventoryMovements)
      .where(and(eq(inventoryMovements.sourceType, 'purchase'), eq(inventoryMovements.sourceId, id)))
      .orderBy(desc(inventoryMovements.createdAt))
      .all();

    return {
      ...(item as Purchase),
      items: items as any,
      payments: paymentRows as any,
      movements: movementRows as any,
    };
  }

  async updateStatus(id: number, status: string): Promise<void> {
    this.updateStatusSync(id, status);
  }

  updateStatusSync(id: number, status: string): void {
    this.db
      .update(purchases)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(purchases.id, id))
      .run();
  }

  async updatePayment(id: number, paidAmount: number, remainingAmount: number): Promise<void> {
    this.updatePaymentSync(id, paidAmount, remainingAmount);
  }

  updatePaymentSync(id: number, paidAmount: number, remainingAmount: number): void {
    this.db
      .update(purchases)
      .set({
        paidAmount,
        remainingAmount,
        status: remainingAmount <= 0 ? 'completed' : 'pending',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(purchases.id, id))
      .run();
  }
}

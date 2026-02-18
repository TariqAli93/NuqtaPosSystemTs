import { eq, desc, sql, and, lte, gt, gte } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { inventoryMovements, products, productBatches } from '../schema/schema.js';
import { IInventoryRepository, InventoryMovement } from '@nuqtaplus/core';

export class SqliteInventoryRepository implements IInventoryRepository {
  constructor(private db: DbClient) {}

  async createMovement(
    movement: Omit<InventoryMovement, 'id' | 'createdAt'>
  ): Promise<InventoryMovement> {
    return this.createMovementSync(movement);
  }

  createMovementSync(movement: Omit<InventoryMovement, 'id' | 'createdAt'>): InventoryMovement {
    const created = this.db
      .insert(inventoryMovements)
      .values({ ...movement, createdAt: new Date().toISOString() })
      .returning()
      .get();
    return created as InventoryMovement;
  }

  async getMovements(params?: {
    productId?: number;
    movementType?: string;
    sourceType?: string;
    sourceId?: number;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: InventoryMovement[]; total: number }> {
    const conditions: any[] = [];
    if (params?.productId) conditions.push(eq(inventoryMovements.productId, params.productId));
    if (params?.movementType) conditions.push(eq(inventoryMovements.movementType, params.movementType));
    if (params?.sourceType) conditions.push(eq(inventoryMovements.sourceType, params.sourceType));
    if (params?.sourceId) conditions.push(eq(inventoryMovements.sourceId, params.sourceId));
    if (params?.dateFrom) conditions.push(gte(inventoryMovements.createdAt, params.dateFrom));
    if (params?.dateTo) conditions.push(lte(inventoryMovements.createdAt, params.dateTo));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = this.db
      .select()
      .from(inventoryMovements)
      .where(whereClause)
      .orderBy(desc(inventoryMovements.createdAt));

    if (params?.limit) {
      query.limit(params.limit);
    }
    if (params?.offset) {
      query.offset(params.offset);
    }

    const items = query.all() as InventoryMovement[];

    const totalResult = this.db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryMovements)
      .where(whereClause)
      .get();

    return { items, total: totalResult?.count || 0 };
  }

  async getDashboardStats(): Promise<{
    totalValuation: number;
    lowStockCount: number;
    expiryAlertCount: number;
    topMovingProducts: any[];
  }> {
    // 1. Total Valuation (sum of stock * costPrice)
    const valuation = this.db
      .select({ total: sql<number>`sum(${products.stock} * ${products.costPrice})` })
      .from(products)
      .where(gt(products.stock, 0))
      .get();

    // 2. Low Stock Count
    const lowStock = this.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(lte(products.stock, products.minStock), eq(products.isActive, true)))
      .get();

    // 3. Expiry Alert Count (batches expiring in next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const dateStr = thirtyDaysFromNow.toISOString().split('T')[0];

    const expiry = this.db
      .select({ count: sql<number>`count(*)` })
      .from(productBatches)
      .where(and(gt(productBatches.quantityOnHand, 0), lte(productBatches.expiryDate, dateStr)))
      .get();

    // 4. Top Moving (simplified: most movements count in last 30 days)
    const topMoving = this.db
      .select({
        productId: inventoryMovements.productId,
        totalMoved: sql<number>`count(*)`,
      })
      .from(inventoryMovements)
      .groupBy(inventoryMovements.productId)
      .orderBy(desc(sql`count(*)`))
      .limit(5)
      .all();

    // Enrich top moving with product names
    const enrichedTopMoving = topMoving.map((tm) => {
      const p = this.db
        .select({ name: products.name })
        .from(products)
        .where(eq(products.id, tm.productId))
        .get();
      return { ...tm, productName: p?.name };
    });

    return {
      totalValuation: valuation?.total || 0,
      lowStockCount: lowStock?.count || 0,
      expiryAlertCount: expiry?.count || 0,
      topMovingProducts: enrichedTopMoving,
    };
  }

  async getExpiryAlerts(): Promise<any[]> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const dateStr = thirtyDaysFromNow.toISOString().split('T')[0];

    const alerts = this.db
      .select({
        productId: productBatches.productId,
        batchNumber: productBatches.batchNumber,
        expiryDate: productBatches.expiryDate,
        quantityOnHand: productBatches.quantityOnHand,
        productName: sql<string>`(select name from products where id = ${productBatches.productId})`,
      })
      .from(productBatches)
      .where(and(gt(productBatches.quantityOnHand, 0), lte(productBatches.expiryDate, dateStr)))
      .all();

    return alerts.map((a) => ({
      ...a,
      daysUntilExpiry: Math.ceil(
        (new Date(a.expiryDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    }));
  }
}

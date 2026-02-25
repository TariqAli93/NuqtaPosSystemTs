// ═══════════════════════════════════════════════════════════════
// SQLite FIFO Depletion Service
// Implements batch-level FIFO/FEFO stock depletion for SQLite.
// MUST be called inside a withTransaction() block.
// ═══════════════════════════════════════════════════════════════

import { sql, eq, and, gt } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { productBatches } from '../schema/schema.js';
import { InsufficientStockError } from '@nuqtaplus/core';
import type { IFifoDepletionService, FifoDepletionResult, BatchDepletion } from '@nuqtaplus/core';

export class SqliteFifoService implements IFifoDepletionService {
  constructor(private db: DbClient) {}

  /**
   * Deplete stock from oldest/soonest-expiring batches first (FIFO/FEFO).
   *
   * Ordering:
   *   1. Non-null expiry_date first (CASE WHEN ... THEN 0 ELSE 1)
   *   2. expiry_date ASC (earliest expiry consumed first)
   *   3. id ASC (tie-breaker: first received batch)
   *
   * This ensures deterministic ordering regardless of when the query runs.
   */
  deplete(productId: number, quantityNeeded: number): FifoDepletionResult {
    if (quantityNeeded <= 0) {
      return { depletions: [], totalCost: 0, weightedAverageCost: 0 };
    }

    // Fetch active batches in FIFO/FEFO order
    const batches = this.db
      .select()
      .from(productBatches)
      .where(
        and(
          eq(productBatches.productId, productId),
          gt(productBatches.quantityOnHand, 0),
          eq(productBatches.status, 'active')
        )
      )
      .orderBy(
        sql`CASE WHEN ${productBatches.expiryDate} IS NULL THEN 1 ELSE 0 END`,
        sql`${productBatches.expiryDate} ASC`,
        sql`${productBatches.id} ASC`
      )
      .all();

    let remaining = quantityNeeded;
    const depletions: BatchDepletion[] = [];
    let totalCost = 0;

    for (const batch of batches) {
      if (remaining <= 0) break;

      const take = Math.min(batch.quantityOnHand, remaining);
      const costPerUnit = batch.costPerUnit || 0;
      const batchCost = take * costPerUnit;

      const newQty = batch.quantityOnHand - take;

      // Atomically update batch quantity and status
      this.db
        .update(productBatches)
        .set({
          quantityOnHand: newQty,
          status: newQty <= 0 ? 'exhausted' : 'active',
        })
        .where(eq(productBatches.id, batch.id))
        .run();

      depletions.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: take,
        costPerUnit,
        totalCost: batchCost,
      });

      totalCost += batchCost;
      remaining -= take;
    }

    if (remaining > 0) {
      throw new InsufficientStockError(
        `Insufficient batch stock for product ${productId}. Requested ${quantityNeeded}, available ${quantityNeeded - remaining}.`,
        {
          productId,
          requested: quantityNeeded,
          available: quantityNeeded - remaining,
        }
      );
    }

    return {
      depletions,
      totalCost,
      weightedAverageCost: quantityNeeded > 0 ? totalCost / quantityNeeded : 0,
    };
  }

  /**
   * Get total available batch stock for a product.
   * Returns the sum of quantity_on_hand across all active batches.
   */
  getAvailableStock(productId: number): number {
    const result = this.db
      .select({
        total: sql<number>`COALESCE(SUM(${productBatches.quantityOnHand}), 0)`,
      })
      .from(productBatches)
      .where(
        and(
          eq(productBatches.productId, productId),
          gt(productBatches.quantityOnHand, 0),
          eq(productBatches.status, 'active')
        )
      )
      .get();

    return result?.total || 0;
  }
}

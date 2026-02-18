import type { ApiResult, PagedResult } from './contracts';
import type { InventoryMovement } from '@nuqtaplus/core';
import { invoke, invokePaged } from './invoke';
import { buildDataPayload, buildParamsPayload } from './payloads';

export interface InventoryDashboard {
  totalValuation: number;
  lowStockCount: number;
  expiryAlertCount: number;
  topMovingProducts: { productId: number; productName: string; totalMoved: number }[];
}

export interface ExpiryAlert {
  productId: number;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  quantityOnHand: number;
  daysUntilExpiry: number;
}

export interface StockDriftItem {
  productId: number;
  productName: string;
  cachedStock: number;
  ledgerStock: number;
  drift: number;
}

export interface StockReconciliationResult {
  driftItems: StockDriftItem[];
  totalProducts: number;
  totalDrift: number;
  repairedCount: number;
}

export interface StockAdjustmentInput {
  productId: number;
  reason: 'manual' | 'damage' | 'opening';
  quantityBase: number;
  unitName?: string;
  unitFactor?: number;
  notes?: string;
  batchId?: number;
  idempotencyKey?: string;
}

export const inventoryClient = {
  getDashboard: (): Promise<ApiResult<InventoryDashboard>> =>
    invoke<InventoryDashboard>('inventory:getDashboardStats', {}),
  getMovements: (params?: {
    productId?: number;
    movementType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResult<PagedResult<InventoryMovement>>> =>
    invokePaged<InventoryMovement>(
      'inventory:getMovements',
      buildParamsPayload('inventory:getMovements', params)
    ),
  getExpiryAlerts: (daysAhead?: number): Promise<ApiResult<ExpiryAlert[]>> =>
    invoke<ExpiryAlert[]>('inventory:getExpiryAlerts', { params: { daysAhead: daysAhead ?? 30 } }),
  reconcileStock: (repair = false): Promise<ApiResult<StockReconciliationResult>> =>
    invoke<StockReconciliationResult>(
      'inventory:reconcileStock',
      buildParamsPayload('inventory:reconcileStock', { repair })
    ),
  adjustStock: (data: StockAdjustmentInput): Promise<ApiResult<InventoryMovement>> =>
    invoke<InventoryMovement>('products:adjustStock', {
      data: {
        productId: data.productId,
        quantityChange: data.quantityBase,
        reason: data.reason,
        notes: data.notes,
        unitName: data.unitName,
        unitFactor: data.unitFactor,
        batchId: data.batchId,
        idempotencyKey: data.idempotencyKey,
      },
    }),
};

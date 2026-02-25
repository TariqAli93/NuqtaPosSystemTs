import type {
  Product,
  ProductBatch,
  ProductUnit,
  InventoryMovement,
  BarcodePrintJob,
  BarcodeTemplate,
} from '@nuqtaplus/core';

export interface ProductWorkspaceFilters {
  search?: string;
  categoryId?: number;
  supplierId?: number;
  lowStockOnly?: boolean;
  expiringSoonOnly?: boolean;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ProductMovementFilters {
  productId: number;
  movementType?: string;
  sourceType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface ProductPurchaseHistoryItem {
  purchaseId: number;
  invoiceNumber: string;
  supplierId: number;
  supplierName?: string | null;
  status?: string | null;
  createdAt?: string | null;
  total?: number | null;
  quantity: number;
  quantityBase: number;
  unitName?: string | null;
  unitFactor?: number | null;
  unitCost: number;
  lineSubtotal: number;
  batchId?: number | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
}

export interface ProductSalesHistoryItem {
  saleId: number;
  invoiceNumber: string;
  customerId?: number | null;
  customerName?: string | null;
  status?: string | null;
  createdAt?: string | null;
  total?: number | null;
  quantity: number;
  quantityBase: number;
  unitName?: string | null;
  unitFactor?: number | null;
  unitPrice: number;
  subtotal: number;
  batchId?: number | null;
}

export type ProductUnitInput = Pick<
  ProductUnit,
  'productId' | 'unitName' | 'factorToBase' | 'barcode' | 'sellingPrice' | 'isDefault' | 'isActive'
>;

export type ProductBatchInput = Pick<
  ProductBatch,
  | 'productId'
  | 'batchNumber'
  | 'expiryDate'
  | 'manufacturingDate'
  | 'quantityReceived'
  | 'quantityOnHand'
  | 'costPerUnit'
  | 'status'
  | 'notes'
>;
